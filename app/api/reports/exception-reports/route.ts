import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth()));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);
    
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const prevStartDate = new Date(prevYear, prevMonth, 1);
    const prevEndDate = new Date(prevYear, prevMonth + 1, 1);

    const EXPENSE_THRESHOLD = 1.3; // 30% increase
    const SALES_DROP_THRESHOLD = 0.8; // 20% drop

    // 1. Expense Spikes
    const currentExpenses = await prisma.expense.groupBy({
      by: ['category'],
      where: { expenseDate: { gte: startDate, lt: endDate } },
      _sum: { amount: true }
    });

    const previousExpenses = await prisma.expense.groupBy({
      by: ['category'],
      where: { expenseDate: { gte: prevStartDate, lt: prevEndDate } },
      _sum: { amount: true }
    });

    const expenseAlerts = currentExpenses.map(curr => {
      const prev = previousExpenses.find(p => p.category === curr.category);
      const prevAmount = Number(prev?._sum.amount || 0);
      const currAmount = Number(curr._sum.amount || 0);
      
      if (prevAmount > 0 && currAmount > prevAmount * EXPENSE_THRESHOLD) {
        return {
          category: curr.category,
          previous: prevAmount,
          current: currAmount,
          change: ((currAmount - prevAmount) / prevAmount) * 100
        };
      }
      return null;
    }).filter(Boolean);

    // 2. Sales Drops
    const currentSales = await prisma.invoice.aggregate({
      where: { invoiceType: 'SALES', date: { gte: startDate, lt: endDate } },
      _sum: { totalAmount: true }
    });

    const previousSales = await prisma.invoice.aggregate({
      where: { invoiceType: 'SALES', date: { gte: prevStartDate, lt: prevEndDate } },
      _sum: { totalAmount: true }
    });

    const currSalesAmt = Number(currentSales._sum.totalAmount || 0);
    const prevSalesAmt = Number(previousSales._sum.totalAmount || 0);
    
    const salesAlerts = (prevSalesAmt > 0 && currSalesAmt < prevSalesAmt * SALES_DROP_THRESHOLD) ? [{
      previous: prevSalesAmt,
      current: currSalesAmt,
      change: ((currSalesAmt - prevSalesAmt) / prevSalesAmt) * 100
    }] : [];

    // 3. Long-Overdue Receivables (60+ days)
    const today = new Date();
    const overdueThreshold = new Date();
    overdueThreshold.setDate(today.getDate() - 60);

    const overdueReceivables = await prisma.accountsReceivable.findMany({
      where: {
        paymentStatus: 'PENDING',
        invoice: { date: { lt: overdueThreshold } }
      },
      include: { invoice: { include: { party: true } } }
    });

    const receivableAlerts = overdueReceivables.map(ar => {
      const diffDays = Math.floor((today.getTime() - new Date(ar.invoice.date).getTime()) / (1000 * 60 * 60 * 24));
      return {
        customer: ar.invoice.party.name,
        reference: ar.invoice.invoiceNumber,
        amount: Number(ar.receivableAmount),
        days: diffDays
      };
    });

    return NextResponse.json({
      expenseAlerts,
      salesAlerts,
      receivableAlerts
    });
  } catch (error: any) {
    console.error('Exception Reports API Error:', error);
    return NextResponse.json({ error: 'Failed to generate exception reports' }, { status: 500 });
  }
}
