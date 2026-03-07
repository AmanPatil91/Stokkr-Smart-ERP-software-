import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiAuth } from '@/utils/supabase/api-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    const { authorized, response } = await requireApiAuth();
    if (!authorized) return response;

    try {
        const lastBatch = await prisma.batch.findFirst({
            where: {
                batchNumber: {
                    startsWith: 'BATCH',
                },
            },
            orderBy: {
                batchNumber: 'desc',
            },
        });

        let nextBatchNo = 'BATCH001';
        if (lastBatch && lastBatch.batchNumber) {
            const match = lastBatch.batchNumber.match(/^BATCH(\d+)$/);
            if (match && match[1]) {
                const nextNum = parseInt(match[1], 10) + 1;
                nextBatchNo = `BATCH${nextNum.toString().padStart(3, '0')}`;
            }
        }

        return NextResponse.json({ nextId: nextBatchNo });
    } catch (error) {
        console.error('Failed to fetch next batch ID:', error);
        return NextResponse.json({ error: 'Failed to fetch next batch ID.' }, { status: 500 });
    }
}
