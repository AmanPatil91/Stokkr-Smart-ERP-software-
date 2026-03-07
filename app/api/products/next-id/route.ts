import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiAuth } from '@/utils/supabase/api-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    const { authorized, response } = await requireApiAuth(['manager', 'admin']);
    if (!authorized) return response;

    try {
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

        let nextSku = 'PROD001';
        if (lastProduct && lastProduct.sku) {
            const match = lastProduct.sku.match(/^PROD(\d+)$/);
            if (match && match[1]) {
                const nextNum = parseInt(match[1], 10) + 1;
                nextSku = `PROD${nextNum.toString().padStart(3, '0')}`;
            }
        }

        return NextResponse.json({ nextId: nextSku });
    } catch (error) {
        console.error('Failed to fetch next product ID:', error);
        return NextResponse.json({ error: 'Failed to fetch next product ID.' }, { status: 500 });
    }
}
