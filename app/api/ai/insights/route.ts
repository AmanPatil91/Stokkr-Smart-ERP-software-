import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Fetch context data in parallel
    const [expenses, sales, ar, ap, inventory, cashFlow] = await Promise.all([
      prisma.expense.findMany({ 
        where: { expenseDate: { gte: startOfMonth } },
        orderBy: { amount: 'desc' },
        take: 10
      }),
      prisma.invoice.aggregate({
        where: { invoiceType: 'SALES', date: { gte: startOfMonth } },
        _sum: { totalAmount: true }
      }),
      prisma.accountsReceivable.findMany({
        where: { paymentStatus: 'PENDING' },
        include: { invoice: { include: { party: true } } },
        orderBy: { receivableAmount: 'desc' },
        take: 5
      }),
      prisma.accountsPayable.aggregate({
        where: { paymentStatus: 'PENDING' },
        _sum: { payableAmount: true }
      }),
      prisma.batch.findMany({
        where: { quantity: { lt: 10 } },
        include: { product: true },
        take: 5
      }),
      prisma.invoice.aggregate({
        where: { invoiceType: 'PURCHASE', date: { gte: startOfMonth } },
        _sum: { totalAmount: true }
      })
    ]);

    const expenseSummary = expenses.reduce((acc: any, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
      return acc;
    }, {});

    const totalExpenses = Number(Object.values(expenseSummary).reduce((a: any, b: any) => Number(a) + Number(b), 0));
    const totalSales = Number(sales._sum.totalAmount || 0);
    const totalPurchases = Number(cashFlow._sum.totalAmount || 0);
    
    const lowStock = inventory.map(i => `${i.product.name} (Qty: ${i.quantity})`).join(', ');
    const topDebtors = ar.map(a => `${a.invoice.party.name}: ₹${Number(a.receivableAmount).toLocaleString()}`).join(', ');

    const context = `
      Current Month Metrics:
      - Total Sales: ₹${totalSales.toLocaleString()}
      - Total Purchases: ₹${totalPurchases.toLocaleString()}
      - Total Expenses: ₹${totalExpenses.toLocaleString()}
      - Expense Breakdown: ${JSON.stringify(expenseSummary)}
      - Top Debtors: ${topDebtors || 'None'}
      - Low Stock Items: ${lowStock || 'None'}
      - Total Payables (Unpaid Purchases): ₹${Number(ap._sum.payableAmount || 0).toLocaleString()}
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a Business Insights Assistant for Stokkr ERP. Use the provided financial context to answer the user\'s question concisely. Focus on explaining "why" and "how". Use ₹ for currency. Keep it under 150 words.'
        },
        { role: 'user', content: `Context: ${context}\n\nQuestion: ${question}` }
      ],
    });

    return NextResponse.json({ 
      insight: response.choices[0].message.content,
      disclaimer: 'AI-generated insights for informational purposes only.'
    });
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Insights API Error:', error);
      return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
    }
}
