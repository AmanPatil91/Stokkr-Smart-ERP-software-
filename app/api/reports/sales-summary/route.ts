import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const salesSummary = await prisma.invoice.aggregate({
      _sum: {
        totalAmount: true,
      },
      where: {
        invoiceType: 'SALES',
      },
    });

    const totalSales = salesSummary._sum.totalAmount || 0;

    return NextResponse.json({ totalSales });
  } catch (error) {
    console.error('Failed to fetch sales summary:', error);
    return NextResponse.json({ error: 'Failed to fetch sales summary.' }, { status: 500 });
  }
}