import { db } from '@/lib/db/database';

export interface AIResponsePayload {
  intent: string;
  language: 'en' | 'ta';
  textResponse: string;
  voiceText: string;
  actionType?: 'sales_summary' | 'low_stock' | 'expiry_risk' | 'create_invoice' | 'follow_ups' | 'connectors' | 'report_preview' | 'import_flow' | 'billing_modal' | 'purchases';
  data?: any;
  confidence: number;
}

export function processUserCommand(input: string, businessId: string): AIResponsePayload {
  const query = input.trim();
  const lower = query.toLowerCase();

  // Detect Tamil script: unicode range 0B80–0BFF
  const isTamil = /[\u0B80-\u0BFF]/.test(query) || lower.includes('tamil') || lower.includes('vanakkam');
  const lang: 'en' | 'ta' = isTamil ? 'ta' : 'en';

  const business = db.getBusiness(businessId);
  const bizName = business?.name || 'Your business';

  // 1. SALES / REVENUE
  if (
    lower.includes('today') && (lower.includes('sell') || lower.includes('sale') || lower.includes('revenue') || lower.includes('collection')) ||
    lower.includes("today's sales") ||
    lower.includes('விற்பனை') ||
    lower.includes('இன்றைய விற்பனை') ||
    lower.includes('எவ்வளவு விற்றது')
  ) {
    const summary = db.getSalesSummary(businessId, 'today');
    const formattedAmount = `${business?.currency || '₹'}${summary.totalSales.toLocaleString('en-IN')}`;
    const textResponse = lang === 'ta'
      ? `இன்று ${bizName}-ல் மொத்தம் ${formattedAmount} விற்பனை ஆகியுள்ளது. ${summary.totalInvoices} இன்வாய்ஸ்கள் பதிவாகியுள்ளன. உத்தேச லாபம் ${business?.currency || '₹'}${summary.estimatedGrossProfit.toLocaleString('en-IN')}.`
      : `Today, ${bizName} has recorded total sales of ${formattedAmount} across ${summary.totalInvoices} invoices. Estimated gross profit is ${business?.currency || '₹'}${summary.estimatedGrossProfit.toLocaleString('en-IN')} (${summary.profitMarginPercent}% margin).`;

    const voiceText = lang === 'ta'
      ? `இன்றைய மொத்த விற்பனை ${formattedAmount}. ${summary.totalInvoices} இன்வாய்ஸ்கள் செய்யப்பட்டுள்ளன.`
      : `Today's total sales are ${formattedAmount} with ${summary.totalInvoices} verified invoices.`;

    return {
      intent: 'today_sales',
      language: lang,
      textResponse,
      voiceText,
      actionType: 'sales_summary',
      data: summary,
      confidence: 0.98,
    };
  }

  // 2. INVENTORY & LOW STOCK / RESTOCKING
  if (
    lower.includes('low stock') ||
    lower.includes('restock') ||
    lower.includes('out of stock') ||
    lower.includes('inventory') ||
    lower.includes('stock status') ||
    lower.includes('ஸ்டாக்') ||
    lower.includes('இருப்பு') ||
    lower.includes('குறைவான') ||
    lower.includes('சரக்கு')
  ) {
    const lowStock = db.getLowStockProducts(businessId);
    const count = lowStock.length;

    const textResponse = lang === 'ta'
      ? count > 0
        ? `தற்போது ${count} பொருட்கள் மறுஆர்டர் அளவுக்கு கீழே உள்ளன அல்லது தீர்ந்துவிட்டன. முழுமையான விபரம் கீழே காட்டப்பட்டுள்ளது.`
        : 'அனைத்து பொருட்களும் போதுமான இருப்புடன் உள்ளன. மறுஆர்டர் தேவையில்லை.'
      : count > 0
        ? `You have ${count} products that are low or out of stock and need restocking. Here is the verified inventory breakdown:`
        : 'All inventory items are currently well-stocked above minimum thresholds.';

    const voiceText = lang === 'ta'
      ? `${count} பொருட்கள் ஸ்டாக் குறைவாக உள்ளன. மறுஆர்டர் செய்ய வேண்டும்.`
      : `${count} items are running low on stock and need to be reordered.`;

    return {
      intent: 'inventory_low_stock',
      language: lang,
      textResponse,
      voiceText,
      actionType: 'low_stock',
      data: { lowStock, allCount: db.getProducts(businessId).length },
      confidence: 0.96,
    };
  }

  // 3. EXPIRY RISK
  if (
    lower.includes('expiry') ||
    lower.includes('expire') ||
    lower.includes('stale') ||
    lower.includes('காலாவதி') ||
    lower.includes('பழைய')
  ) {
    const expiring = db.getExpiringProducts(businessId);
    const count = expiring.length;

    const textResponse = lang === 'ta'
      ? count > 0
        ? `${count} பொருட்கள் அடுத்த 7 நாட்களுக்குள் காலாவதி ஆகின்றன. உடனடி தள்ளுபடி விற்பனைக்கு பரிந்துரைக்கப்படுகிறது.`
        : 'எந்த பொருளும் விரைவில் காலாவதி ஆகவில்லை. பொருட்கள் அனைத்தும் புதியவை.'
      : count > 0
        ? `Identified ${count} item(s) approaching expiry within the next 7 days. Early clearance or bundle promotion recommended.`
        : 'No products are approaching expiry in the next 7 days.';

    const voiceText = lang === 'ta'
      ? `${count} பொருட்கள் விரைவில் காலாவதி ஆகின்றன.`
      : `${count} items are approaching expiry date.`;

    return {
      intent: 'expiry_risk',
      language: lang,
      textResponse,
      voiceText,
      actionType: 'expiry_risk',
      data: { expiring },
      confidence: 0.95,
    };
  }

  // 4. CREATE INVOICE
  if (
    lower.includes('create invoice') ||
    lower.includes('make invoice') ||
    lower.includes('new invoice') ||
    lower.includes('bill for') ||
    lower.includes('invoice for') ||
    lower.includes('இன்வாய்ஸ்') ||
    lower.includes('பில் போடு') ||
    lower.includes('ரசீது')
  ) {
    // Check if customer name mentioned
    let customerName = 'Priya Sundaram';
    let itemName = 'Pure Cotton Formal Shirt (White)';
    let qty = 2;
    let unitPrice = 1299;

    if (lower.includes('priya') || lower.includes('பிரியா')) {
      customerName = 'Priya Sundaram';
      const cust = db.findCustomer(businessId, 'Priya');
      if (cust) customerName = cust.name;
    } else if (lower.includes('rajesh') || lower.includes('ராஜேஷ்')) {
      customerName = 'Rajesh Kumar';
    } else if (lower.includes('ananya') || lower.includes('அனன்யா')) {
      customerName = 'Ananya Krishnan';
    } else if (lower.includes('murugan') || lower.includes('முருகன்')) {
      customerName = 'Murugan Traders (Wholesale)';
    }

    if (lower.includes('saree') || lower.includes('சேலை') || lower.includes('silk')) {
      itemName = 'Kanchipuram Pure Silk Saree';
      unitPrice = 8500;
      qty = 1;
    } else if (lower.includes('trouser') || lower.includes('pant')) {
      itemName = 'Linen Casual Trousers';
      unitPrice = 1799;
      qty = 1;
    } else if (lower.includes('kurti') || lower.includes('குர்தி')) {
      itemName = 'Designer Embroidered Kurti Set';
      unitPrice = 2499;
      qty = 1;
    } else if (lower.includes('dhoti') || lower.includes('வேஷ்டி')) {
      itemName = 'Traditional Dhotis (Pack of 2)';
      unitPrice = 899;
      qty = 2;
    }

    // Number extraction
    const matchNumber = lower.match(/\b(two|three|four|five|1|2|3|4|5|10)\b/);
    if (matchNumber) {
      const wordMap: Record<string, number> = { two: 2, three: 3, four: 4, five: 5 };
      qty = wordMap[matchNumber[1]] || parseInt(matchNumber[1], 10) || qty;
    }

    const subtotal = qty * unitPrice;
    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    const total = subtotal + tax;

    const draftData = {
      customerName,
      items: [
        {
          name: itemName,
          quantity: qty,
          unitPrice,
          taxRate: 5,
          total: subtotal,
        },
      ],
      subtotal,
      taxAmount: tax,
      discount: 0,
      total,
    };

    const textResponse = lang === 'ta'
      ? `${customerName}-க்கு ${qty} ${itemName} அடங்கிய வரைவு இன்வாய்ஸ் (Draft) தயார் செய்யப்பட்டுள்ளது. சரிபார்த்து பதிவேற்றவும்.`
      : `I have prepared a draft invoice for ${customerName} with ${qty}x ${itemName}. Total payable is ${business?.currency || '₹'}${total.toLocaleString('en-IN')}. Please review and approve.`;

    const voiceText = lang === 'ta'
      ? `${customerName}-க்கு புதிய இன்வாய்ஸ் தயார் செய்யப்பட்டுள்ளது.`
      : `Draft invoice for ${customerName} has been prepared for ${business?.currency || '₹'}${total}.`;

    return {
      intent: 'create_invoice',
      language: lang,
      textResponse,
      voiceText,
      actionType: 'create_invoice',
      data: draftData,
      confidence: 0.94,
    };
  }

  // 5. CUSTOMER FOLLOW-UPS
  if (
    lower.includes('follow up') ||
    lower.includes('follow-up') ||
    lower.includes('followup') ||
    lower.includes('remind me') ||
    lower.includes('contact customer') ||
    lower.includes('வாடிக்கையாளர்') ||
    lower.includes('பாலோ அப்') ||
    lower.includes('நினைவூட்டல்')
  ) {
    const tasks = db.getFollowUps(businessId, 'pending');
    const textResponse = lang === 'ta'
      ? `உங்களுக்கு ${tasks.length} வாடிக்கையாளர் ஃபாலோ-அப் நினைவூட்டல்கள் உள்ளன. முக்கியமாக ராஜேஷ் குமார் நிலுவைத் தொகை ₹3,200 மற்றும் பிரியா சுந்தரம் திருமண ஆர்டர்.`
      : `You have ${tasks.length} pending customer follow-ups saved. Here is your action list with instant WhatsApp and Phone call options:`;

    const voiceText = lang === 'ta'
      ? `${tasks.length} வாடிக்கையாளர் ஃபாலோ-அப்கள் உள்ளன.`
      : `You have ${tasks.length} pending customer follow-ups scheduled.`;

    return {
      intent: 'customer_followups',
      language: lang,
      textResponse,
      voiceText,
      actionType: 'follow_ups',
      data: { tasks },
      confidence: 0.95,
    };
  }

  // 6. CONNECTORS / EMAILS / WHATSAPP
  if (
    lower.includes('email') ||
    lower.includes('gmail') ||
    lower.includes('whatsapp') ||
    lower.includes('message') ||
    lower.includes('order') && lower.includes('arrive') ||
    lower.includes('மின்னஞ்சல்') ||
    lower.includes('வாட்ஸ்அப்') ||
    lower.includes('செய்தி')
  ) {
    const connectors = db.getConnectors(businessId);
    const gmail = connectors.find((c) => c.type === 'gmail');
    const wa = connectors.find((c) => c.type === 'whatsapp');

    const textResponse = lang === 'ta'
      ? `இன்று ஜிமெயிலில் 12 புதிய மின்னஞ்சல்களும், வாட்ஸ்அப்பில் 8 புதிய செய்திகளும் வந்துள்ளன. இணைப்புகளின் நிலை கீழே உள்ளது.`
      : `You have 12 new Gmail emails (including 3 order inquiries) and 8 incoming WhatsApp Business messages today. Connector details are shown below:`;

    const voiceText = lang === 'ta'
      ? `12 புதிய மின்னஞ்சல்களும் 8 வாட்ஸ்அப் செய்திகளும் வந்துள்ளன.`
      : `You have 12 new emails and 8 WhatsApp messages received today.`;

    return {
      intent: 'check_connectors',
      language: lang,
      textResponse,
      voiceText,
      actionType: 'connectors',
      data: { connectors, gmail, wa },
      confidence: 0.93,
    };
  }

  // 7. REPORTS & EXPORTS
  if (
    lower.includes('report') ||
    lower.includes('monthly') ||
    lower.includes('download') ||
    lower.includes('export') ||
    lower.includes('audit') ||
    lower.includes('அறிக்கை') ||
    lower.includes('பதிவிறக்கு') ||
    lower.includes('ரிப்போர்ட்')
  ) {
    const summary = db.getSalesSummary(businessId, 'month');
    const textResponse = lang === 'ta'
      ? `அக்டோபர் 2024 மாதாந்திர வணிக அறிக்கை தயாராக உள்ளது. மொத்த விற்பனை ${business?.currency || '₹'}${summary.totalSales.toLocaleString('en-IN')}. PDF அல்லது CSV வடிவில் பதிவிறக்கலாம்.`
      : `Your October 2024 Monthly Business Report has been generated from verified ledger records. Total sales are ${business?.currency || '₹'}${summary.totalSales.toLocaleString('en-IN')}. Download PDF or CSV below.`;

    const voiceText = lang === 'ta'
      ? `மாதாந்திர அறிக்கை தயாராக உள்ளது. பதிவிறக்கம் செய்து கொள்ளலாம்.`
      : `Your monthly business report is ready for download in PDF or CSV format.`;

    return {
      intent: 'generate_report',
      language: lang,
      textResponse,
      voiceText,
      actionType: 'report_preview',
      data: summary,
      confidence: 0.96,
    };
  }

  // 8. IMPORT (EXCEL / CSV / OCR)
  if (
    lower.includes('import') ||
    lower.includes('excel') ||
    lower.includes('csv') ||
    lower.includes('sheet') ||
    lower.includes('photo') ||
    lower.includes('scan') ||
    lower.includes('handwritten') ||
    lower.includes('இறக்குமதி') ||
    lower.includes('புகைப்படம்') ||
    lower.includes('ஸ்கேன்')
  ) {
    const textResponse = lang === 'ta'
      ? `எக்செல்/CSV கோப்பு அல்லது உங்கள் கையெழுத்து நோட்டு புத்தகத்தின் புகைப்படத்தை பதிவேற்றலாம். OCR மூலம் தானாக சரிபார்த்து டேட்டாபேஸில் சேர்க்கப்படும்.`
      : `You can upload your Excel/CSV spreadsheet or a photograph of your handwritten stock register. Our OCR & AI parser will extract structured items with an editable verification preview.`;

    const voiceText = lang === 'ta'
      ? `கோப்பு அல்லது புகைப்படத்தை பதிவேற்றலாம்.`
      : `Ready to import. Please upload your spreadsheet or register photo.`;

    return {
      intent: 'import_data',
      language: lang,
      textResponse,
      voiceText,
      actionType: 'import_flow',
      data: {},
      confidence: 0.95,
    };
  }

  // 9. PURCHASES / EXPENSES
  if (
    lower.includes('purchase') ||
    lower.includes('vendor') ||
    lower.includes('supplier') ||
    lower.includes('bill') && lower.includes('purchase') ||
    lower.includes('கொள்முதல்')
  ) {
    const purchases = db.getPurchases(businessId);
    const totalPurchases = purchases.reduce((a, b) => a + b.totalAmount, 0);

    const textResponse = lang === 'ta'
      ? `இன்றைய கொள்முதல் மற்றும் சப்ளையர் பில்கள்: 2 கொள்முதல் ஆர்டர்கள், மொத்த மதிப்பு ${business?.currency || '₹'}${totalPurchases.toLocaleString('en-IN')}.`
      : `Here are your recent purchases and supplier invoices: 2 completed purchase orders totaling ${business?.currency || '₹'}${totalPurchases.toLocaleString('en-IN')}.`;

    const voiceText = lang === 'ta'
      ? `மொத்த கொள்முதல் ${business?.currency || '₹'}${totalPurchases}.`
      : `Your purchases total ${business?.currency || '₹'}${totalPurchases}.`;

    return {
      intent: 'purchases',
      language: lang,
      textResponse,
      voiceText,
      actionType: 'purchases',
      data: { purchases, totalPurchases },
      confidence: 0.92,
    };
  }

  // 10. BILLING / SUBSCRIPTION
  if (
    lower.includes('subscription') ||
    lower.includes('pricing') ||
    lower.includes('billing') ||
    lower.includes('plan') ||
    lower.includes('razorpay') ||
    lower.includes('சந்தா') ||
    lower.includes('கட்டணம்')
  ) {
    const textResponse = lang === 'ta'
      ? `BizFlow AI All-in-One சந்தா திட்டம்: மாதத்திற்கு ₹499 அல்லது வருடத்திற்கு ₹4,999. GST ரசீது மற்றும் அட்டை/UPI ஆதரவு.`
      : `BizFlow AI All-in-One Subscription: ₹499/month or ₹4,999/year. Includes automatic GST invoicing, UPI/Cards via Razorpay, and invoice download history.`;

    const voiceText = lang === 'ta'
      ? `பிஸ்ஃப்ளோ ஆல்-இன்-ஒன் சந்தா விபரம்.`
      : `Here are your BizFlow AI subscription and billing details.`;

    return {
      intent: 'billing',
      language: lang,
      textResponse,
      voiceText,
      actionType: 'billing_modal',
      data: {},
      confidence: 0.95,
    };
  }

  // DEFAULT / GENERAL ASSISTANT
  const defaultEn = `I can help you check today's sales, track inventory, create draft invoices, follow up with customers, check emails/WhatsApp, generate monthly reports, or import stock registers. Try asking "How much did I sell today?" or "Create an invoice for Priya".`;
  const defaultTa = `வணக்கம்! இன்றைய விற்பனை, சரக்கு இருப்பு, புதிய இன்வாய்ஸ் போடுவது, வாடிக்கையாளர் நினைவூட்டல் அல்லது அறிக்கை தயாரிப்பது போன்றவற்றை செய்ய என்னிடம் கேட்கலாம். உதாரணமாக "இன்று எவ்வளவு விற்பனை ஆனது?" அல்லது "ஸ்டாக் குறைவான பொருட்கள் என்னென்ன?" என்று கேட்கலாம்.`;

  return {
    intent: 'general_help',
    language: lang,
    textResponse: lang === 'ta' ? defaultTa : defaultEn,
    voiceText: lang === 'ta' ? 'வணக்கம்! நான் உங்கள் பிஸ்ஃப்ளோ உதவியாளர்.' : 'Hello, how can I help your business today?',
    confidence: 0.7,
  };
}
