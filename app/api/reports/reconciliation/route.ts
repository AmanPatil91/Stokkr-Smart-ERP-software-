import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth()));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);

    // 1. Get Net Profit (Accrual Basis)
    const sales = await prisma.invoice.aggregate({
      where: { invoiceType: 'SALES', date: { gte: startDate, lt: endDate } },
      _sum: { totalAmount: true }
    });
    const revenue = Number(sales._sum.totalAmount || 0);

    const cogsAgg = await prisma.invoiceItem.aggregate({
      where: { invoice: { invoiceType: 'SALES', date: { gte: startDate, lt: endDate } } },
      _sum: { cogsTotal: true }
    });
    const cogs = Number(cogsAgg._sum.cogsTotal || 0);

    const expensesAgg = await prisma.expense.aggregate({
      where: { expenseDate: { gte: startDate, lt: endDate } },
      _sum: { amount: true }
    });
    const expenses = Number(expensesAgg._sum.amount || 0);

    const netProfit = revenue - cogs - expenses;

    // 2. Get Net Cash Flow (Cash Basis)
    const cashIn = await prisma.accountsReceivable.aggregate({
      where: { paymentStatus: 'COMPLETED', updatedAt: { gte: startDate, lt: endDate } },
      _sum: { totalAmount: true }
    });
    const customerPayments = Number(cashIn._sum.totalAmount || 0);

    const cashOutSuppliers = await prisma.accountsPayable.aggregate({
      where: { paymentStatus: 'COMPLETED', updatedAt: { gte: startDate, lt: endDate } },
      _sum: { totalAmount: true }
    });
    const supplierPayments = Number(cashOutSuppliers._sum.totalAmount || 0);

    const netCashFlow = customerPayments - supplierPayments - expenses;

    // 3. Reconciliation Items
    // a) Change in AR: (Revenue - Customer Payments)
    // If Revenue > Payments, AR increased (Profit > Cash)
    const arImpact = customerPayments - revenue;

    // b) Change in AP: (Expenses - Supplier Payments)
    // Note: Supplier payments for inventory purchases also impact cash but not profit (until sold)
    const apImpact = supplierPayments - cogs;

    // c) Inventory Impact: (Purchases vs COGS)
    // This represents cash spent on stock that hasn't been recognized as expense yet
    // Total Purchases = Supplier Payments (approx for this model)
    const inventoryImpact = cogs - supplierPayments;

    // d) Loan Principal (Placeholder)
    const loanPrincipalImpact = 0;

    return NextResponse.json({
      period: { month, year },
      netProfit,
      netCashFlow,
      adjustments: [
        {
          label: 'Credit Sales Impact (Receivables)',
          value: arImpact,
          explanation: arImpact < 0 
            ? 'Sales recorded as profit, but cash not yet received (AR increase).' 
            : 'Cash collected from prior months\' credit sales (AR decrease).'
        },
        {
          label: 'Outstanding Payables Impact',
          value: supplierPayments - cogs, // Adjusted for clearer logic
          explanation: 'Expenses or purchases recorded but cash not yet paid.'
        },
        {
          label: 'Inventory Impact',
          value: inventoryImpact,
          explanation: 'Cash spent on inventory that has not yet been sold (COGS vs Purchases).'
        },
        {
          label: 'Loan Principal Movements',
          value: loanPrincipalImpact,
          explanation: 'Loan repayments or receipts that affect cash flow but not profit.'
        }
      ]
    });
  } catch (error: any) {
    console.error('Reconciliation API Error:', error);
    return NextResponse.json({ error: 'Failed to reconcile' }, { status: 500 });
  }
}
