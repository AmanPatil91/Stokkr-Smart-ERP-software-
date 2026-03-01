import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '90', 10);

        // Time boundaries
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        // 1. Fetch COGS data for the period via InvoiceItems
        // Find all Items sold in SALES invoices within the date range.
        const salesInvoices = await prisma.invoice.findMany({
            where: {
                invoiceType: 'SALES',
                date: {
                    gte: startDate,
                    lte: endDate,
                }
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });

        let totalCOGS = 0;
        const itemMetrics: Record<string, {
            product: any,
            soldQty: number,
            totalCostValue: number,
            currentStockQty: number
        }> = {};

        // 1a. Aggregate COGS per item and globally
        salesInvoices.forEach(invoice => {
            invoice.items.forEach(item => {
                const product = item.product;
                // Fallback approx: If cogsPerItem wasn't tracked, use fallback `product.cost`
                const unitCost = item.cogsPerItem
                    ? Number(item.cogsPerItem)
                    : Number(product.cost);

                const costValue = unitCost * item.quantity;
                totalCOGS += costValue;

                if (!itemMetrics[product.id]) {
                    itemMetrics[product.id] = {
                        product,
                        soldQty: 0,
                        totalCostValue: 0,
                        currentStockQty: 0
                    };
                }
                itemMetrics[product.id].soldQty += item.quantity;
                itemMetrics[product.id].totalCostValue += costValue;
            });
        });

        // 2. Fetch all products to get their true Current Stock amounts
        const allProducts = await prisma.product.findMany({
            include: {
                stockTransactions: true
            }
        });

        let totalCurrentInventoryValue = 0;

        allProducts.forEach(product => {
            // Calculate current absolute stock dynamically
            let currentQty = 0;
            product.stockTransactions.forEach(tx => {
                if (tx.transactionType === 'IN') currentQty += tx.quantity;
                else if (tx.transactionType === 'OUT') currentQty -= tx.quantity;
            });

            const currentItemValue = currentQty * Number(product.cost);

            // Only include products with valid value in averages
            if (currentQty > 0 || currentItemValue > 0) {
                totalCurrentInventoryValue += currentItemValue;
            }

            // Link current stock quantity back to our metric tracking array if it was sold or exists
            if (itemMetrics[product.id]) {
                itemMetrics[product.id].currentStockQty = Math.max(0, currentQty); // Normalize negative bugs
            } else if (currentQty > 0) {
                // If it's a stocked item but 0 sold, track it for "Slow Moving" ranks
                itemMetrics[product.id] = {
                    product,
                    soldQty: 0,
                    totalCostValue: 0,
                    currentStockQty: currentQty
                };
            }
        });

        // 3. Compute the Global Inventory Turnover Ratio
        // standard: COGS / Average Inventory. We approximate Average Inventory == Current Inventory 
        // for this quick overview, rather than walking massive daily historical ledgers.
        const averageInventoryValue = totalCurrentInventoryValue;
        const overallTurnoverRatio = averageInventoryValue > 0
            ? totalCOGS / averageInventoryValue
            : 0;

        // 4. Compute Per-Item Turnover & Rank them
        const itemTurnovers = Object.values(itemMetrics).map(metric => {
            const avgStock = metric.currentStockQty; // Approx average == current active

            let ratio = 0;
            if (avgStock > 0) {
                ratio = metric.soldQty / avgStock;
            } else if (metric.soldQty > 0 && avgStock <= 0) {
                ratio = 999; // Highly turned over (sold out completely)
            }

            // Categorize
            let status = 'Normal';
            if (ratio >= 2 || ratio === 999) status = 'Fast';
            else if (ratio < 0.5 && metric.currentStockQty > 0) status = 'Slow';

            return {
                id: metric.product.id,
                name: metric.product.name,
                sku: metric.product.sku,
                cost: Number(metric.product.cost),
                soldQty: metric.soldQty,
                currentStock: Math.max(0, metric.currentStockQty),
                turnoverRatio: ratio,
                status
            };
        });

        // Sort heavily turned-over logic top-down
        itemTurnovers.sort((a, b) => b.turnoverRatio - a.turnoverRatio);

        const fastMoving = itemTurnovers.filter(i => i.status === 'Fast').slice(0, 5);
        // Sort slow moving bottom-up (meaning the lowest turnover ratios > 0 first)
        const slowMoving = [...itemTurnovers]
            .filter(i => i.status === 'Slow')
            .sort((a, b) => a.turnoverRatio - b.turnoverRatio)
            .slice(0, 5);

        return NextResponse.json({
            periodDays: days,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            metrics: {
                totalCOGS,
                averageInventoryValue,
                overallTurnoverRatio: isFinite(overallTurnoverRatio) ? overallTurnoverRatio : 0,
            },
            rankings: {
                fastMoving,
                slowMoving,
                all: itemTurnovers
            }
        });

    } catch (error: any) {
        console.error("Failed to calculate inventory turnover:", error);
        return NextResponse.json(
            { error: 'Failed to calculate inventory turnover metrics', details: error?.message },
            { status: 500 }
        );
    }
}
