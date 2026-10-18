import { NextResponse } from 'next/server';
import { db } from '@/lib/db/database';

export async function GET() {
  const businesses = db.getBusinesses();
  const products = db.getProducts('biz_karthik_textiles');
  const invoices = db.getInvoices('biz_karthik_textiles');

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'BizFlow AI Conversational ERP',
    tenants: businesses.length,
    activeCatalogItems: products.length,
    recordedInvoices: invoices.length,
    databaseEngine: 'PostgreSQL Abstraction / Local JSON Persistence',
  });
}
