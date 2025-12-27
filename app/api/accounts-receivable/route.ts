import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all accounts receivable
export async function GET() {
  try {
    const receivables = await prisma.accountsReceivable.findMany({
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(receivables);
  } catch (error) {
    console.error('Failed to fetch accounts receivable:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts receivable' }, { status: 500 });
  }
}
