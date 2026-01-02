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

    // b) Change in AP: (Expenses - Supplier Payments) - Simplified
    // Note: We use supplier payments vs COGS/Purchases logic for inventory
    const apImpact = expenses + supplierPayments; // This is a placeholder for more complex logic if needed

    // c) Inventory Impact: (COGS - Cash Paid for Inventory)
    // Inventory Impact = COGS - Supplier Payments (assuming supplier payments are only for inventory)
    const inventoryImpact = cogs - supplierPayments;

    // d) Loan Principal (Placeholder)
    const loanPrincipalImpact = 0;

    return NextResponse.json({
      period: { month, year },
      netProfit,
      netCashFlow,
      adjustments: [
        {
          label: 'Change in Accounts Receivable',
          value: arImpact,
          explanation: arImpact < 0 
            ? 'Revenue recognized but cash not yet collected from credit sales.' 
            : 'Cash collected from prior months\' credit sales.'
        },
        {
          label: 'Inventory & Payable Impact',
          value: inventoryImpact,
          explanation: 'Difference between cost of goods sold and actual cash paid to suppliers for stock.'
        },
        {
          label: 'Non-Cash Interest / Principal',
          value: loanPrincipalImpact,
          explanation: 'Adjustments for loan movements which affect cash but not profit.'
        }
      ]
    });
  } catch (error: any) {
    console.error('Reconciliation API Error:', error);
    return NextResponse.json({ error: 'Failed to reconcile' }, { status: 500 });
  }
}
