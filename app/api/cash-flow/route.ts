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
    // Filter AccountsReceivable where paymentStatus = "COMPLETED" and updatedAt falls in the month
    const cashFromCustomers = await prisma.$queryRaw`
      SELECT COALESCE(SUM("totalAmount"::numeric), 0) as total
      FROM "AccountsReceivable"
      WHERE "paymentStatus" = 'COMPLETED'
        AND EXTRACT(YEAR FROM "updatedAt") = ${year}
        AND EXTRACT(MONTH FROM "updatedAt") = ${month + 1}
    ` as Array<{ total: string }>;

    const cashReceivedFromCustomers = Number(cashFromCustomers[0]?.total || 0);

    // 2. Cash paid for operating expenses in the selected month
    const expenses = await prisma.expense.findMany({
      where: {
        expenseDate: {
          gte: new Date(year, month, 1),
          lt: new Date(year, month + 1, 1),
        },
      },
    });

    const cashExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

    // Net Operating Cash Flow = Cash in - Cash out
    const netOperatingCashFlow = cashReceivedFromCustomers - cashExpenses;

    // ============================================
    // FINANCING ACTIVITIES
    // ============================================
    // Currently no loan/financing tracking in schema
    // Placeholder for future: loans received, loan repayments, interest paid
    const cashFromFinancing = 0;
    const cashPaidForFinancing = 0;
    const netFinancingCashFlow = cashFromFinancing - cashPaidForFinancing;

    // ============================================
    // INVESTING ACTIVITIES
    // ============================================
    // Currently excluded per requirements
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
        netOperatingCashFlow,
      },
      financingActivities: {
        cashFromFinancing,
        cashPaidForFinancing,
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
