/**
 * Alert Calculation Service
 * Computes inventory alerts dynamically at request time
 * No cron jobs or background workers
 */

import { prisma } from '@/lib/prisma';

export interface ExpiringBatch {
  id: string;
  batchNumber: string;
  productName: string;
  productId: string;
  expiryDate: Date;
  quantity: number;
  remainingDays: number;
  status: 'EXPIRING_SOON' | 'EXPIRED';
}

export interface LowStockProduct {
  id: string;
  name: string;
  totalStock: number;
  alertThreshold: number;
  remainingBatches: number;
}

/**
 * Calculate remaining days until batch expiry
 */
export function calculateRemainingDays(expiryDate: Date): number {
  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Get all expiring soon batches
 * Uses live system datetime for calculations
 */
export async function getExpiringBatches(): Promise<ExpiringBatch[]> {
  const products = await prisma.product.findMany({
    include: {
      batches: {
        orderBy: {
          expiryDate: 'asc',
        },
      },
    },
  });

  const expiringBatches: ExpiringBatch[] = [];

  products.forEach((product: any) => {
    product.batches.forEach((batch: any) => {
      const remainingDays = calculateRemainingDays(batch.expiryDate);

      // Alert if batch expires within alertDays OR already expired
      if (remainingDays <= product.expiryAlertDays) {
        expiringBatches.push({
          id: batch.id,
          batchNumber: batch.batchNumber,
          productName: product.name,
          productId: product.id,
          expiryDate: batch.expiryDate,
          quantity: batch.quantity,
          remainingDays,
          status: remainingDays < 0 ? 'EXPIRED' : 'EXPIRING_SOON',
        });
      }
    });
  });

  return expiringBatches.sort((a, b) => a.remainingDays - b.remainingDays);
}

/**
 * Get all low stock products
 * Calculates total stock across all batches
 */
export async function getLowStockProducts(): Promise<LowStockProduct[]> {
  const products = await prisma.product.findMany({
    include: {
      batches: true,
    },
  });

  const lowStockProducts: LowStockProduct[] = [];

  products.forEach((product: any) => {
    const totalStock = product.batches.reduce((sum: number, batch: any) => sum + batch.quantity, 0);

    // Alert if total stock is at or below alert threshold
    if (totalStock <= product.lowStockAlertQty) {
      lowStockProducts.push({
        id: product.id,
        name: product.name,
        totalStock,
        alertThreshold: product.lowStockAlertQty,
        remainingBatches: product.batches.length,
      });
    }
  });

  return lowStockProducts.sort((a, b) => a.totalStock - b.totalStock);
}

/**
 * Get all active alerts (both expiring and low stock)
 */
export async function getAllAlerts() {
  const [expiringBatches, lowStockProducts] = await Promise.all([
    getExpiringBatches(),
    getLowStockProducts(),
  ]);

  return {
    expiringBatches,
    lowStockProducts,
    totalAlerts: expiringBatches.length + lowStockProducts.length,
  };
}
