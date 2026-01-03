import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  console.log('AI Insights API: Request received');
  try {
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

    // Replit AI Integrations uses a managed environment. 
    // The apiKey might be a dummy value, which is expected when baseURL is present.
    const openai = new OpenAI({
      apiKey: apiKey || 'dummy',
      baseURL: baseURL || undefined,
    });

    const { question } = await request.json();
    if (!question) {
      return NextResponse.json({ reply: 'Please provide a question.' }, { status: 400 });
    }

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    console.log('AI Insights API: Fetching business context...');
    // Fetch context data in parallel with safe defaults
    const [expenses, sales, ar, ap, inventory, cashFlow] = await Promise.all([
      prisma.expense.findMany({ 
        where: { expenseDate: { gte: startOfMonth } },
        orderBy: { amount: 'desc' },
        take: 10
      }).catch((e) => { console.error('DB Error (Expenses):', e); return []; }),
      prisma.invoice.aggregate({
        where: { invoiceType: 'SALES', date: { gte: startOfMonth } },
        _sum: { totalAmount: true }
      }).catch((e) => { console.error('DB Error (Sales):', e); return { _sum: { totalAmount: null } }; }),
      prisma.accountsReceivable.findMany({
        where: { paymentStatus: 'PENDING' },
        include: { invoice: { include: { party: true } } },
        orderBy: { receivableAmount: 'desc' },
        take: 5
      }).catch((e) => { console.error('DB Error (AR):', e); return []; }),
      prisma.accountsPayable.aggregate({
        where: { paymentStatus: 'PENDING' },
        _sum: { payableAmount: true }
      }).catch((e) => { console.error('DB Error (AP):', e); return { _sum: { payableAmount: null } }; }),
      prisma.batch.findMany({
        where: { quantity: { lt: 10 } },
        include: { product: true },
        take: 5
      }).catch((e) => { console.error('DB Error (Inventory):', e); return []; }),
      prisma.invoice.aggregate({
        where: { invoiceType: 'PURCHASE', date: { gte: startOfMonth } },
        _sum: { totalAmount: true }
      }).catch((e) => { console.error('DB Error (Purchases):', e); return { _sum: { totalAmount: null } }; })
    ]);

    const expenseSummary = expenses.reduce((acc: any, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
      return acc;
    }, {});

    const totalExpenses = Number(Object.values(expenseSummary).reduce((a: any, b: any) => Number(a) + Number(b), 0));
    const totalSales = Number(sales._sum.totalAmount || 0);
    const totalPurchases = Number(cashFlow._sum.totalAmount || 0);
    
    const lowStock = inventory.map(i => `${i.product.name} (Qty: ${i.quantity})`).join(', ') || 'None';
    const topDebtors = ar.map(a => `${a.invoice?.party?.name || 'Unknown'}: ₹${Number(a.receivableAmount).toLocaleString()}`).join(', ') || 'None';

    const context = `
      Current Month Metrics:
      - Total Sales: ₹${totalSales.toLocaleString()}
      - Total Purchases: ₹${totalPurchases.toLocaleString()}
      - Total Expenses: ₹${totalExpenses.toLocaleString()}
      - Expense Breakdown: ${JSON.stringify(expenseSummary)}
      - Top Debtors: ${topDebtors}
      - Low Stock Items: ${lowStock}
      - Total Payables: ₹${Number(ap._sum.payableAmount || 0).toLocaleString()}
    `;

    console.log('AI Insights API: Calling OpenAI (Model: gpt-4o-mini)...');
    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a Business Insights Assistant for Stokkr ERP. Use the provided financial context to answer questions concisely. Focus on "why" and "how". Use ₹ for currency. Keep it under 150 words.'
        },
        { role: 'user', content: `Context: ${context}\n\nQuestion: ${question}` }
      ],
    });

    const reply = aiResponse.choices[0]?.message?.content || 'I could not generate a response at this time.';
    console.log('AI Insights API: AI call successful');

    return NextResponse.json({ 
      reply: reply,
      disclaimer: 'AI-generated insights for informational purposes only.'
    });
  } catch (err: any) {
    console.error('AI Insights API Error:', err.message || err);
    let errorMessage = 'Failed to generate insights. Please try again later.';
    
    if (err.status === 401) {
      errorMessage = 'AI service authentication failed. Please check your API key.';
    } else if (err.status === 404) {
      errorMessage = 'AI model or service not found. Please check your configuration.';
    } else if (err.status === 429) {
      errorMessage = 'AI service rate limit exceeded. Please try again in a moment.';
    }

    return NextResponse.json({ reply: errorMessage }, { status: 500 });
  }
}
