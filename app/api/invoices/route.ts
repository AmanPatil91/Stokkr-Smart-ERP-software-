import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateFifoCogs, reduceBatchQuantities } from '@/lib/cogsCalculator';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { partyId, items, totalAmount: providedTotal } = body;

    const totalAmount = providedTotal || items.reduce(
      (sum: number, item: any) => sum + item.quantity * item.pricePerItem,
      0
    );

    // Calculate COGS for each item using FIFO method
    const itemsWithCogs = await Promise.all(
      items.map(async (item: any) => {
        const cogsResult = await calculateFifoCogs(item.productId, item.quantity);
        return {
          ...item,
          cogsPerItem: cogsResult.cogsPerItem,
          cogsTotal: cogsResult.cogsTotal,
          batchUsage: cogsResult.batchUsage,
        };
      })
    );

    // Total COGS for the invoice
    const totalCogs = itemsWithCogs.reduce((sum, item) => sum + item.cogsTotal, 0);

    await prisma.$transaction(async (tx) => {
      const newInvoice = await tx.invoice.create({
        data: {
          invoiceNumber: `INV-${Date.now()}`,
          invoiceType: 'SALES',
          partyId: partyId,
          totalAmount: totalAmount,
        },
      });

      // Create invoice items with COGS data
      await tx.invoiceItem.createMany({
        data: itemsWithCogs.map((item: any) => ({
          invoiceId: newInvoice.id,
          productId: item.productId,
          quantity: item.quantity,
          pricePerItem: item.pricePerItem,
          subtotal: item.quantity * item.pricePerItem,
          cogsPerItem: item.cogsPerItem,
          cogsTotal: item.cogsTotal,
        })),
      });

      // Reduce batch quantities based on FIFO consumption
      for (const item of itemsWithCogs) {
        await reduceBatchQuantities(item.batchUsage);
      }

      await tx.stockTransaction.createMany({
        data: itemsWithCogs.map((item: any) => ({
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

      // ACCOUNTS RECEIVABLE: Create AR record with full amount as default receivable
      await tx.accountsReceivable.create({
        data: {
          invoiceId: newInvoice.id,
          totalAmount: totalAmount,
          receivableAmount: totalAmount, // Defaults to full amount
          paymentStatus: 'PENDING', // Starts as PENDING since receivableAmount > 0
        },
      });
    });

    return NextResponse.json({ message: 'Invoice created successfully' }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}