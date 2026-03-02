import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const periodDays = parseInt(searchParams.get('periodDays') || '30', 10);
        const leadTimeDays = 15;

        // Calculate dates
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays);

        // 1. Fetch all active products
        const products = await prisma.product.findMany({
            select: {
                id: true,
                name: true,
                sku: true,
                cost: true,
            },
            orderBy: { name: 'asc' }
        });

        if (!products.length) {
            return NextResponse.json({ summary: { totalNeedsReorder: 0 }, recommendations: [] });
        }

        // 2. Fetch Sales History (InvoiceItems) for the period to calculate Velocity
        const invoiceItems = await prisma.invoiceItem.findMany({
            where: {
                invoice: {
                    invoiceType: 'SALES',
                    date: { gte: startDate, lte: endDate },
                },
            },
            select: {
                productId: true,
                quantity: true,
            },
        });

        // 3. Fetch Current Stock levels (Aggregating StockTransactions)
        const stockTransactions = await prisma.stockTransaction.findMany({
            select: {
                productId: true,
                quantity: true,
                transactionType: true,
            },
        });

        // --- Data Processing Map ---
        const salesMap = new Map<string, number>();
        invoiceItems.forEach(item => {
            salesMap.set(item.productId, (salesMap.get(item.productId) || 0) + item.quantity);
        });

        const stockMap = new Map<string, number>();
        stockTransactions.forEach(tx => {
            const currentStock = stockMap.get(tx.productId) || 0;
            stockMap.set(tx.productId, tx.transactionType === 'IN' ? currentStock + tx.quantity : currentStock - tx.quantity);
        });

        // --- Calculate Reorder Recommendations ---
        const recommendations = products.map(product => {
            const currentStock = stockMap.get(product.id) || 0;
            const totalSold = salesMap.get(product.id) || 0;

            // 1) Sales Velocity
            const averageDailySales = Number((totalSold / periodDays).toFixed(2));

            // Skip products with absolutely zero sales (no historical basis for demand yet)
            if (averageDailySales <= 0) {
                return null;
            }

            // 2) Lead Time Demand (Expected demand before supplier delivers)
            const leadTimeDemand = Math.ceil(averageDailySales * leadTimeDays);

            // 3) Reorder Condition
            const needsReorder = currentStock <= leadTimeDemand;
            if (!needsReorder) return null; // Only return items ACTUALLY needing reorder

            // 4) Recommended Reorder Quantity (adding +10% safety buffer)
            // If stock is below zero, treat it as negative deficit adding to our required order
            const deficit = leadTimeDemand - currentStock;
            const suggestedReorderQuantity = Math.ceil(deficit * 1.10);

            // 5) Priority Classification
            let priorityStatus = 'Moderate';
            if (currentStock <= 0 || currentStock < (averageDailySales * 3)) {
                priorityStatus = 'Critical';
            }

            return {
                id: product.id,
                name: product.name,
                sku: product.sku,
                currentStock,
                averageDailySales,
                leadTimeDemand,
                suggestedReorderQuantity: Math.max(0, suggestedReorderQuantity), // Ensure non-negative
                priorityStatus
            };
        }).filter(Boolean); // Drop nulls

        // Sort by Priority (Critical first) then by Reorder Quantity
        recommendations.sort((a, b) => {
            if (a!.priorityStatus === 'Critical' && b!.priorityStatus !== 'Critical') return -1;
            if (b!.priorityStatus === 'Critical' && a!.priorityStatus !== 'Critical') return 1;
            return b!.suggestedReorderQuantity - a!.suggestedReorderQuantity;
        });

        return NextResponse.json({
            summary: {
                totalNeedsReorder: recommendations.length,
                periodDays,
                leadTimeDays
            },
            recommendations
        });

    } catch (error) {
        console.error('Inventory Reorder API Error:', error);
        return NextResponse.json({ error: 'Failed to calculate reorder recommendations' }, { status: 500 });
    }
}
