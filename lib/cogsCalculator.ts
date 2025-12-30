import { prisma } from '@/lib/prisma';

/**
 * FIFO (First-In-First-Out) COGS Calculator
 * 
 * This module calculates the Cost of Goods Sold using FIFO method.
 * When items are sold, the oldest available batches are consumed first.
 * 
 * Logic:
 * 1. For a given product and quantity to sell
 * 2. Fetch all available batches ordered by creation date (oldest first)
 * 3. Consume quantity from oldest batch until satisfied or batch is empty
 * 4. Calculate COGS = sum of (quantity from each batch × batch cost per item)
 * 5. Reduce batch quantities accordingly
 * 6. Return calculated COGS per item and total COGS
 */

export interface CogsCalculationResult {
  cogsPerItem: number;
  cogsTotal: number;
  batchUsage: Array<{
    batchId: string;
    quantityUsed: number;
    costPerItem: number;
  }>;
}

/**
 * Calculate COGS using FIFO for a sale item
 * @param productId - The product being sold
 * @param quantityToSell - Number of units sold
 * @returns COGS calculation result with per-item and total costs
 */
export async function calculateFifoCogs(
  productId: string,
  quantityToSell: number
): Promise<CogsCalculationResult> {
  // Fetch all available batches for this product, ordered by creation date (oldest first)
  const batches = await prisma.batch.findMany({
    where: { productId },
    orderBy: { id: 'asc' }, // Assuming ID is created in insertion order
    select: {
      id: true,
      quantity: true,
      costPerItem: true,
    },
  });

  const batchUsage: CogsCalculationResult['batchUsage'] = [];
  let remainingQuantity = quantityToSell;
  let totalCogsAmount = 0;

  // Iterate through batches (FIFO - oldest first)
  for (const batch of batches) {
    if (remainingQuantity <= 0) break;

    // Determine how much we take from this batch
    const quantityFromBatch = Math.min(batch.quantity, remainingQuantity);
    const cogsFromBatch = quantityFromBatch * Number(batch.costPerItem);

    batchUsage.push({
      batchId: batch.id,
      quantityUsed: quantityFromBatch,
      costPerItem: Number(batch.costPerItem),
    });

    totalCogsAmount += cogsFromBatch;
    remainingQuantity -= quantityFromBatch;
  }

  // If we couldn't find enough inventory, still calculate COGS with available batches
  // This handles overselling edge case
  const cogsPerItem = quantityToSell > 0 ? totalCogsAmount / quantityToSell : 0;

  return {
    cogsPerItem: Number(cogsPerItem.toFixed(2)),
    cogsTotal: Number(totalCogsAmount.toFixed(2)),
    batchUsage,
  };
}

/**
 * Reduce batch quantities after COGS calculation (when invoice is finalized)
 * @param batchUsage - Array of batch usage from COGS calculation
 */
export async function reduceBatchQuantities(
  batchUsage: Array<{ batchId: string; quantityUsed: number }>
) {
  for (const usage of batchUsage) {
    // Reduce the batch quantity by the amount used
    await prisma.batch.update({
      where: { id: usage.batchId },
      data: {
        quantity: {
          decrement: usage.quantityUsed,
        },
      },
    });
  }
}
