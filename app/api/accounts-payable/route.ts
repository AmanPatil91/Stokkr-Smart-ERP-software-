import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all accounts payable
export async function GET() {
  try {
    const payables = await prisma.accountsPayable.findMany({
      include: {
        batch: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(payables);
  } catch (error) {
    console.error('Failed to fetch accounts payable:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts payable' }, { status: 500 });
  }
}
