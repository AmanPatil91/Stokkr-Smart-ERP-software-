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

    // Use a transaction for ALL operations, including reads, to maintain atomicity and isolated consistency.
    await prisma.$transaction(async (tx) => {
      // --- STRICT INVENTORY VALIDATION ---
      const verificationProductIds = items.map((i: any) => i.productId);

      // Fetch products to calculate proper tax rates and get names for errors
      const products = await tx.product.findMany({
        where: { id: { in: verificationProductIds } }
      });
      const productMap = new Map(products.map((p: any) => [p.id, p]));

      // Calculate the current available stock for each requested product using StockTransactions
      const stockTransactions = await tx.stockTransaction.findMany({
        where: { productId: { in: verificationProductIds } },
        select: { productId: true, quantity: true, transactionType: true }
      });

      const stockMap = new Map<string, number>();
      stockTransactions.forEach(stx => {
        const current = stockMap.get(stx.productId) || 0;
        stockMap.set(stx.productId, stx.transactionType === 'IN' ? current + stx.quantity : current - stx.quantity);
      });

      // Verify all requested quantities against available stock inside the transaction
      for (const item of items) {
        const availableStock = stockMap.get(item.productId) || 0;
        if (item.quantity > availableStock) {
          const productName = productMap.get(item.productId)?.name || 'Unknown Item';
          // Throwing an error here automatically triggers a rollback of the whole transaction
          throw new Error(`Insufficient stock for ${productName}. Available: ${availableStock} units, Requested: ${item.quantity} units.|||400`);
        }
      }
      // --- END STRICT INVENTORY VALIDATION ---

      let calculatedSubTotal = 0;
      let calculatedTaxAmount = 0;

      // Calculate COGS using tx instance
      const itemsWithCogs = await Promise.all(
        items.map(async (item: any) => {
          const cogsResult = await calculateFifoCogs(item.productId, item.quantity, tx);

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

      // Reduce batch quantities based on FIFO consumption inside the atomic tx
      for (const item of itemsWithCogs) {
        await reduceBatchQuantities(item.batchUsage, tx);
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
  } catch (error: any) {
    console.error('API Error (Transaction Rolled Back):', error);

    // Check if it's our custom validation error
    if (error.message && error.message.includes('|||400')) {
      const displayMessage = error.message.split('|||400')[0];
      return NextResponse.json({ error: displayMessage }, { status: 400 });
    }

    return NextResponse.json({ error: 'Transaction failed. No changes were saved.' }, { status: 500 });
  }
}