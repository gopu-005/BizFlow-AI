import fs from 'fs';
import path from 'path';
import {
  Business,
  Product,
  Customer,
  Supplier,
  Invoice,
  Purchase,
  Expense,
  FollowUpTask,
  ConnectorStatus,
  ImportPreviewRecord,
} from '@/types/erp';
import { Subscription, BillingInvoice, BillingDetails, BIZFLOW_PLAN } from '@/types/billing';
import {
  SEED_BUSINESSES,
  SEED_PRODUCTS,
  SEED_CUSTOMERS,
  SEED_INVOICES,
  SEED_PURCHASES,
  SEED_FOLLOW_UPS,
  SEED_CONNECTORS,
  SEED_SUBSCRIPTION,
  SEED_BILLING_INVOICES,
} from './seed';

interface DatabaseSchema {
  businesses: Business[];
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  purchases: Purchase[];
  followUps: FollowUpTask[];
  connectors: ConnectorStatus[];
  subscriptions: Record<string, Subscription>;
  billingInvoices: BillingInvoice[];
  billingDetails: Record<string, BillingDetails>;
  webhookEvents: string[]; // processed event IDs for idempotency
}

const DB_FILE = path.join(process.cwd(), 'data', 'bizflow-db.json');

class DatabaseService {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to read database file, initializing with seed data.', e);
    }
    return this.initSeedData();
  }

  private initSeedData(): DatabaseSchema {
    const initial: DatabaseSchema = {
      businesses: [...SEED_BUSINESSES],
      products: [...SEED_PRODUCTS],
      customers: [...SEED_CUSTOMERS],
      invoices: [...SEED_INVOICES],
      purchases: [...SEED_PURCHASES],
      followUps: [...SEED_FOLLOW_UPS],
      connectors: [...SEED_CONNECTORS],
      subscriptions: {
        biz_karthik_textiles: { ...SEED_SUBSCRIPTION },
      },
      billingInvoices: [...SEED_BILLING_INVOICES],
      billingDetails: {
        biz_karthik_textiles: {
          businessId: 'biz_karthik_textiles',
          legalName: 'Karthik Textiles & Garments',
          gstin: '33AAAAA0000A1Z5',
          billingEmail: 'karthik@textiles.bizflow.in',
          billingPhone: '+91 98400 11223',
          addressLine1: '42 Ranganathan Street',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600017',
          country: 'India',
          isGstRegistered: true,
        },
      },
      webhookEvents: [],
    };
    this.saveData(initial);
    return initial;
  }

  private saveData(data: DatabaseSchema) {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write database file:', e);
    }
  }

  // --- Businesses ---
  public getBusinesses(): Business[] {
    return this.data.businesses;
  }

  public getBusiness(id: string): Business | undefined {
    return this.data.businesses.find((b) => b.id === id);
  }

  // --- Products & Inventory ---
  public getProducts(businessId: string): Product[] {
    return this.data.products.filter((p) => p.businessId === businessId);
  }

  public getProduct(businessId: string, productId: string): Product | undefined {
    return this.data.products.find((p) => p.businessId === businessId && (p.id === productId || p.name.toLowerCase() === productId.toLowerCase()));
  }

  public getLowStockProducts(businessId: string): Product[] {
    return this.data.products.filter((p) => p.businessId === businessId && p.stock <= p.minStock);
  }

  public getExpiringProducts(businessId: string): Product[] {
    const today = new Date('2024-10-15');
    return this.data.products.filter((p) => {
      if (p.businessId !== businessId || !p.expiryDate) return false;
      const exp = new Date(p.expiryDate);
      const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    });
  }

  // --- Customers & Follow-ups ---
  public getCustomers(businessId: string): Customer[] {
    return this.data.customers.filter((c) => c.businessId === businessId);
  }

  public findCustomer(businessId: string, query: string): Customer | undefined {
    const q = query.toLowerCase().trim();
    return this.data.customers.find(
      (c) =>
        c.businessId === businessId &&
        (c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email && c.email.toLowerCase().includes(q)))
    );
  }

  public getFollowUps(businessId: string, filter?: 'today' | 'pending' | 'all'): FollowUpTask[] {
    const tasks = this.data.followUps.filter((f) => f.businessId === businessId);
    if (filter === 'today') {
      return tasks.filter((f) => f.scheduledDate <= '2024-10-15' && f.status === 'pending');
    }
    if (filter === 'pending') {
      return tasks.filter((f) => f.status === 'pending');
    }
    return tasks;
  }

  public createFollowUp(businessId: string, task: Omit<FollowUpTask, 'id' | 'createdAt'>): FollowUpTask {
    const newTask: FollowUpTask = {
      ...task,
      id: `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.followUps.unshift(newTask);
    this.saveData(this.data);
    return newTask;
  }

  // --- Invoices & Sales ---
  public getInvoices(businessId: string): Invoice[] {
    return this.data.invoices.filter((i) => i.businessId === businessId);
  }

  public getInvoice(businessId: string, id: string): Invoice | undefined {
    return this.data.invoices.find((i) => i.businessId === businessId && (i.id === id || i.invoiceNumber === id));
  }

  public createInvoice(
    businessId: string,
    invoiceData: {
      customerId?: string;
      customerName: string;
      customerPhone?: string;
      customerGstin?: string;
      customerAddress?: string;
      items: Array<{ name: string; quantity: number; unitPrice: number; taxRate?: number; productId?: string }>;
      discount?: number;
      paymentMode?: string;
      notes?: string;
    }
  ): Invoice {
    const discount = invoiceData.discount || 0;
    let subtotal = 0;
    let totalTax = 0;

    const formattedItems = invoiceData.items.map((it, idx) => {
      const taxRate = it.taxRate ?? 5;
      const itemSub = it.quantity * it.unitPrice;
      const itemTax = itemSub * (taxRate / 100);
      subtotal += itemSub;
      totalTax += itemTax;

      // Decrement product stock if matching product exists
      const prod = this.data.products.find(
        (p) => p.businessId === businessId && (p.id === it.productId || p.name.toLowerCase() === it.name.toLowerCase())
      );
      if (prod) {
        prod.stock = Math.max(0, prod.stock - it.quantity);
      }

      return {
        id: `item_${Date.now()}_${idx}`,
        productId: prod?.id,
        name: it.name,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        taxRate,
        total: itemSub,
      };
    });

    const total = Math.max(0, subtotal + totalTax - discount);
    const invoiceCount = this.data.invoices.filter((i) => i.businessId === businessId).length + 104;
    const invoiceNumber = `INV-2024-${String(invoiceCount).padStart(5, '0')}`;

    let customer = this.findCustomer(businessId, invoiceData.customerName);
    if (!customer) {
      customer = {
        id: `cust_${Date.now()}`,
        businessId,
        name: invoiceData.customerName,
        phone: invoiceData.customerPhone || '+91 90000 00000',
        email: '',
        address: invoiceData.customerAddress || '',
        gstin: invoiceData.customerGstin,
        totalSpent: total,
        balance: 0,
        status: 'active',
      };
      this.data.customers.push(customer);
    } else {
      customer.totalSpent += total;
    }

    const newInvoice: Invoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber,
      businessId,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: invoiceData.customerPhone || customer.phone,
      customerGstin: invoiceData.customerGstin || customer.gstin,
      customerAddress: invoiceData.customerAddress || customer.address,
      items: formattedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(totalTax * 100) / 100,
      discount,
      total: Math.round(total * 100) / 100,
      status: 'paid',
      dueDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      paymentMode: invoiceData.paymentMode || 'UPI / Instant Pay',
      notes: invoiceData.notes || 'Generated by BizFlow AI assistant',
    };

    this.data.invoices.unshift(newInvoice);
    this.saveData(this.data);
    return newInvoice;
  }

  // --- Deterministic Sales & Business Intelligence Calculations ---
  public getSalesSummary(businessId: string, period: 'today' | 'week' | 'month' = 'today') {
    const invoices = this.data.invoices.filter((i) => i.businessId === businessId && i.status !== 'cancelled');
    
    // For realistic demo reference (reference image is 15 Oct 2024), we treat 2024-10-15 as today
    const targetDate = '2024-10-15';
    let filtered = invoices;
    let periodLabel = 'Today (15 Oct 2024)';

    if (period === 'today') {
      filtered = invoices.filter((i) => i.createdAt.startsWith(targetDate) || i.dueDate === targetDate);
      periodLabel = 'Today (15 Oct 2024)';
    } else if (period === 'week') {
      filtered = invoices.filter((i) => i.createdAt >= '2024-10-09');
      periodLabel = 'Past 7 Days (09 Oct – 15 Oct 2024)';
    } else if (period === 'month') {
      filtered = invoices.filter((i) => i.createdAt >= '2024-10-01');
      periodLabel = 'October 2024 Month-to-Date';
    }

    const totalSales = filtered.reduce((acc, curr) => acc + curr.total, 0);
    const totalTax = filtered.reduce((acc, curr) => acc + curr.taxAmount, 0);
    const totalInvoices = filtered.length;
    const avgOrderValue = totalInvoices > 0 ? Math.round(totalSales / totalInvoices) : 0;

    // Item breakdown
    const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const inv of filtered) {
      for (const item of inv.items) {
        if (!productSalesMap[item.name]) {
          productSalesMap[item.name] = { name: item.name, quantity: 0, revenue: 0 };
        }
        productSalesMap[item.name].quantity += item.quantity;
        productSalesMap[item.name].revenue += item.total;
      }
    }

    const topSelling = Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue);

    // Purchases for period
    const purchases = this.data.purchases.filter((p) => p.businessId === businessId);
    const totalPurchases = purchases.reduce((acc, curr) => acc + curr.totalAmount, 0);

    // Estimated Gross Profit = Total Revenue (ex-tax) - Estimated Cost
    // In our products, cost margin is calculated accurately
    let estimatedCost = 0;
    for (const item of topSelling) {
      const prod = this.data.products.find((p) => p.name.toLowerCase() === item.name.toLowerCase());
      if (prod) {
        estimatedCost += prod.costPrice * item.quantity;
      } else {
        estimatedCost += item.revenue * 0.65; // default 65% cost estimate
      }
    }
    const estimatedGrossProfit = Math.max(0, totalSales - totalTax - estimatedCost);

    return {
      period,
      periodLabel,
      totalSales: Math.round(totalSales * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      totalInvoices,
      avgOrderValue,
      totalPurchases,
      estimatedGrossProfit: Math.round(estimatedGrossProfit * 100) / 100,
      profitMarginPercent: totalSales > 0 ? Math.round((estimatedGrossProfit / totalSales) * 100) : 0,
      topSelling,
      invoices: filtered,
    };
  }

  // --- Purchases ---
  public getPurchases(businessId: string): Purchase[] {
    return this.data.purchases.filter((p) => p.businessId === businessId);
  }

  // --- Connectors ---
  public getConnectors(businessId: string): ConnectorStatus[] {
    return this.data.connectors;
  }

  public updateConnector(type: string, status: Partial<ConnectorStatus>): ConnectorStatus | undefined {
    const conn = this.data.connectors.find((c) => c.type === type);
    if (conn) {
      Object.assign(conn, status);
      this.saveData(this.data);
      return conn;
    }
    return undefined;
  }

  // --- Subscriptions & Billing ---
  public getSubscription(businessId: string): Subscription {
    if (!this.data.subscriptions[businessId]) {
      this.data.subscriptions[businessId] = {
        ...SEED_SUBSCRIPTION,
        businessId,
      };
      this.saveData(this.data);
    }
    return this.data.subscriptions[businessId];
  }

  public updateSubscription(businessId: string, update: Partial<Subscription>): Subscription {
    const sub = this.getSubscription(businessId);
    Object.assign(sub, update);
    this.data.subscriptions[businessId] = sub;
    this.saveData(this.data);
    return sub;
  }

  public getBillingDetails(businessId: string): BillingDetails {
    if (!this.data.billingDetails[businessId]) {
      const biz = this.getBusiness(businessId);
      this.data.billingDetails[businessId] = {
        businessId,
        legalName: biz?.name || 'Retail Business',
        gstin: biz?.gstNumber || '',
        billingEmail: biz?.email || 'accounts@bizflow.in',
        billingPhone: biz?.phone || '+91 90000 00000',
        addressLine1: biz?.address || '',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
        country: 'India',
        isGstRegistered: !!biz?.gstNumber,
      };
      this.saveData(this.data);
    }
    return this.data.billingDetails[businessId];
  }

  public updateBillingDetails(businessId: string, details: Partial<BillingDetails>): BillingDetails {
    const current = this.getBillingDetails(businessId);
    Object.assign(current, details);
    this.data.billingDetails[businessId] = current;
    this.saveData(this.data);
    return current;
  }

  public getBillingInvoices(businessId: string): BillingInvoice[] {
    return this.data.billingInvoices.filter((b) => b.businessId === businessId);
  }

  public createBillingInvoice(
    businessId: string,
    params: {
      planName: string;
      billingCycle: 'monthly' | 'annual';
      baseAmount: number;
      taxRate: number;
      taxAmount: number;
      totalPaid: number;
      paymentMethod: string;
      gatewayTransactionRef: string;
    }
  ): BillingInvoice {
    const count = this.data.billingInvoices.length + 1;
    const invoiceNumber = `BZF-2024-${String(count).padStart(4, '0')}`;
    const biz = this.getBusiness(businessId);
    const billingDetails = this.getBillingDetails(businessId);

    const now = new Date();
    const startDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const nextDate = new Date(now);
    if (params.billingCycle === 'annual') {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    } else {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    const endDate = nextDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const invoice: BillingInvoice = {
      id: `binv_${Date.now()}`,
      invoiceNumber,
      businessId,
      businessName: billingDetails.legalName || biz?.name || 'BizFlow Customer',
      billingEmail: billingDetails.billingEmail,
      customerGstin: billingDetails.gstin,
      billingAddress: `${billingDetails.addressLine1}, ${billingDetails.city}, ${billingDetails.state} - ${billingDetails.pincode}`,
      planName: params.planName,
      billingPeriod: `${startDate} – ${endDate}`,
      billingCycle: params.billingCycle,
      baseAmount: params.baseAmount,
      taxRate: params.taxRate,
      taxAmount: params.taxAmount,
      totalPaid: params.totalPaid,
      currency: 'INR',
      paymentStatus: 'paid',
      paymentMethod: params.paymentMethod,
      gatewayTransactionRef: params.gatewayTransactionRef,
      createdAt: now.toISOString(),
    };

    this.data.billingInvoices.unshift(invoice);
    this.saveData(this.data);
    return invoice;
  }

  public isWebhookProcessed(eventId: string): boolean {
    return this.data.webhookEvents.includes(eventId);
  }

  public markWebhookProcessed(eventId: string) {
    if (!this.data.webhookEvents.includes(eventId)) {
      this.data.webhookEvents.push(eventId);
      this.saveData(this.data);
    }
  }

  // --- Bulk Import ---
  public importProducts(businessId: string, records: ImportPreviewRecord[]): { imported: number; updated: number } {
    let imported = 0;
    let updated = 0;

    for (const rec of records) {
      if (rec.status === 'error') continue;
      const existing = this.data.products.find(
        (p) => p.businessId === businessId && p.name.toLowerCase() === rec.productName.toLowerCase()
      );

      if (existing) {
        existing.stock += rec.quantity;
        existing.price = rec.unitPrice > 0 ? rec.unitPrice : existing.price;
        existing.costPrice = rec.costPrice > 0 ? rec.costPrice : existing.costPrice;
        existing.lastRestocked = new Date().toISOString().split('T')[0];
        updated++;
      } else {
        const newProd: Product = {
          id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          businessId,
          name: rec.productName,
          sku: `SKU-${rec.productName.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
          category: rec.category || 'General',
          price: rec.unitPrice,
          costPrice: rec.costPrice,
          stock: rec.quantity,
          minStock: Math.max(5, Math.floor(rec.quantity * 0.2)),
          unit: rec.unit || 'pcs',
          lastRestocked: new Date().toISOString().split('T')[0],
        };
        this.data.products.push(newProd);
        imported++;
      }
    }

    this.saveData(this.data);
    return { imported, updated };
  }
}

// Singleton database instance
export const db = new DatabaseService();
