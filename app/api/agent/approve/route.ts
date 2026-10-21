import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { AgentExecutionEngine } from '@/lib/agent/engine';
import { resolveTenantBusinessId } from '@/lib/auth/rbac';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      businessId: requestedBusinessId,
      runId,
      approvalId,
      status, // 'approved' | 'rejected'
      reason,
    } = body;
    const { businessId, errorResponse } = resolveTenantBusinessId(req, requestedBusinessId);
    if (errorResponse) return errorResponse;

    if (!runId || !approvalId || !status) {
      return NextResponse.json({ error: 'runId, approvalId, and status are required.' }, { status: 400 });
    }

    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ error: 'status must be "approved" or "rejected".' }, { status: 400 });
    }

    // 1. Update database approval record
    const response = db.respondToApproval(businessId, approvalId, status, reason);
    if (response.error) {
      return NextResponse.json({ error: response.error }, { status: 400 });
    }

    // 2. Resume execution through the engine
    const updatedRun = await AgentExecutionEngine.resumeRunAfterApproval(businessId, runId, approvalId);

    return NextResponse.json({
      success: true,
      status,
      run: updatedRun,
    });
  } catch (err: any) {
    console.error('Approval handling failed:', err);
    return NextResponse.json({ error: err.message || 'Approval action failed' }, { status: 500 });
  }
}
