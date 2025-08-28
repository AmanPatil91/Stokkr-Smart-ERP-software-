import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const productsWithStock = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        stockTransactions: {
          select: {
            quantity: true,
            transactionType: true,
          },
        },
      },
    });

    const stockSummary = productsWithStock.map(product => {
      let currentStock = 0;
      product.stockTransactions.forEach(transaction => {
        if (transaction.transactionType === 'IN') {
          currentStock += transaction.quantity;
        } else if (transaction.transactionType === 'OUT') {
          currentStock -= transaction.quantity;
        }
      });
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        currentStock,
      };
    });

    return NextResponse.json(stockSummary);
  } catch (error) {
    console.error('Failed to fetch stock summary:', error);
    return NextResponse.json({ error: 'Failed to fetch stock summary.' }, { status: 500 });
  }
}