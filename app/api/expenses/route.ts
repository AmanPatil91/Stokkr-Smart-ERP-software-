import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Fetch all expenses ordered by date (newest first)
    const expenses = await prisma.expense.findMany({
      orderBy: { expenseDate: 'desc' },
    });

    return NextResponse.json(expenses);
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

    // Create expense
    const expense = await prisma.expense.create({
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

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}
