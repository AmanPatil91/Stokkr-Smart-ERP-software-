import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(
      searchParams.get('month') ?? new Date().getMonth().toString(),
      10
    );
    const year = parseInt(
      searchParams.get('year') ?? new Date().getFullYear().toString(),
      10
    );

    if (month < 0 || month > 11) {
      return NextResponse.json(
        { error: 'Invalid month. Use 0-11.' },
        { status: 400 }
      );
    }

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const salesInvoices = await prisma.invoice.findMany({
      where: {
        invoiceType: 'SALES',
        date: { gte: startDate, lte: endDate },
      },
    });

    const totalSales = salesInvoices.reduce(
      (sum, inv) => sum + Number(inv.totalAmount),
      0
    );

    const expenses = await prisma.expense.findMany({
      where: {
        expenseDate: { gte: startDate, lte: endDate },
      },
    });

    const totalExpenses = expenses.reduce(
      (sum, exp) => sum + Number(exp.amount),
      0
    );

    const netProfitLoss = totalSales - totalExpenses;

    const receivables = await prisma.accountsReceivable.findMany({
      where: { createdAt: { lte: endDate } },
    });

    const payables = await prisma.accountsPayable.findMany({
      where: { createdAt: { lte: endDate } },
    });

    const totalReceivable = receivables.reduce(
      (sum, ar) => sum + Number(ar.receivableAmount),
      0
    );

    const totalPayable = payables.reduce(
      (sum, ap) => sum + Number(ap.payableAmount),
      0
    );

    const outstandingAmount = totalReceivable - totalPayable;

    const monthName = new Date(year, month).toLocaleString('default', {
      month: 'long',
    });

    return NextResponse.json({
      month: `${monthName} ${year}`,
      totalSales: totalSales.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      netProfitLoss: netProfitLoss.toFixed(2),
      outstandingAmount: outstandingAmount.toFixed(2),
      totalReceivable: totalReceivable.toFixed(2),
      totalPayable: totalPayable.toFixed(2),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch financial health KPIs' },
      { status: 500 }
    );
  }
}
