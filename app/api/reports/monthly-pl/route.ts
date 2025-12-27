// Monthly Profit & Loss Report
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get current month's first and last day
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Calculate total sales revenue for current month
    const salesRevenue = await prisma.invoice.aggregate({
      _sum: {
        totalAmount: true,
      },
      where: {
        invoiceType: 'SALES',
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    // Calculate total expenses for current month
    const totalExpenses = await prisma.expense.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        expenseDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    // Extract values with fallback to 0, and convert Decimal to number
    const revenue = Number(salesRevenue._sum.totalAmount || 0);
    const expenses = Number(totalExpenses._sum.amount || 0);

    // Calculate net profit/loss
    const netProfitLoss = revenue - expenses;

    return NextResponse.json({
      month: now.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      totalRevenue: revenue,
      totalExpenses: expenses,
      netProfitLoss: netProfitLoss,
    });
  } catch (error) {
    console.error('Failed to fetch monthly P&L:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monthly P&L.' },
      { status: 500 }
    );
  }
}
