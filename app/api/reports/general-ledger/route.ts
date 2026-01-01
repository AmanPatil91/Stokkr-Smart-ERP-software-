import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth()));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const accountFilter = searchParams.get('account');

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);

    const ledgerRows: any[] = [];

    // 1. Sales Invoices
    const salesInvoices = await prisma.invoice.findMany({
      where: {
        invoiceType: 'SALES',
        date: { gte: startDate, lt: endDate },
      },
      include: { items: true },
    });

    salesInvoices.forEach((inv) => {
      // Debit: Accounts Receivable
      ledgerRows.push({
        date: inv.date,
        account: 'Accounts Receivable',
        debit: Number(inv.totalAmount),
        credit: 0,
        reference: `Invoice: ${inv.invoiceNumber}`,
      });
      // Credit: Sales
      ledgerRows.push({
        date: inv.date,
        account: 'Sales',
        debit: 0,
        credit: Number(inv.totalAmount),
        reference: `Invoice: ${inv.invoiceNumber}`,
      });

      // COGS (if calculated)
      inv.items.forEach((item) => {
        if (item.cogsTotal && Number(item.cogsTotal) > 0) {
          // Debit: COGS
          ledgerRows.push({
            date: inv.date,
            account: 'Cost of Goods Sold',
            debit: Number(item.cogsTotal),
            credit: 0,
            reference: `COGS for ${inv.invoiceNumber}`,
          });
          // Credit: Inventory
          ledgerRows.push({
            date: inv.date,
            account: 'Inventory',
            debit: 0,
            credit: Number(item.cogsTotal),
            reference: `Inventory reduction for ${inv.invoiceNumber}`,
          });
        }
      });
    });

    // 2. Customer Payments
    const customerPayments = await prisma.accountsReceivable.findMany({
      where: {
        paymentStatus: 'COMPLETED',
        updatedAt: { gte: startDate, lt: endDate },
      },
      include: { invoice: true },
    });

    customerPayments.forEach((pay) => {
      // Debit: Cash/Bank
      ledgerRows.push({
        date: pay.updatedAt,
        account: 'Cash / Bank',
        debit: Number(pay.totalAmount),
        credit: 0,
        reference: `Payment for ${pay.invoice.invoiceNumber}`,
      });
      // Credit: Accounts Receivable
      ledgerRows.push({
        date: pay.updatedAt,
        account: 'Accounts Receivable',
        debit: 0,
        credit: Number(pay.totalAmount),
        reference: `Payment for ${pay.invoice.invoiceNumber}`,
      });
    });

    // 3. Purchase Invoices (Inventory Batches)
    const purchaseBatches = await prisma.batch.findMany({
      where: {
        accountsPayable: {
          createdAt: { gte: startDate, lt: endDate },
        }
      },
      include: { accountsPayable: true },
    });

    purchaseBatches.forEach((batch) => {
      if (batch.accountsPayable) {
        // Debit: Inventory
        ledgerRows.push({
          date: batch.accountsPayable.createdAt,
          account: 'Inventory',
          debit: Number(batch.accountsPayable.totalAmount),
          credit: 0,
          reference: `Purchase Batch: ${batch.batchNumber}`,
        });
        // Credit: Accounts Payable
        ledgerRows.push({
          date: batch.accountsPayable.createdAt,
          account: 'Accounts Payable',
          debit: 0,
          credit: Number(batch.accountsPayable.totalAmount),
          reference: `Purchase Batch: ${batch.batchNumber}`,
        });
      }
    });

    // 4. Supplier Payments
    const supplierPayments = await prisma.accountsPayable.findMany({
      where: {
        paymentStatus: 'COMPLETED',
        updatedAt: { gte: startDate, lt: endDate },
      },
      include: { batch: true },
    });

    supplierPayments.forEach((pay) => {
      // Debit: Accounts Payable
      ledgerRows.push({
        date: pay.updatedAt,
        account: 'Accounts Payable',
        debit: Number(pay.totalAmount),
        credit: 0,
        reference: `Payment to Supplier for ${pay.batch.batchNumber}`,
      });
      // Credit: Cash/Bank
      ledgerRows.push({
        date: pay.updatedAt,
        account: 'Cash / Bank',
        debit: 0,
        credit: Number(pay.totalAmount),
        reference: `Payment to Supplier for ${pay.batch.batchNumber}`,
      });
    });

    // 5. Expenses
    const expenses = await prisma.expense.findMany({
      where: {
        expenseDate: { gte: startDate, lt: endDate },
      },
    });

    expenses.forEach((exp) => {
      const accountName = exp.category === 'Interest on Loans' ? 'Interest Expense' : `Expense: ${exp.category}`;
      // Debit: Expense Account
      ledgerRows.push({
        date: exp.expenseDate,
        account: accountName,
        debit: Number(exp.amount),
        credit: 0,
        reference: `Expense: ${exp.title}`,
      });
      // Credit: Cash/Bank
      ledgerRows.push({
        date: exp.expenseDate,
        account: 'Cash / Bank',
        debit: 0,
        credit: Number(exp.amount),
        reference: `Expense: ${exp.title}`,
      });
    });

    // Sort by date
    ledgerRows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Filter by account if requested
    const filteredRows = accountFilter 
      ? ledgerRows.filter(row => row.account === accountFilter)
      : ledgerRows;

    return NextResponse.json(filteredRows);
  } catch (error: any) {
    console.error('General Ledger API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch ledger data' }, { status: 500 });
  }
}
