export interface Business {
  id: string;
  name: string;
  type: string;
  currency: string;
  ownerName: string;
  gstNumber?: string;
  address: string;
  phone: string;
  email: string;
  createdAt: string;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  expiryDate?: string;
  lastRestocked: string;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email?: string;
  gstin?: string;
  address?: string;
  totalSpent: number;
  balance: number;
  lastContactDate?: string;
  followUpDate?: string;
  followUpNote?: string;
  status: 'active' | 'pending_payment' | 'lead';
}

export interface Supplier {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalPurchases: number;
}

export interface InvoiceItem {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // e.g. 5, 12, 18
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  businessId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerGstin?: string;
  customerAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
  dueDate: string;
  createdAt: string;
  paymentMode?: string;
  notes?: string;
}

export interface PurchaseItem {
  productId?: string;
  name: string;
  quantity: number;
  unitCost: number;
  total: number;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  businessId: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  totalAmount: number;
  status: 'completed' | 'pending';
  date: string;
}

export interface Expense {
  id: string;
  businessId: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  paymentMode: string;
  vendorName?: string;
  referenceNumber?: string;
  taxAmount?: number;
}

export interface FollowUpTask {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  scheduledDate: string;
  dueDate?: string;
  title?: string;
  description?: string;
  amountDue?: number;
  notes: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface ConnectorStatus {
  id: string;
  type: 'gmail' | 'whatsapp' | 'postgres' | 'excel';
  name: string;
  connected: boolean;
  statusText: string;
  badgeCount?: number;
  badgeLabel?: string;
  lastSynced?: string;
  details?: Record<string, any>;
}

export interface ImportPreviewRecord {
  id: string;
  productName: string;
  name?: string;
  sku?: string;
  category: string;
  quantity: number;
  unitPrice: number;
  price?: number;
  sellingPrice?: number;
  costPrice: number;
  purchasePrice?: number;
  unit: string;
  confidence?: number;
  status: 'valid' | 'warning' | 'error';
  validationMessage?: string;
}
