import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { ImportPreviewRecord } from '@/types/erp';

export async function POST(req: NextRequest) {
  try {
    const { businessId = 'biz_karthik_textiles', records } = (await req.json()) as {
      businessId: string;
      records: ImportPreviewRecord[];
    };

    if (!records || records.length === 0) {
      return NextResponse.json({ error: 'No records to import' }, { status: 400 });
    }

    const result = db.importProducts(businessId, records);
    return NextResponse.json({
      success: true,
      importedCount: result.imported,
      updatedCount: result.updated,
      totalCount: db.getProducts(businessId).length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Import failed' }, { status: 500 });
  }
}
