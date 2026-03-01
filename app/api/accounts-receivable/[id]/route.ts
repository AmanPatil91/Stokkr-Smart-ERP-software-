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

        return NextResponse.json(receivable)
    } catch (error) {
        console.error('Failed to fetch accounts receivable:', error)
        return NextResponse.json(
            { error: 'Failed to fetch accounts receivable' },
            { status: 500 }
        )
    }
}

// PATCH - Update receivable amount
export async function PATCH(
    request: Request,
    context: any
) {
    try {
        const id = context.params.id
        const body = await request.json()
        const { receivableAmount } = body

        if (typeof receivableAmount !== 'number' || receivableAmount < 0) {
            return NextResponse.json(
                { error: 'Receivable amount must be a non-negative number' },
                { status: 400 }
            )
        }

        const receivable = await prisma.accountsReceivable.findUnique({
            where: { id },
        })

        if (!receivable) {
            return NextResponse.json(
                { error: 'Accounts receivable not found' },
                { status: 404 }
            )
        }

        const paymentStatus = receivableAmount > 0 ? 'PENDING' : 'COMPLETED'

        const updated = await prisma.accountsReceivable.update({
            where: { id },
            data: {
                receivableAmount,
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
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Failed to update accounts receivable:', error)
        return NextResponse.json(
            { error: 'Failed to update accounts receivable' },
            { status: 500 }
        )
    }
}
