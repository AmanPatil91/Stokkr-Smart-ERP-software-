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
      const batchTotal = parsedCost * parsedQuantity;
      
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
          amount: batchTotal,
          description: `Purchase from supplier for batch ${batchNo}`,
        },
      });

      // ACCOUNTS PAYABLE: Create AP record with full amount as default payable
      await tx.accountsPayable.create({
        data: {
          batchId: newBatch.id,
          totalAmount: batchTotal,
          payableAmount: batchTotal, // Defaults to full amount
          paymentStatus: 'PENDING', // Starts as PENDING since payableAmount > 0
        },
      });
    });

    return NextResponse.json({ message: 'Batch added successfully' }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to add batch.' }, { status: 500 });
  }
}