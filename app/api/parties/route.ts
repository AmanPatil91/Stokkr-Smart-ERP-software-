import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { name, partyType, gstin } = await request.json();

    const newParty = await prisma.party.create({
      data: {
        name,
        partyType,
        gstin,
      },
    });

    return NextResponse.json(newParty, { status: 201 });
  } catch (error) {
    console.error('Failed to create party:', error);
    return NextResponse.json({ error: 'Failed to create party.' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const parties = await prisma.party.findMany();
    return NextResponse.json(parties);
  } catch (error) {
    console.error('Failed to fetch parties:', error);
    return NextResponse.json({ error: 'Failed to fetch parties.' }, { status: 500 });
  }
}