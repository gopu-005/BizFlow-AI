import { NextRequest, NextResponse } from 'next/server';
import { processUserCommand } from '@/lib/ai/router';

export async function POST(req: NextRequest) {
  try {
    const { message, businessId } = await req.json();
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const tenantId = businessId || 'biz_karthik_textiles';
    const response = processUserCommand(message, tenantId);

    return NextResponse.json(response);
  } catch (err: any) {
    console.error('Chat API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
