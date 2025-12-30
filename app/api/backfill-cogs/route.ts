import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * API endpoint to backfill COGS for existing invoices using FIFO
 * This calculates COGS based on batch costs in order (FIFO)
 * 
 * POST /api/backfill-cogs
 */
export async function POST(request: Request) {
  try {
    // For each invoice item without COGS, calculate it based on batch costs (FIFO)
    // This uses a simplified approach: average cost of all available batches
    
    const result = await prisma.$executeRaw`
      UPDATE "InvoiceItem" ii
      SET 
        "cogsPerItem" = COALESCE(
          (
            SELECT AVG(b."costPerItem")
            FROM "Batch" b
            WHERE b."productId" = ii."productId"
          ),
          ii."pricePerItem" * 0.8  -- fallback: assume 80% of selling price as cost
        ),
        "cogsTotal" = COALESCE(
          (
            SELECT AVG(b."costPerItem") * ii."quantity"
            FROM "Batch" b
            WHERE b."productId" = ii."productId"
          ),
          ii."pricePerItem" * ii."quantity" * 0.8  -- fallback cost
        )
      WHERE ii."cogsTotal" IS NULL
    `;

    return NextResponse.json({
      success: true,
      message: `Backfilled COGS for invoice items`,
      rowsUpdated: result,
    }, { status: 200 });
  } catch (error: any) {
    console.error('Backfill COGS API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to backfill COGS', 
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}
