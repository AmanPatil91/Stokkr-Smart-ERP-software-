import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma'; // Use the shared Prisma client

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { partyId, items } = body;

    // TODO: Add validation and authentication checks here

    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + item.quantity * item.pricePerItem,
      0
    );

    // Use a transaction to ensure all operations are atomic
    await prisma.$transaction(async (tx) => {
      // 1. Create the Invoice
      const newInvoice = await tx.invoice.create({
        data: {
          invoiceNumber: `INV-${Date.now()}`, // Simple invoice number
          invoiceType: 'SALES',
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

      // 3. Create Stock Transactions (type 'OUT')
      await tx.stockTransaction.createMany({
        data: items.map((item: any) => ({
          productId: item.productId,
          transactionType: 'OUT',
          quantity: item.quantity,
          notes: `Sales Invoice #${newInvoice.invoiceNumber}`,
        })),
      });

      // 4. Create a Ledger Transaction (type 'DEBIT')
      await tx.ledgerTransaction.create({
        data: {
          partyId: partyId,
          transactionType: 'DEBIT',
          amount: totalAmount,
          description: `Sales Invoice #${newInvoice.invoiceNumber}`,
        },
      });
    });

    return NextResponse.json({ message: 'Invoice created successfully' }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}