import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth()));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const partyType = searchParams.get('partyType') || 'CUSTOMER'; // CUSTOMER or SUPPLIER

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);

    const parties = await prisma.party.findMany({
      where: { partyType },
      include: {
        invoices: {
          where: { date: { gte: startDate, lt: endDate } },
          include: { accountsReceivable: true }
        }
      }
    });

    const summary = parties.map(party => {
      let totalAmount = 0;
      let outstanding = 0;
      let totalDelay = 0;
      let paymentCount = 0;
      const today = new Date();

      if (partyType === 'CUSTOMER') {
        party.invoices.forEach(inv => {
          totalAmount += Number(inv.totalAmount);
          if (inv.accountsReceivable) {
            outstanding += Number(inv.accountsReceivable.receivableAmount);
            
            if (inv.accountsReceivable.paymentStatus === 'COMPLETED') {
              const delay = Math.floor((new Date(inv.accountsReceivable.updatedAt).getTime() - new Date(inv.date).getTime()) / (1000 * 60 * 60 * 24));
              totalDelay += Math.max(0, delay);
              paymentCount++;
            } else {
              const delay = Math.floor((today.getTime() - new Date(inv.date).getTime()) / (1000 * 60 * 60 * 24));
              totalDelay += Math.max(0, delay);
              paymentCount++;
            }
          }
        });
      }

      return {
        id: party.id,
        name: party.name,
        total: totalAmount,
        outstanding,
        avgDelay: paymentCount > 0 ? Math.round(totalDelay / paymentCount) : 0
      };
    });

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error('Party Performance API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch party performance' }, { status: 500 });
  }
}
