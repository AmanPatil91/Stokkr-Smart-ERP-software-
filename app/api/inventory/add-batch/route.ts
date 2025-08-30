import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, batchNo, cost, supplierId, quantity, expiry } = body;

    const expiryDate = new Date(expiry);

    const parsedQuantity = parseFloat(quantity);
    const parsedCost = parseFloat(cost);

    await prisma.$transaction(async (tx) => {
      const newBatch = await tx.batch.create({
        data: {
          batchNumber: batchNo,
          expiryDate: expiryDate,
          quantity: parsedQuantity,
          costPerItem: parsedCost,
          productId: productId,
        },
      });

      await tx.stockTransaction.create({
        data: {
          productId: productId,
          batchId: newBatch.id,
          transactionType: 'IN',
          quantity: parsedQuantity,
          notes: `Added new batch ${batchNo} from supplier ${supplierId}`,
        },
      });

      await tx.ledgerTransaction.create({
        data: {
          partyId: supplierId,
          transactionType: 'CREDIT',
          amount: parsedCost * parsedQuantity,
          description: `Purchase from supplier for batch ${batchNo}`,
        },
      });
    });

    return NextResponse.json({ message: 'Batch added successfully' }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to add batch.' }, { status: 500 });
  }
}