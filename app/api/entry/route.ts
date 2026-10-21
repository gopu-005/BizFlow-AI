import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { AGENT_TOOLS } from '@/lib/agent/tools';
import { requireAgenticAccess } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBusinessId = searchParams.get('businessId');
    const { businessId, errorResponse } = requireAgenticAccess(req, requestedBusinessId);
    if (errorResponse) return errorResponse;

    const documents = db.getDocuments(businessId);
    const drafts = db.getTransactionDrafts(businessId);

    return NextResponse.json({
      success: true,
      documents,
      drafts,
      stats: {
        totalDocuments: documents.length,
        pendingDrafts: drafts.filter((d) => d.status === 'draft').length,
        committedDrafts: drafts.filter((d) => d.status === 'committed').length,
      },
    });
  } catch (err: any) {
    console.error('Failed to get entry data:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch entry records' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId: requestedBusinessId, action, payload } = body;
    const { businessId, errorResponse } = requireAgenticAccess(req, requestedBusinessId);
    if (errorResponse) return errorResponse;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    // 1. Extract document content & create draft
    if (action === 'extract') {
      const result = await AGENT_TOOLS.extract_business_document.execute(businessId, payload);
      return NextResponse.json({ success: true, ...result });
    }

    // 2. Create structured draft
    if (action === 'create_draft') {
      const draft = await AGENT_TOOLS.create_transaction_draft.execute(businessId, payload);
      return NextResponse.json({ success: true, draft });
    }

    // 3. Update existing draft
    if (action === 'update_draft') {
      const { draftId, updates } = payload;
      const updated = db.updateTransactionDraft(businessId, draftId, updates);
      if (!updated) {
        return NextResponse.json({ error: 'Draft not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, draft: updated });
    }

    // 4. Commit draft to official ledger
    if (action === 'commit_draft') {
      const { draftId } = payload;
      const result = db.commitTransactionDraft(businessId, draftId);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        committedRecord: result.committedRecord,
        message: 'Draft committed successfully. Note: Goods receipt workflow required before inventory stock changes.',
      });
    }

    // 5. Check duplicate
    if (action === 'check_duplicate') {
      const dup = db.checkDuplicateTransaction(
        businessId,
        payload.type || 'expense',
        payload.amount || 0,
        payload.counterparty || '',
        payload.date || new Date().toISOString().split('T')[0],
        payload.refNumber
      );
      return NextResponse.json({ success: true, ...dup });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('Entry action failed:', err);
    return NextResponse.json({ error: err.message || 'Entry action failed' }, { status: 500 });
  }
}
