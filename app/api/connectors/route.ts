import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { resolveTenantBusinessId } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestedBusinessId = searchParams.get('businessId');
  const { businessId, errorResponse } = resolveTenantBusinessId(req, requestedBusinessId);
  if (errorResponse) return errorResponse;

  const connectors = db.getConnectors(businessId);
  return NextResponse.json({ connectors });
}

export async function POST(req: NextRequest) {
  try {
    const { type, action, config } = await req.json();

    if (action === 'connect') {
      const updated = db.updateConnector(type, {
        connected: true,
        statusText: 'Connected',
        lastSynced: 'Just now',
        details: { ...config, configured: true },
      });
      return NextResponse.json({ success: true, connector: updated });
    }

    if (action === 'disconnect') {
      const updated = db.updateConnector(type, {
        connected: false,
        statusText: 'Setup required',
        details: { configured: false },
      });
      return NextResponse.json({ success: true, connector: updated });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Connector error' }, { status: 500 });
  }
}
