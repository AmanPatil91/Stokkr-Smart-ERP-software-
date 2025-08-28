import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { partyId, items } = body;

    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + item.quantity * item.pricePerItem,
      0
    );

    // Use a transaction to ensure all operations are atomic
    await prisma.$transaction(async (tx) => {
      // 1. Create the Purchase Invoice
      const newInvoice = await tx.invoice.create({
        data: {
          invoiceNumber: `PUR-${Date.now()}`,
          invoiceType: 'PURCHASE',
          partyId: partyId,
          totalAmount: totalAmount,
        },
      });

      // 2. Create Invoice Items
      await tx.invoiceItem.createMany({
        data: items.map((item: any) => ({
          invoiceId: newInvoice.id,
          productId: item.productId,
          quantity: item.quantity,
          pricePerItem: item.pricePerItem,
          subtotal: item.quantity * item.pricePerItem,
        })),
      });

      // 3. Create Stock Transactions (type 'IN')
      await tx.stockTransaction.createMany({
        data: items.map((item: any) => ({
          productId: item.productId,
          transactionType: 'IN',
          quantity: item.quantity,
          notes: `Purchase Invoice #${newInvoice.invoiceNumber}`,
        })),
      });

      // 4. Create a Ledger Transaction (type 'CREDIT')
      await tx.ledgerTransaction.create({
        data: {
          partyId: partyId,
          transactionType: 'CREDIT',
          amount: totalAmount,
          description: `Purchase Invoice #${newInvoice.invoiceNumber}`,
        },
      });
    });

    return NextResponse.json({ message: 'Purchase invoice created successfully' }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to create purchase invoice' }, { status: 500 });
  }
}