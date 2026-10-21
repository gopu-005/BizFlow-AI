import { NextRequest, NextResponse } from 'next/server';
import { processUserCommand } from '@/lib/ai/router';
import { resolveTenantBusinessId } from '@/lib/auth/rbac';

export async function POST(req: NextRequest) {
  try {
    const { message, businessId: requestedBusinessId } = await req.json();
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const { businessId: tenantId, errorResponse } = resolveTenantBusinessId(req, requestedBusinessId);
    if (errorResponse) return errorResponse;

    const response = processUserCommand(message, tenantId);

    return NextResponse.json(response);
  } catch (err: any) {
    console.error('Chat API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
