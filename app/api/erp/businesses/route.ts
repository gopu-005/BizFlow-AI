import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';

export async function GET(req: NextRequest) {
  try {
    const businesses = db.getBusinesses();
    return NextResponse.json({ businesses });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch businesses' }, { status: 500 });
  }
}
