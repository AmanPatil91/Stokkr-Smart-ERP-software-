import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth()));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    // Cut-off is the last day of the selected month
    const cutoffDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // 1. ASSETS
    // A. Cash / Bank
    // Total customer payments received till cut-off
    const customerPayments = await prisma.accountsReceivable.aggregate({
      where: {
        paymentStatus: 'COMPLETED',
        updatedAt: { lte: cutoffDate }
      },
      _sum: { totalAmount: true }
    });

    // Total supplier payments till cut-off
    const supplierPayments = await prisma.accountsPayable.aggregate({
      where: {
        paymentStatus: 'COMPLETED',
        updatedAt: { lte: cutoffDate }
      },
      _sum: { totalAmount: true }
    });

    // Total expense payments till cut-off
    const expensePayments = await prisma.expense.aggregate({
      where: {
        expenseDate: { lte: cutoffDate }
      },
      _sum: { amount: true }
    });

    const cashBank = Number(customerPayments._sum.totalAmount || 0) - 
                     Number(supplierPayments._sum.totalAmount || 0) - 
                     Number(expensePayments._sum.amount || 0);

    // B. Accounts Receivable (Outstanding at cut-off)
    // Invoices dated before cut-off that were either not paid or paid AFTER cut-off
    const outstandingReceivables = await prisma.accountsReceivable.findMany({
      where: {
        invoice: { date: { lte: cutoffDate } },
        OR: [
          { paymentStatus: 'PENDING' },
          { updatedAt: { gt: cutoffDate } }
        ]
      }
    });
    const accountsReceivable = outstandingReceivables.reduce((sum, ar) => sum + Number(ar.receivableAmount), 0);

    // C. Inventory (Simplified FIFO Valuation)
    // Value of batches with remaining quantity > 0 at cut-off
    const activeBatches = await prisma.batch.findMany({
      where: {
        quantity: { gt: 0 }
      }
    });
    const inventoryValue = activeBatches.reduce((sum, b) => sum + (Number(b.costPerItem) * b.quantity), 0);

    const totalAssets = cashBank + accountsReceivable + inventoryValue;

    // 2. LIABILITIES
    // A. Accounts Payable (Outstanding at cut-off)
    const outstandingPayables = await prisma.accountsPayable.findMany({
      where: {
        createdAt: { lte: cutoffDate },
        OR: [
          { paymentStatus: 'PENDING' },
          { updatedAt: { gt: cutoffDate } }
        ]
      }
    });
    const accountsPayable = outstandingPayables.reduce((sum, ap) => sum + Number(ap.payableAmount), 0);

    // B. Loans (Derived from "Interest on Loans" category as a proxy or zero if not explicitly tracked)
    const loans = 0; // Principal not explicitly tracked in schema yet

    const totalLiabilities = accountsPayable + loans;

    // 3. EQUITY
    const equity = totalAssets - totalLiabilities;

    return NextResponse.json({
      asOfDate: cutoffDate.toISOString(),
      assets: {
        cashBank,
        accountsReceivable,
        inventoryValue,
        totalAssets
      },
      liabilities: {
        accountsPayable,
        loans,
        totalLiabilities
      },
      equity: {
        retainedEarnings: equity,
        totalEquity: equity
      },
      totalLiabilitiesAndEquity: totalLiabilities + equity
    });
  } catch (error: any) {
    console.error('Balance Sheet API Error:', error);
    return NextResponse.json({ error: 'Failed to calculate balance sheet' }, { status: 500 });
  }
}
