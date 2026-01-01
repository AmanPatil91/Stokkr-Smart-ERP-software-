import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Cash Flow Statement API - calculates actual cash movements for a specific month/year
 * 
 * GET /api/cash-flow?month=0&year=2025
 * 
 * Returns:
 * - Cash from Operating Activities (customer payments - expense payments)
 * - Cash from Financing Activities (loans, repayments, interest)
 * - Cash from Investing Activities (currently zero)
 * - Net Cash Flow
 * 
 * Note: This is CASH-based (not accrual-based like P&L)
 * Only includes actual cash movements within the selected month/year
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth()));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    // Validate month/year
    if (month < 0 || month > 11 || year < 1900 || year > 2100) {
      return NextResponse.json(
        { error: 'Invalid month (0-11) or year' },
        { status: 400 }
      );
    }

    // Calculate date range for the selected month
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);

    // ============================================
    // OPERATING ACTIVITIES
    // ============================================

    // 1. Cash received from customers (payments completed in the selected month)
    // We look at AccountsReceivable records that were updated (completed) in this month
    // Note: In a real system, you'd have a separate Payments table. 
    // Here we use updatedAt as the payment date for COMPLETED receivables.
    const cashFromCustomers = await prisma.$queryRaw`
      SELECT COALESCE(SUM("totalAmount"::numeric), 0) as total
      FROM "AccountsReceivable"
      WHERE "paymentStatus" = 'COMPLETED'
        AND "updatedAt" >= ${startDate}
        AND "updatedAt" < ${endDate}
    ` as Array<{ total: string }>;

    const cashReceivedFromCustomers = Number(cashFromCustomers[0]?.total || 0);

    // 2. Cash paid for operating expenses in the selected month
    const expenses = await prisma.expense.findMany({
      where: {
        expenseDate: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    const cashExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

    // 3. Cash paid to suppliers (Accounts Payable)
    // Similarly, using updatedAt for COMPLETED payables within the month
    const cashToSuppliers = await prisma.$queryRaw`
      SELECT COALESCE(SUM("totalAmount"::numeric), 0) as total
      FROM "AccountsPayable"
      WHERE "paymentStatus" = 'COMPLETED'
        AND "updatedAt" >= ${startDate}
        AND "updatedAt" < ${endDate}
    ` as Array<{ total: string }>;

    const cashPaidToSuppliers = Number(cashToSuppliers[0]?.total || 0);

    // Net Operating Cash Flow = Cash in - (Expense Cash Out + Supplier Cash Out)
    const netOperatingCashFlow = cashReceivedFromCustomers - cashExpenses - cashPaidToSuppliers;

    // ============================================
    // FINANCING ACTIVITIES
    // ============================================
    // Financing activities are identified by specific expense categories or future loan models
    // Interest on Loans is explicitly mentioned in requirements
    const interestExpenses = await prisma.expense.findMany({
      where: {
        category: 'Interest on Loans',
        expenseDate: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    const interestPaid = interestExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    
    // Placeholder for loan principal movements if they were tracked
    const loanReceived = 0;
    const loanRepayment = 0;
    
    const netFinancingCashFlow = loanReceived - loanRepayment - interestPaid;

    // ============================================
    // INVESTING ACTIVITIES
    // ============================================
    // Per requirements: Display as zero
    const netInvestingCashFlow = 0;

    // ============================================
    // NET CASH FLOW
    // ============================================
    const netCashFlow = netOperatingCashFlow + netFinancingCashFlow + netInvestingCashFlow;

    return NextResponse.json({
      month,
      year,
      operatingActivities: {
        cashReceivedFromCustomers,
        cashPaidForExpenses: cashExpenses,
        cashPaidToSuppliers,
        netOperatingCashFlow,
      },
      financingActivities: {
        loanReceived,
        loanRepayment,
        interestPaid,
        netFinancingCashFlow,
      },
      investingActivities: {
        netInvestingCashFlow,
      },
      netCashFlow,
    });
  } catch (error: any) {
    console.error('Cash Flow API Error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate cash flow', details: error.message },
      { status: 500 }
    );
  }
}
