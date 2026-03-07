import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiAuth } from '@/utils/supabase/api-auth';

export async function POST(request: Request) {
  const { authorized, response } = await requireApiAuth(['manager', 'admin']);
  if (!authorized) return response;

  try {
    const {
      name, description, hsnCode, category, gstRate, cgstRate, sgstRate, igstRate,
      price, cost, expiryAlertDays, lowStockAlertQty
    } = await request.json();

    // Auto-generate Product ID (SKU)
    // Find the latest product that starts with PROD to determine the next number
    const lastProduct = await prisma.product.findFirst({
      where: {
        sku: {
          startsWith: 'PROD',
        },
      },
      orderBy: {
        sku: 'desc',
      },
    });

    let newSku = 'PROD001';
    if (lastProduct && lastProduct.sku) {
      // Extract the numeric part, assuming format PRODXXX
      const match = lastProduct.sku.match(/^PROD(\d+)$/);
      if (match && match[1]) {
        const nextNum = parseInt(match[1], 10) + 1;
        newSku = `PROD${nextNum.toString().padStart(3, '0')}`;
      }
    }

    const newProduct = await prisma.product.create({
      data: {
        name,
        sku: newSku,
        description,
        hsnCode,
        category,
        gstRate,
        cgstRate,
        sgstRate,
        igstRate,
        price,
        cost,
        expiryAlertDays: expiryAlertDays || 7,
        lowStockAlertQty: lowStockAlertQty || 10,
      },
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error('Failed to create new product:', error);
    return NextResponse.json({ error: 'Failed to create new product.' }, { status: 500 });
  }
}

export async function GET() {
  const { authorized, response } = await requireApiAuth(); // Require auth for reading
  if (!authorized) return response;

  try {
    const products = await prisma.product.findMany({
      include: {
        batches: {
          orderBy: { expiryDate: 'asc' },
        },
      },
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json({ error: 'Failed to fetch products.' }, { status: 500 });
  }
}