import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Fetch all expenses ordered by date (newest first)
    const expenses = await prisma.expense.findMany({
      orderBy: { expenseDate: 'desc' },
    });

    // Convert Decimal amounts to numbers for JSON serialization
    const formattedExpenses = expenses.map(exp => ({
      ...exp,
      amount: Number(exp.amount),
    }));

    return NextResponse.json(formattedExpenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { category, title, amount, expenseDate, paymentMode } = body;

    if (!category || !title || !amount || !expenseDate || !paymentMode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate amount is positive
    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      return NextResponse.json(
        { error: 'Amount must be positive' },
        { status: 400 }
      );
    }

    // Use transaction for atomic expense & ledger creation
    const expense = await prisma.$transaction(async (tx) => {
      const newExpense = await tx.expense.create({
        data: {
          category,
          title,
          amount: amountNum,
          expenseDate: new Date(expenseDate),
          paymentMode,
          referenceNumber: body.referenceNumber || null,
          notes: body.notes || null,
        },
      });

      // Find or create an internal party to satisfy the LedgerTransaction partyId requirement
      let expenseParty = await tx.party.findFirst({
        where: { name: 'Internal Expenses' },
      });
      if (!expenseParty) {
        expenseParty = await tx.party.create({
          data: {
            name: 'Internal Expenses',
            partyType: 'INTERNAL',
          },
        });
      }

      await tx.ledgerTransaction.create({
        data: {
          partyId: expenseParty.id,
          transactionType: 'DEBIT',
          amount: amountNum,
          description: `Expense: ${category} - ${title}`,
          paymentMode: paymentMode,
          referenceNumber: body.referenceNumber || null,
        },
      });

      return newExpense;
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('API Error (Expense Transaction Rolled Back):', error);
    return NextResponse.json(
      { error: 'Transaction failed. No changes were saved.' },
      { status: 500 }
    );
  }
}
