import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET single accounts receivable record
export async function GET(
    request: Request,
    context: any
) {
    try {
        const id = context.params.id

        const receivable = await prisma.accountsReceivable.findUnique({
            where: { id },
            include: {
                invoice: {
                    include: {
                        party: true,
                        items: true,
                    },
                },
            },
        })

        if (!receivable) {
            return NextResponse.json(
                { error: 'Accounts receivable not found' },
                { status: 404 }
            )
        }

        // Fetch related ledger transactions (payments)
        const payments = await prisma.ledgerTransaction.findMany({
            where: {
                invoiceId: receivable.invoice.id,
                transactionType: 'PAYMENT_RECEIVED'
            },
            orderBy: {
                date: 'desc'
            }
        });

        return NextResponse.json({ ...receivable, payments })
    } catch (error) {
        console.error('Failed to fetch accounts receivable:', error)
        return NextResponse.json(
            { error: 'Failed to fetch accounts receivable' },
            { status: 500 }
        )
    }
}

// PATCH - Process a payment
export async function PATCH(
    request: Request,
    context: any
) {
    try {
        const id = context.params.id
        const body = await request.json()
        const { paymentAmount, paymentMode, paymentDate, referenceNumber, notes } = body

        if (typeof paymentAmount !== 'number' || paymentAmount <= 0) {
            return NextResponse.json(
                { error: 'Payment amount must be a positive number' },
                { status: 400 }
            )
        }

        const receivable = await prisma.accountsReceivable.findUnique({
            where: { id },
            include: { invoice: true }
        })

        if (!receivable) {
            return NextResponse.json(
                { error: 'Accounts receivable not found' },
                { status: 404 }
            )
        }

        const currentReceivableAmount = Number(receivable.receivableAmount)
        if (paymentAmount > currentReceivableAmount) {
            return NextResponse.json(
                { error: 'Payment amount cannot exceed remaining balance' },
                { status: 400 }
            )
        }

        const newReceivableAmount = currentReceivableAmount - paymentAmount
        let paymentStatus = 'PENDING'
        if (newReceivableAmount === 0) {
            paymentStatus = 'COMPLETED'
        } else if (newReceivableAmount < Number(receivable.totalAmount)) {
            paymentStatus = 'PARTIAL'
        }

        // Use Prisma transaction to ensure both operations succeed or fail together
        const [updatedReceivable] = await prisma.$transaction([
            prisma.accountsReceivable.update({
                where: { id },
                data: {
                    receivableAmount: newReceivableAmount,
                    paymentStatus,
                },
                include: {
                    invoice: {
                        include: {
                            party: true,
                            items: true,
                        },
                    },
                },
            }),
            prisma.ledgerTransaction.create({
                data: {
                    partyId: receivable.invoice.partyId,
                    transactionType: 'PAYMENT_RECEIVED',
                    amount: paymentAmount,
                    date: paymentDate ? new Date(paymentDate) : new Date(),
                    description: notes || `Payment received for Invoice #${receivable.invoice.invoiceNumber}`,
                    paymentMode: paymentMode || 'CASH',
                    referenceNumber: referenceNumber || null,
                    invoiceId: receivable.invoice.id,
                }
            })
        ])

        return NextResponse.json(updatedReceivable)
    } catch (error) {
        console.error('Failed to process payment:', error)
        return NextResponse.json(
            { error: 'Failed to process payment' },
            { status: 500 }
        )
    }
}
