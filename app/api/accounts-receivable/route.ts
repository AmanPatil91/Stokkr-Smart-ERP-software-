import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all accounts receivable with COGS data using raw SQL
export async function GET() {
  try {
    // Use raw SQL to fetch data including COGS fields
    const receivables = await prisma.$queryRaw`
      SELECT 
        ar."id",
        ar."invoiceId",
        ar."totalAmount",
        ar."receivableAmount",
        ar."paymentStatus",
        ar."createdAt",
        ar."updatedAt",
        json_build_object(
          'id', i."id",
          'invoiceNumber', i."invoiceNumber",
          'invoiceType', i."invoiceType",
          'date', i."date",
          'totalAmount', i."totalAmount",
          'partyId', i."partyId",
          'party', json_build_object(
            'id', p."id",
            'name', p."name",
            'partyType', p."partyType",
            'contactNumber', p."contactNumber",
            'email', p."email",
            'gstin', p."gstin"
          ),
          'items', (
            SELECT json_agg(json_build_object(
              'id', ii."id",
              'invoiceId', ii."invoiceId",
              'productId', ii."productId",
              'quantity', ii."quantity",
              'pricePerItem', ii."pricePerItem",
              'subtotal', ii."subtotal",
              'cogsPerItem', ii."cogsPerItem",
              'cogsTotal', ii."cogsTotal",
              'product', json_build_object(
                'id', prod."id",
                'name', prod."name",
                'sku', prod."sku",
                'description', prod."description",
                'price', prod."price",
                'cost', prod."cost",
                'expiryAlertDays', prod."expiryAlertDays",
                'lowStockAlertQty', prod."lowStockAlertQty"
              )
            ))
            FROM "InvoiceItem" ii
            LEFT JOIN "Product" prod ON ii."productId" = prod."id"
            WHERE ii."invoiceId" = i."id"
          )
        ) as "invoice"
      FROM "AccountsReceivable" ar
      LEFT JOIN "Invoice" i ON ar."invoiceId" = i."id"
      LEFT JOIN "Party" p ON i."partyId" = p."id"
      ORDER BY ar."createdAt" DESC
    `;

    return NextResponse.json(receivables);
  } catch (error) {
    console.error('Failed to fetch accounts receivable:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts receivable' }, { status: 500 });
  }
}
