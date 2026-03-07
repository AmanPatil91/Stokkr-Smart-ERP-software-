import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, cost, supplierId, quantity, expiry } = body;

    const expiryDate = new Date(expiry);

    const parsedQuantity = parseFloat(quantity);
    const parsedCost = parseFloat(cost);

    await prisma.$transaction(async (tx) => {
      // Auto-generate Batch Number
      const lastBatch = await tx.batch.findFirst({
        where: {
          batchNumber: {
            startsWith: 'BATCH',
          },
        },
        orderBy: {
          batchNumber: 'desc',
        },
      });

      let nextBatchNo = 'BATCH001';
      if (lastBatch && lastBatch.batchNumber) {
        const match = lastBatch.batchNumber.match(/^BATCH(\d+)$/);
        if (match && match[1]) {
          const nextNum = parseInt(match[1], 10) + 1;
          nextBatchNo = `BATCH${nextNum.toString().padStart(3, '0')}`;
        }
      }

      const batchTotal = parsedCost * parsedQuantity;

      const newBatch = await tx.batch.create({
        data: {
          batchNumber: nextBatchNo,
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
          notes: `Added new batch ${nextBatchNo} from supplier ${supplierId}`,
        },
      });

      await tx.ledgerTransaction.create({
        data: {
          partyId: supplierId,
          transactionType: 'CREDIT',
          amount: batchTotal,
          description: `Purchase from supplier for batch ${nextBatchNo}`,
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
    console.error('API Error (Batch Transaction Rolled Back):', error);
    return NextResponse.json({ error: 'Transaction failed. No changes were saved.' }, { status: 500 });
  }
}