export type UserRole = 'super_admin' | 'store_manager' | 'cashier' | 'inventory_staff' | 'accountant';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: 'active' | 'disabled';
  createdAt: string;
  lastLogin?: string;
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  email: string;
  birthday: string;
  address: string;
  salary: number;
  role: UserRole;
  status: 'active' | 'disabled';
  attendance: { [date: string]: 'Present' | 'Absent' | 'Leave' };
  performanceRating?: number;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Brand {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  barcode: string; // Master barcode or default variant
  sku: string;
  name: string;
  description: string;
  brand: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  discount: number; // percentage
  gst: number; // percentage
  image: string;
  supplierId: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  productName: string; // Denormalized for convenience
  color: string;
  size: string;
  material: string;
  stock: number;
  lowStockThreshold: number;
  barcode: string;
  sku: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  birthday: string;
  address: string;
  loyaltyPoints: number;
  rewardLevel: 'Silver' | 'Gold' | 'Platinum';
  createdAt: string;
}

export interface PurchaseItem {
  variantId: string;
  productName: string;
  color: string;
  size: string;
  costPrice: number;
  quantity: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  status: 'Pending' | 'Received';
  totalAmount: number;
  items: PurchaseItem[];
  createdAt: string;
}

export type PaymentMethod = 'Cash' | 'UPI' | 'Credit Card' | 'Debit Card' | 'Wallet' | 'Gift Card' | 'Split Payment';

export interface SaleItem {
  variantId: string;
  productId: string;
  name: string;
  color: string;
  size: string;
  price: number; // selling price after product discount
  quantity: number;
  discountApplied: number; // transaction-level item discount
  gstRate: number;
  total: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  cashierId: string;
  cashierName: string;
  subtotal: number;
  discountAmount: number;
  gstAmount: number;
  loyaltyPointsRedeemed: number;
  loyaltyPointsEarned: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentDetails?: {
    splitDetails?: { [key in Exclude<PaymentMethod, 'Split Payment'>]?: number };
    referenceNo?: string;
  };
  items: SaleItem[];
  createdAt: string;
}

export interface Return {
  id: string;
  saleId: string;
  invoiceNumber: string;
  variantId: string;
  productName: string;
  color: string;
  size: string;
  quantity: number;
  type: 'refund' | 'exchange' | 'store-credit';
  refundAmount: number;
  reason: string;
  exchangeVariantId?: string;
  createdAt: string;
}

export type ExpenseCategory = 'Electricity' | 'Rent' | 'Salary' | 'Internet' | 'Maintenance' | 'Marketing' | 'Miscellaneous';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  company: string;
  gstNumber: string;
  phone: string;
  email: string;
  address: string;
  pendingPayments: number;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  role: UserRole;
  action: string;
  details: string;
  timestamp: string;
}

export interface StoreSettings {
  storeName: string;
  storeLogo: string;
  gstNumber: string;
  invoicePrefix: string;
  taxPercentage: number;
  currency: string;
  theme: 'light' | 'dark';
  loyaltyPointsRatio: number; // e.g. 0.05 (means 5% of sale value is earned as points)
  loyaltyRedemptionValue: number; // e.g. 1 (means 1 point = $1 or 1 rupee)
  lowStockAlertLevel: number;
}
