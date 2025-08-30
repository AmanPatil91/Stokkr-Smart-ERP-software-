import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { partyId, items } = body;

    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + item.quantity * item.pricePerItem,
      0
    );

    await prisma.$transaction(async (tx) => {
      const newInvoice = await tx.invoice.create({
        data: {
          invoiceNumber: `INV-${Date.now()}`,
          invoiceType: 'SALES',
          partyId: partyId,
          totalAmount: totalAmount,
        },
      });

      await tx.invoiceItem.createMany({
        data: items.map((item: any) => ({
          invoiceId: newInvoice.id,
          productId: item.productId,
          quantity: item.quantity,
          pricePerItem: item.pricePerItem,
          subtotal: item.quantity * item.pricePerItem,
        })),
      });

      await tx.stockTransaction.createMany({
        data: items.map((item: any) => ({
          productId: item.productId,
          transactionType: 'OUT',
          quantity: item.quantity,
          notes: `Sales Invoice #${newInvoice.invoiceNumber}`,
        })),
      });

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