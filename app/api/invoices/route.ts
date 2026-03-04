import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateFifoCogs, reduceBatchQuantities } from '@/lib/cogsCalculator';
import { requireApiAuth } from '@/utils/supabase/api-auth';

export async function POST(request: Request) {
  const { authorized, response } = await requireApiAuth(['sales', 'admin']);
  if (!authorized) return response;

  try {
    const body = await request.json();
    const { partyId, items, isInterState, paymentMode } = body;

    // Fetch products to calculate proper tax rates
    const productIds = items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });
    const productMap = new Map(products.map((p: any) => [p.id, p]));

    let calculatedSubTotal = 0;
    let calculatedTaxAmount = 0;

    // Calculate COGS for each item using FIFO method
    const itemsWithCogs = await Promise.all(
      items.map(async (item: any) => {
        const cogsResult = await calculateFifoCogs(item.productId, item.quantity);

        const subtotal = item.quantity * item.pricePerItem;
        const product = productMap.get(item.productId);
        const gstRate = product?.gstRate ? Number(product.gstRate) : 0;
        const itemTaxAmount = (subtotal * gstRate) / 100;

        let cgstAmount = 0;
        let sgstAmount = 0;
        let igstAmount = 0;

        if (gstRate > 0) {
          if (isInterState) {
            igstAmount = itemTaxAmount;
          } else {
            cgstAmount = itemTaxAmount / 2;
            sgstAmount = itemTaxAmount / 2;
          }
        }

        calculatedSubTotal += subtotal;
        calculatedTaxAmount += itemTaxAmount;

        return {
          ...item,
          subtotal,
          gstRate,
          cgstAmount,
          sgstAmount,
          igstAmount,
          taxAmount: itemTaxAmount,
          cogsPerItem: cogsResult.cogsPerItem,
          cogsTotal: cogsResult.cogsTotal,
          batchUsage: cogsResult.batchUsage,
        };
      })
    );

    // Total COGS for the invoice
    const totalCogs = itemsWithCogs.reduce((sum, item) => sum + item.cogsTotal, 0);

    // --- STRICT INVENTORY VALIDATION ---
    // Calculate the current available stock for each requested product using StockTransactions
    const verificationProductIds = items.map((i: any) => i.productId);
    const stockTransactions = await prisma.stockTransaction.findMany({
      where: { productId: { in: verificationProductIds } },
      select: { productId: true, quantity: true, transactionType: true }
    });

    const stockMap = new Map<string, number>();
    stockTransactions.forEach(tx => {
      const current = stockMap.get(tx.productId) || 0;
      stockMap.set(tx.productId, tx.transactionType === 'IN' ? current + tx.quantity : current - tx.quantity);
    });

    // Verify all requested quantities against available stock
    for (const item of items) {
      const availableStock = stockMap.get(item.productId) || 0;
      if (item.quantity > availableStock) {
        // Fetch product name for a clearer error message
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        const productName = product?.name || 'Unknown Item';

        return NextResponse.json(
          { error: `Insufficient stock for ${productName}. Available: ${availableStock} units, Requested: ${item.quantity} units.` },
          { status: 400 }
        );
      }
    }
    // --- END STRICT INVENTORY VALIDATION ---

    await prisma.$transaction(async (tx) => {
      const newInvoice = await tx.invoice.create({
        data: {
          invoiceNumber: `INV-${Date.now()}`,
          invoiceType: 'SALES',
          partyId: partyId,
          subTotalAmount: calculatedSubTotal,
          taxAmount: calculatedTaxAmount,
          totalAmount: calculatedSubTotal + calculatedTaxAmount,
          isInterState: isInterState || false,
          paymentMode: paymentMode || 'CASH',
        },
      });

      // Create invoice items with COGS data
      await tx.invoiceItem.createMany({
        data: itemsWithCogs.map((item: any) => ({
          invoiceId: newInvoice.id,
          productId: item.productId,
          quantity: item.quantity,
          pricePerItem: item.pricePerItem,
          subtotal: item.subtotal,
          gstRate: item.gstRate,
          cgstAmount: item.cgstAmount,
          sgstAmount: item.sgstAmount,
          igstAmount: item.igstAmount,
          taxAmount: item.taxAmount,
          cogsPerItem: item.cogsPerItem,
          cogsTotal: item.cogsTotal,
        })),
      });

      // Reduce batch quantities based on FIFO consumption
      for (const item of itemsWithCogs) {
        await reduceBatchQuantities(item.batchUsage);
      }

      await tx.stockTransaction.createMany({
        data: itemsWithCogs.map((item: any) => ({
          productId: item.productId,
          transactionType: 'OUT',
          quantity: item.quantity,
          notes: `Sales Invoice #${newInvoice.invoiceNumber}`,
        })),
      });

      await tx.ledgerTransaction.create({
        data: {
          partyId: partyId,
          transactionType: 'DEBIT',
          amount: calculatedSubTotal + calculatedTaxAmount,
          description: `Sales Invoice #${newInvoice.invoiceNumber}`,
        },
      });

      // ACCOUNTS RECEIVABLE: Create AR record ONLY if payment is not fully Cash upfront.
      if (paymentMode && paymentMode !== 'CASH') {
        await tx.accountsReceivable.create({
          data: {
            invoiceId: newInvoice.id,
            totalAmount: calculatedSubTotal + calculatedTaxAmount,
            receivableAmount: calculatedSubTotal + calculatedTaxAmount, // Outstanding
            paymentStatus: 'PENDING',
          },
        });
      }
    });

    return NextResponse.json({ message: 'Invoice created successfully' }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}