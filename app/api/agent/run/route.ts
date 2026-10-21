import { NextRequest, NextResponse } from 'next/server';
import { AgentExecutionEngine } from '@/lib/agent/engine';
import { AgentType, AutonomyMode } from '@/types/agent';
import { requireAgenticAccess } from '@/lib/auth/rbac';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      businessId: requestedBusinessId,
      agentType = 'general',
      prompt,
      autonomyMode = 'guarded_autopilot',
      documentId,
      initialContext,
    } = body;
    const { businessId, errorResponse } = requireAgenticAccess(req, requestedBusinessId);
    if (errorResponse) return errorResponse;

    if (!prompt && !documentId) {
      return NextResponse.json({ error: 'Prompt or documentId is required.' }, { status: 400 });
    }

    const run = await AgentExecutionEngine.startRun({
      businessId,
      agentType: agentType as AgentType,
      prompt: prompt || 'Analyze document and prepare transaction draft.',
      autonomyMode: autonomyMode as AutonomyMode,
      documentId,
      initialContext,
    });

    return NextResponse.json({ success: true, run });
  } catch (err: any) {
    console.error('Agent run failed:', err);
    return NextResponse.json({ error: err.message || 'Agent run execution failed' }, { status: 500 });
  }
}
