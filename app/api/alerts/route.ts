/**
 * API Route: /api/alerts
 * Returns all active inventory alerts (expiring batches and low stock products)
 * Computed dynamically at request time using live system datetime
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllAlerts } from '@/lib/alertsService';

export async function GET(request: NextRequest) {
  try {
    const alerts = await getAllAlerts();

    return NextResponse.json(alerts, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}
