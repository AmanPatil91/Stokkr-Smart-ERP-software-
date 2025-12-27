import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET single accounts receivable record
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const receivable = await prisma.accountsReceivable.findUnique({
      where: { id: params.id },
      include: {
        invoice: {
          include: {
            party: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!receivable) {
      return NextResponse.json({ error: 'Accounts receivable not found' }, { status: 404 });
    }

    return NextResponse.json(receivable);
  } catch (error) {
    console.error('Failed to fetch accounts receivable:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts receivable' }, { status: 500 });
  }
}

// PATCH - Update receivable amount for partial payments
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { receivableAmount } = body;

    if (typeof receivableAmount !== 'number' || receivableAmount < 0) {
      return NextResponse.json(
        { error: 'Receivable amount must be a non-negative number' },
        { status: 400 }
      );
    }

    const receivable = await prisma.accountsReceivable.findUnique({
      where: { id: params.id },
    });

    if (!receivable) {
      return NextResponse.json({ error: 'Accounts receivable not found' }, { status: 404 });
    }

    // Status is automatically PENDING if receivableAmount > 0, COMPLETED if = 0
    const paymentStatus = receivableAmount > 0 ? 'PENDING' : 'COMPLETED';

    const updated = await prisma.accountsReceivable.update({
      where: { id: params.id },
      data: {
        receivableAmount: receivableAmount,
        paymentStatus: paymentStatus,
      },
      include: {
        invoice: {
          include: {
            party: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update accounts receivable:', error);
    return NextResponse.json({ error: 'Failed to update accounts receivable' }, { status: 500 });
  }
}
