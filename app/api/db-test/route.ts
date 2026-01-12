import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const result = await prisma.$queryRaw`SELECT 1 as ok`
    return NextResponse.json({ success: true, result })
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message, name: e.name },
      { status: 500 }
    )
  }
}
