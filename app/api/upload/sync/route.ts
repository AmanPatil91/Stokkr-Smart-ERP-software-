import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const { mappedData } = await request.json();

        if (!Array.isArray(mappedData) || mappedData.length === 0) {
            return NextResponse.json({ error: 'No validated data received' }, { status: 400 });
        }

        let productCount = 0;
        let partyCount = 0;
        let inventoryTransactions = 0;
        const skippedRows: string[] = [];

        // Using a sequential approach as we need the unique product IDs for inventory linking
        for (const raw of mappedData) {
            try {
                const row = JSON.parse(raw); // Expand stringified raw snapshot sent back from UI

                // 1. Party Upsert Logic
                // We look for any column broadly hinting at a supplier or customer name
                const rowKeys = Object.keys(row).map(k => k.toLowerCase());
                const rawKeys = Object.keys(row);
                let partyName = null;
                let partyType = row.importType === 'sales' ? 'CUSTOMER' : 'SUPPLIER';

                for (const possible of ['party', 'customer', 'supplier', 'vendor', 'name']) {
                    const idx = rowKeys.findIndex(k => k.includes(possible) && !k.includes('item'));
                    if (idx !== -1) {
                        partyName = String(row[rawKeys[idx]]).trim();
                        break;
                    }
                }

                // Only create/link party if it was found
                let activeParty = null;
                if (partyName && partyName !== 'null' && partyName !== 'undefined') {
                    activeParty = await prisma.party.upsert({
                        where: { id: `party_${partyName.replace(/\s+/g, '').toLowerCase()}` }, // simplistic natural key
                        update: {},
                        create: {
                            id: `party_${partyName.replace(/\s+/g, '').toLowerCase()}`,
                            name: partyName,
                            partyType: partyType
                        }
                    });
                    partyCount++;
                }

                // 2. Product Upsert Logic
                if (!row.itemName) {
                    skippedRows.push("Missing Item Name");
                    continue;
                }

                const safeBrand = String(row.brand || 'UNK');
                const safeItemName = String(row.itemName);
                const skuHash = `${safeBrand.substring(0, 3).toUpperCase()}-${safeItemName.replace(/\s+/g, '').substring(0, 8).toUpperCase()}`;

                // Ensure robust default creation parameters
                const productUpsert = await prisma.product.upsert({
                    where: { sku: skuHash },
                    update: {
                        mrp: row.mrp || 0,
                        brand: safeBrand === 'UNK' ? null : safeBrand,
                        gstRate: row.gstPercent || 0,
                    },
                    create: {
                        name: safeItemName,
                        sku: skuHash,
                        brand: safeBrand === 'UNK' ? null : safeBrand,
                        mrp: row.mrp || 0,
                        gstRate: row.gstPercent || 0,
                        price: row.mrp || 0, // Fallback base price to MRP if absent
                        cost: (row.mrp || 0) * 0.7, // Arbitrary 30% margin fallback for cost
                        category: safeBrand.includes('Parle') ? 'Biscuits & Snacks' :
                            safeBrand.includes('ITC') ? 'Staples & Confectionery' : 'General'
                    }
                });
                productCount++;

                // 3. Inventory Stock Transactions Link
                // Determine stock flow (Purchase = IN, Sales = OUT)
                const quantity = parseFloat(row.quantity) || 0;

                if (quantity > 0) {
                    const tType = row.importType === 'sales' ? 'OUT' : 'IN';

                    // Note: Since StockTransactions normally require a batch in strict mode but the schema 
                    // allows `batchId String?`, we safely append raw system adjustments.
                    await prisma.stockTransaction.create({
                        data: {
                            productId: productUpsert.id,
                            transactionType: tType,
                            quantity: quantity,
                            notes: `Auto-Sync System Import (${row.importType} record)`
                        }
                    });
                    inventoryTransactions++;
                }

            } catch (rowError: any) {
                console.warn("Row Sync Skipped:", rowError.message);
                skippedRows.push(`Failed constraint: ${rowError.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            summary: {
                productsCreatedOrUpdated: productCount,
                partiesHandled: partyCount,
                inventoryLedgersRecorded: inventoryTransactions,
                skippedLines: skippedRows.length
            }
        });

    } catch (error: any) {
        console.error('Database Sync Error:', error);
        return NextResponse.json({ error: 'Failed to process sync mappings.' }, { status: 500 });
    }
}
