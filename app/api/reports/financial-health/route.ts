import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || new Date().getMonth().toString(), 10); // 0-11
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString(), 10);

    // Validate month (0-11)
    if (month < 0 || month > 11) {
      return NextResponse.json(
        { error: 'Invalid month. Use 0-11 (0=January, 11=December).' },
        { status: 400 }
      );
    }

    // Calculate start and end dates for the month
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // 1. Total Sales (sum of all SALES invoices for the month)
    const salesInvoices = await prisma.invoice.findMany({
      where: {
        invoiceType: 'SALES',
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalSales = salesInvoices.reduce(
      (sum, inv) => sum + parseFloat(inv.totalAmount.toString()),
      0
    );

    // 2. Total Expenses (sum of all expenses for the month)
    const expenses = await prisma.expense.findMany({
      where: {
        expenseDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalExpenses = expenses.reduce(
      (sum, exp) => sum + parseFloat(exp.amount.toString()),
      0
    );

    // 3. Net Profit/Loss = Sales - Expenses
    const netProfitLoss = totalSales - totalExpenses;

    // 4. Outstanding Amount (as of end of selected month)
    // Outstanding = Total Receivable - Total Payable
    // (sum of remaining receivable amounts - sum of remaining payable amounts)

    // Get all AccountsReceivable records created up to end of month
    const receivables = await prisma.accountsReceivable.findMany({
      where: {
        createdAt: {
          lte: endDate,
        },
      },
    });

    // Get all AccountsPayable records created up to end of month
    const payables = await prisma.accountsPayable.findMany({
      where: {
        createdAt: {
          lte: endDate,
        },
      },
    });

    const totalReceivable = receivables.reduce(
      (sum, ar) => sum + parseFloat(ar.receivableAmount.toString()),
      0
    );

    const totalPayable = payables.reduce(
      (sum, ap) => sum + parseFloat(ap.payableAmount.toString()),
      0
    );

    const outstandingAmount = totalReceivable - totalPayable;

    const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });

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
