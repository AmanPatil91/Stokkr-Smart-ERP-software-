import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET single accounts payable record
export async function GET(
  request: Request,
  context: any
) {
  try {
    const id = context.params.id

    const payable = await prisma.accountsPayable.findUnique({
      where: { id },
      include: {
        batch: {
          include: {
            product: true,
          },
        },
      },
    })

    if (!payable) {
      return NextResponse.json(
        { error: 'Accounts payable not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(payable)
  } catch (error) {
    console.error('Failed to fetch accounts payable:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts payable' },
      { status: 500 }
    )
  }
}

// PATCH - Update payable amount
export async function PATCH(
  request: Request,
  context: any
) {
  try {
    const id = context.params.id
    const body = await request.json()
    const { payableAmount } = body

    if (typeof payableAmount !== 'number' || payableAmount < 0) {
      return NextResponse.json(
        { error: 'Payable amount must be a non-negative number' },
        { status: 400 }
      )
    }

    const payable = await prisma.accountsPayable.findUnique({
      where: { id },
    })

    if (!payable) {
      return NextResponse.json(
        { error: 'Accounts payable not found' },
        { status: 404 }
      )
    }

    const paymentStatus = payableAmount > 0 ? 'PENDING' : 'COMPLETED'

    const updated = await prisma.accountsPayable.update({
      where: { id },
      data: {
        payableAmount,
        paymentStatus,
      },
      include: {
        batch: {
          include: {
            product: true,
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update accounts payable:', error)
    return NextResponse.json(
      { error: 'Failed to update accounts payable' },
      { status: 500 }
    )
  }
}
