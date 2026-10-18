import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, Business } from '@/types/erp';
import { BillingInvoice } from '@/types/billing';

export function generateInvoicePDF(invoice: Invoice, business: Business): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Colors
  const primaryColor: [number, number, number] = [126, 34, 206]; // Purple-700
  const darkColor: [number, number, number] = [30, 27, 75]; // Dark indigo
  const lightGrey: [number, number, number] = [245, 245, 250];

  // Header Banner
  doc.setFillColor(...lightGrey);
  doc.rect(0, 0, 210, 45, 'F');

  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 8, 297, 'F'); // Left accent bar

  // Business Info
  doc.setTextColor(...darkColor);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(business.name, 18, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 90);
  doc.text(business.address, 18, 24);
  doc.text(`Phone: ${business.phone}  |  Email: ${business.email}`, 18, 29);
  if (business.gstNumber) {
    doc.setFont('helvetica', 'bold');
    doc.text(`GSTIN: ${business.gstNumber}`, 18, 35);
  }

  // Invoice Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('TAX INVOICE', 145, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 80);
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, 145, 25);
  doc.text(`Date: ${invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-IN') : '15/10/2024'}`, 145, 30);
  doc.text(`Status: ${invoice.status.toUpperCase()}`, 145, 35);

  // Customer Section
  doc.setFillColor(250, 248, 255);
  doc.roundedRect(18, 52, 175, 28, 2, 2, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('BILLED TO (CUSTOMER):', 24, 60);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(invoice.customerName, 24, 67);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 100);
  const custAddr = invoice.customerAddress || 'Customer Address on Record';
  doc.text(custAddr, 24, 72);
  if (invoice.customerPhone) {
    doc.text(`Contact: ${invoice.customerPhone}`, 120, 67);
  }
  if (invoice.customerGstin) {
    doc.text(`Customer GSTIN: ${invoice.customerGstin}`, 120, 72);
  }

  // Items Table
  const tableData = invoice.items.map((it, idx) => [
    idx + 1,
    it.name,
    it.quantity,
    `INR ${it.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    `${it.taxRate}%`,
    `INR ${it.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  ]);

  autoTable(doc, {
    startY: 86,
    head: [['#', 'Item Description', 'Qty', 'Unit Price', 'GST', 'Total']],
    body: tableData,
    margin: { left: 18, right: 18 },
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [40, 40, 50],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 31, halign: 'right' },
    },
  });

  // Totals Section
  const finalY = (doc as any).lastAutoTable.finalY + 8;

  doc.setFillColor(250, 250, 252);
  doc.roundedRect(120, finalY, 73, 40, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 90);
  doc.text('Subtotal:', 125, finalY + 8);
  doc.text(`INR ${invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 188, finalY + 8, { align: 'right' });

  doc.text('Estimated Tax (GST):', 125, finalY + 15);
  doc.text(`INR ${invoice.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 188, finalY + 15, { align: 'right' });

  if (invoice.discount > 0) {
    doc.text('Discount:', 125, finalY + 22);
    doc.text(`- INR ${invoice.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 188, finalY + 22, { align: 'right' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkColor);
  doc.text('Total Amount:', 125, finalY + 32);
  doc.setTextColor(...primaryColor);
  doc.text(`INR ${invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 188, finalY + 32, { align: 'right' });

  // Payment note
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(110, 110, 120);
  doc.text(`Payment Mode: ${invoice.paymentMode || 'UPI / Cash'}`, 18, finalY + 15);
  doc.text(`Notes: ${invoice.notes || 'Thank you for your business!'}`, 18, finalY + 22);

  // Footer
  doc.setDrawColor(220, 220, 230);
  doc.line(18, 275, 193, 275);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(140, 140, 150);
  doc.text('Powered by BizFlow AI — Conversational ERP for Indian Retailers', 18, 282);
  doc.text('Computer-generated verified invoice', 193, 282, { align: 'right' });

  return doc;
}

export function generateReportPDF(summary: any, business: Business): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor: [number, number, number] = [126, 34, 206];
  const darkColor: [number, number, number] = [30, 27, 75];

  // Header
  doc.setFillColor(248, 246, 255);
  doc.rect(0, 0, 210, 40, 'F');

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text(business.name, 18, 16);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(`Monthly Business Executive Report — ${summary.periodLabel}`, 18, 24);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 110);
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}  |  Tenant: ${business.id}`, 18, 32);

  // KPI Cards
  const kpiY = 48;
  const kpis = [
    { label: 'Total Revenue', value: `INR ${summary.totalSales.toLocaleString('en-IN')}` },
    { label: 'Verified Invoices', value: `${summary.totalInvoices}` },
    { label: 'Est. Gross Profit', value: `INR ${summary.estimatedGrossProfit.toLocaleString('en-IN')}` },
    { label: 'Margin', value: `${summary.profitMarginPercent}%` },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 18 + idx * 44;
    doc.setFillColor(252, 250, 255);
    doc.setDrawColor(230, 220, 245);
    doc.roundedRect(x, kpiY, 41, 22, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setTextColor(110, 110, 120);
    doc.setFont('helvetica', 'normal');
    doc.text(kpi.label, x + 4, kpiY + 7);

    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.value, x + 4, kpiY + 16);
  });

  // Top products table
  const tableData = summary.topSelling.map((it: any, idx: number) => [
    idx + 1,
    it.name,
    it.quantity,
    `INR ${it.revenue.toLocaleString('en-IN')}`,
    `${summary.totalSales > 0 ? Math.round((it.revenue / summary.totalSales) * 100) : 0}%`,
  ]);

  doc.setFontSize(11);
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Product Sales Breakdown', 18, 80);

  autoTable(doc, {
    startY: 84,
    head: [['#', 'Product Name', 'Units Sold', 'Revenue', '% of Sales']],
    body: tableData,
    margin: { left: 18, right: 18 },
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
    },
  });

  // Statutory disclaimer as required by prompt
  const finalY = (doc as any).lastAutoTable.finalY + 14;
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(253, 230, 138);
  doc.roundedRect(18, finalY, 175, 22, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14);
  doc.setFont('helvetica', 'bold');
  doc.text('Important Compliance Notice:', 22, finalY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text('This internal business summary is computed automatically from verified ledger and invoice records.', 22, finalY + 11);
  doc.text('It must not be represented as certified accounts, audited financial statements, or an independent audit opinion.', 22, finalY + 16);

  return doc;
}

export function generateBillingInvoicePDF(invoice: BillingInvoice): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor: [number, number, number] = [147, 51, 234];
  const darkColor: [number, number, number] = [17, 24, 39];

  // Header
  doc.setFillColor(250, 245, 255);
  doc.rect(0, 0, 210, 48, 'F');

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('BizFlow AI Technologies Inc.', 18, 18);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  doc.text('HQ: TIDEL Park, Rajiv Gandhi Salai, Taramani, Chennai, TN 600113', 18, 24);
  doc.text('GSTIN: 33AABCB1234F1Z0  |  support@bizflow.ai  |  www.bizflow.ai', 18, 29);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('SUBSCRIPTION INVOICE', 135, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, 135, 25);
  doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}`, 135, 30);
  doc.text(`Period: ${invoice.billingPeriod}`, 135, 35);
  doc.setTextColor(16, 185, 129); // Emerald green for PAID
  doc.setFont('helvetica', 'bold');
  doc.text(`STATUS: ${invoice.paymentStatus.toUpperCase()}`, 135, 41);

  // Customer Details
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(18, 54, 175, 32, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('SUBSCRIBER DETAILS:', 24, 62);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(invoice.businessName, 24, 68);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.text(`Email: ${invoice.billingEmail}`, 24, 74);
  doc.text(`Address: ${invoice.billingAddress}`, 24, 79);

  if (invoice.customerGstin) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(`Customer GSTIN: ${invoice.customerGstin}`, 120, 68);
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Gateway Ref: ${invoice.gatewayTransactionRef || 'N/A'}`, 120, 74);
  doc.text(`Payment Method: ${invoice.paymentMethod}`, 120, 79);

  // Table
  autoTable(doc, {
    startY: 94,
    head: [['Description', 'Cycle', 'SAC Code', 'Base Amount', 'GST (18%)', 'Total Paid']],
    body: [
      [
        `${invoice.planName} Plan\n(${invoice.billingPeriod})`,
        invoice.billingCycle.toUpperCase(),
        '998313 (IT/SaaS)',
        `INR ${invoice.baseAmount.toFixed(2)}`,
        `INR ${invoice.taxAmount.toFixed(2)}`,
        `INR ${invoice.totalPaid.toFixed(2)}`,
      ],
    ],
    margin: { left: 18, right: 18 },
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
    },
  });

  return doc;
}

export function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] === undefined || row[h] === null ? '' : String(row[h]);
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
