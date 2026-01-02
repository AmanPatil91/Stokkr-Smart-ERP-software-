import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const today = new Date();
    
    // 1. Receivables Aging
    const receivables = await prisma.accountsReceivable.findMany({
      where: { paymentStatus: 'PENDING' },
      include: { 
        invoice: { 
          include: { party: true } 
        } 
      },
    });

    const receivablesAging = receivables.map(ar => {
      const invoiceDate = new Date(ar.invoice.date);
      const diffDays = Math.floor((today.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let bucket = '0–30 days';
      let status = 'Current';
      if (diffDays > 60) {
        bucket = '60+ days';
        status = 'Critical';
      } else if (diffDays > 30) {
        bucket = '31–60 days';
        status = 'Overdue';
      }

      return {
        id: ar.id,
        customer: ar.invoice.party.name,
        date: ar.invoice.date,
        amount: Number(ar.receivableAmount),
        days: diffDays,
        bucket,
        status,
        reference: ar.invoice.invoiceNumber,
      };
    });

    // 2. Payables Aging
    const payables = await prisma.accountsPayable.findMany({
      where: { paymentStatus: 'PENDING' },
      include: { 
        batch: { 
          include: { 
            product: true 
          } 
        } 
      },
    });

    // Note: Since Batch doesn't have a direct date, we use createdAt if available or infer from Batch ID/Expiry
    // Looking at schema, Batch doesn't have createdAt. But AccountsPayable has.
    const payablesAging = payables.map(ap => {
      const purchaseDate = new Date(ap.createdAt);
      const diffDays = Math.floor((today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let bucket = '0–30 days';
      let status = 'Current';
      if (diffDays > 60) {
        bucket = '60+ days';
        status = 'Critical';
      } else if (diffDays > 30) {
        bucket = '31–60 days';
        status = 'Overdue';
      }

      return {
        id: ap.id,
        supplier: "Supplier", // Party info not directly on Batch, would need Batch -> Purchase relationship
        date: ap.createdAt,
        amount: Number(ap.payableAmount),
        days: diffDays,
        bucket,
        status,
        reference: ap.batch.batchNumber,
      };
    });

    // 3. Customer Exposure
    const customerExposureRaw = await prisma.party.findMany({
      where: { partyType: 'CUSTOMER' },
      include: {
        invoices: {
          where: {
            accountsReceivable: {
              paymentStatus: 'PENDING'
            }
          },
          include: {
            accountsReceivable: true
          }
        }
      }
    });

    const customerExposure = customerExposureRaw.map(customer => {
      const outstanding = customer.invoices.reduce((sum, inv) => 
        sum + Number(inv.accountsReceivable?.receivableAmount || 0), 0);
      
      return {
        id: customer.id,
        name: customer.name,
        outstanding,
      };
    }).filter(c => c.outstanding > 0);

    return NextResponse.json({
      receivablesAging,
      payablesAging,
      customerExposure
    });
  } catch (error: any) {
    console.error('Credit Risk API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch risk data' }, { status: 500 });
  }
}
