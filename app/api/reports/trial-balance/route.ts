import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth()));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    const endDate = new Date(year, month + 1, 1);

    // Get all parties and their ledger transactions up to the end date
    const parties = await prisma.party.findMany({
      include: {
        ledgerTransactions: {
          where: { date: { lt: endDate } }
        }
      }
    });

    // Get all expenses up to the end date
    const expenses = await prisma.expense.findMany({
      where: { expenseDate: { lt: endDate } }
    });

    const accounts: any[] = [];

    // 1. Party Accounts
    parties.forEach(party => {
      let totalDr = 0;
      let totalCr = 0;
      party.ledgerTransactions.forEach(tx => {
        if (tx.transactionType === 'DEBIT') totalDr += Number(tx.amount);
        else totalCr += Number(tx.amount);
      });

      const balance = totalDr - totalCr;
      accounts.push({
        name: party.name,
        debit: totalDr,
        credit: totalCr,
        closingBalance: Math.abs(balance),
        type: balance >= 0 ? 'Dr' : 'Cr'
      });
    });

    // 2. Expense Accounts (Grouped by category)
    const expenseGroups = expenses.reduce((acc: any, exp: any) => {
      acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
      return acc;
    }, {});

    Object.entries(expenseGroups).forEach(([category, amount]) => {
      accounts.push({
        name: `Expense: ${category}`,
        debit: amount,
        credit: 0,
        closingBalance: Number(amount),
        type: 'Dr'
      });
    });

    // Calculate totals for validation
    const totalDebit = accounts.reduce((sum, acc) => sum + acc.debit, 0);
    const totalCredit = accounts.reduce((sum, acc) => sum + acc.credit, 0);

    return NextResponse.json({
      accounts,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01
    });
  } catch (error: any) {
    console.error('Trial Balance API Error:', error);
    return NextResponse.json({ error: 'Failed to generate trial balance' }, { status: 500 });
  }
}
