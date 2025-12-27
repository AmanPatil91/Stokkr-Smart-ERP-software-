import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET single accounts payable record
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const payable = await prisma.accountsPayable.findUnique({
      where: { id: params.id },
      include: {
        batch: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!payable) {
      return NextResponse.json({ error: 'Accounts payable not found' }, { status: 404 });
    }

    return NextResponse.json(payable);
  } catch (error) {
    console.error('Failed to fetch accounts payable:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts payable' }, { status: 500 });
  }
}

// PATCH - Update payable amount for partial payments
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { payableAmount } = body;

    if (typeof payableAmount !== 'number' || payableAmount < 0) {
      return NextResponse.json(
        { error: 'Payable amount must be a non-negative number' },
        { status: 400 }
      );
    }

    const payable = await prisma.accountsPayable.findUnique({
      where: { id: params.id },
    });

    if (!payable) {
      return NextResponse.json({ error: 'Accounts payable not found' }, { status: 404 });
    }

    // Status is automatically PENDING if payableAmount > 0, COMPLETED if = 0
    const paymentStatus = payableAmount > 0 ? 'PENDING' : 'COMPLETED';

    const updated = await prisma.accountsPayable.update({
      where: { id: params.id },
      data: {
        payableAmount: payableAmount,
        paymentStatus: paymentStatus,
      },
      include: {
        batch: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update accounts payable:', error);
    return NextResponse.json({ error: 'Failed to update accounts payable' }, { status: 500 });
  }
}
