import { 
  isFirebaseEnabled, db as firestore 
} from '../firebase/config';
import { 
  collection, doc, getDoc, getDocs, addDoc as fsAddDoc, updateDoc as fsUpdateDoc, 
  deleteDoc, setDoc as fsSetDoc, query, where, orderBy, limit 
} from 'firebase/firestore';

// Helper function to recursively remove undefined properties (which Firestore does not allow)
const sanitizeForFirestore = <T>(obj: T): T => {
  if (obj === undefined) {
    return null as any;
  }
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (obj instanceof Date) {
    return obj as any;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore) as any;
  }
  const sanitized: any = {};
  for (const key of Object.keys(obj)) {
    const val = (obj as any)[key];
    if (val !== undefined) {
      sanitized[key] = sanitizeForFirestore(val);
    }
  }
  return sanitized;
};

// Safe wrapper for Firestore setDoc that strips undefined properties
const setDoc = (docRef: any, data: any, options?: any) => {
  return fsSetDoc(docRef, sanitizeForFirestore(data), options);
};

// Safe wrapper for Firestore addDoc that strips undefined properties
const addDoc = (colRef: any, data: any) => {
  return fsAddDoc(colRef, sanitizeForFirestore(data));
};

// Safe wrapper for Firestore updateDoc that strips undefined properties
const updateDoc = (docRef: any, data: any) => {
  return fsUpdateDoc(docRef, sanitizeForFirestore(data));
};
import { 
  User, Employee, Category, Brand, Product, ProductVariant, 
  Customer, PurchaseOrder, Sale, Expense, Supplier, AuditLog, StoreSettings, Return, UserRole 
} from '../types';
import * as mockSeeds from './mockData';

let wasAlreadySeeded: boolean | null = null;

const checkWasAlreadySeeded = async (): Promise<boolean> => {
  if (wasAlreadySeeded !== null) {
    return wasAlreadySeeded;
  }
  if (isFirebaseEnabled && firestore) {
    try {
      const settingsRef = doc(firestore, 'settings', 'global');
      const snap = await getDoc(settingsRef);
      wasAlreadySeeded = snap.exists();
      return wasAlreadySeeded;
    } catch (err) {
      console.error("Error checking checkWasAlreadySeeded:", err);
      return false;
    }
  }
  return true;
};

// Local Storage Helper
const getLocal = <T>(key: string, seed: T): T => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  }
  try {
    return JSON.parse(data) as T;
  } catch {
    return seed;
  }
};

const setLocal = <T>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Database Wrapper Service
export const dbService = {
  // ==========================================
  // SETTINGS
  // ==========================================
  async getSettings(): Promise<StoreSettings> {
    if (isFirebaseEnabled && firestore) {
      try {
        const docRef = doc(firestore, 'settings', 'global');
        const snap = await getDoc(docRef);
        if (snap.exists()) return snap.data() as StoreSettings;
        // Seed Firestore if empty
        await setDoc(docRef, mockSeeds.MOCK_SETTINGS);
        return mockSeeds.MOCK_SETTINGS;
      } catch (err) {
        console.error("Firestore settings fetch error. Falling back to local storage.", err);
      }
    }
    return getLocal<StoreSettings>('vogue_settings', mockSeeds.MOCK_SETTINGS);
  },

  async updateSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    if (isFirebaseEnabled && firestore) {
      try {
        const docRef = doc(firestore, 'settings', 'global');
        await setDoc(docRef, updated);
        return updated;
      } catch (err) {
        console.error("Firestore settings save error.", err);
      }
    }
    setLocal('vogue_settings', updated);
    return updated;
  },

  // ==========================================
  // AUDIT LOGS
  // ==========================================
  async getAuditLogs(): Promise<AuditLog[]> {
    if (isFirebaseEnabled && firestore) {
      try {
        const q = query(collection(firestore, 'auditLogs'), orderBy('timestamp', 'desc'));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
      } catch (err) {
        console.error("Firestore audit logs error.", err);
      }
    }
    const logs = getLocal<AuditLog[]>('vogue_audit_logs', mockSeeds.MOCK_AUDIT_LOGS);
    return [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  async addAuditLog(userId: string, username: string, role: UserRole, action: string, details: string): Promise<AuditLog> {
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      username,
      role,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    if (isFirebaseEnabled && firestore) {
      try {
        const { id, ...logData } = log;
        const docRef = await addDoc(collection(firestore, 'auditLogs'), logData);
        log.id = docRef.id;
        return log;
      } catch (err) {
        console.error("Firestore audit logs add error.", err);
      }
    }
    const logs = getLocal<AuditLog[]>('vogue_audit_logs', mockSeeds.MOCK_AUDIT_LOGS);
    logs.push(log);
    setLocal('vogue_audit_logs', logs);
    return log;
  },

  // ==========================================
  // USERS / EMPLOYEES
  // ==========================================
  async getUsers(): Promise<User[]> {
    if (isFirebaseEnabled && firestore) {
      try {
        const snap = await getDocs(collection(firestore, 'users'));
        const alreadySeeded = await checkWasAlreadySeeded();
        if (snap.empty && !alreadySeeded) {
          // Initialize DB with seed users
          for (const u of mockSeeds.MOCK_USERS) {
            await setDoc(doc(firestore, 'users', u.id), u);
          }
          return mockSeeds.MOCK_USERS;
        }
        return snap.docs.map(d => d.data() as User);
      } catch (err) {
        console.error("Firestore users error.", err);
      }
    }
    return getLocal<User[]>('vogue_users', mockSeeds.MOCK_USERS);
  },

  async saveUser(user: User): Promise<User> {
    if (isFirebaseEnabled && firestore) {
      try {
        await setDoc(doc(firestore, 'users', user.id), user);
        return user;
      } catch (err) {
        console.error("Firestore save user error.", err);
      }
    }
    const users = getLocal<User[]>('vogue_users', mockSeeds.MOCK_USERS);
    const index = users.findIndex(u => u.id === user.id);
    if (index >= 0) users[index] = user;
    else users.push(user);
    setLocal('vogue_users', users);
    return user;
  },

  async deleteUser(userId: string): Promise<void> {
    if (isFirebaseEnabled && firestore) {
      try {
        await deleteDoc(doc(firestore, 'users', userId));
        return;
      } catch (err) {
        console.error("Firestore delete user error.", err);
        throw err;
      }
    }
    const users = getLocal<User[]>('vogue_users', mockSeeds.MOCK_USERS);
    const filtered = users.filter(u => u.id !== userId);
    setLocal('vogue_users', filtered);
  },

  async getEmployees(): Promise<Employee[]> {
    if (isFirebaseEnabled && firestore) {
      try {
        const snap = await getDocs(collection(firestore, 'employees'));
        const alreadySeeded = await checkWasAlreadySeeded();
        if (snap.empty && !alreadySeeded) {
          for (const e of mockSeeds.MOCK_EMPLOYEES) {
            await setDoc(doc(firestore, 'employees', e.id), e);
          }
          return mockSeeds.MOCK_EMPLOYEES;
        }
        return snap.docs.map(d => d.data() as Employee);
      } catch (err) {
        console.error("Firestore employees error.", err);
      }
    }
    return getLocal<Employee[]>('vogue_employees', mockSeeds.MOCK_EMPLOYEES);
  },

  async saveEmployee(employee: Employee): Promise<Employee> {
    if (isFirebaseEnabled && firestore) {
      try {
        await setDoc(doc(firestore, 'employees', employee.id), employee);
        return employee;
      } catch (err) {
        console.error("Firestore save employee error.", err);
      }
    }
    const employees = getLocal<Employee[]>('vogue_employees', mockSeeds.MOCK_EMPLOYEES);
    const index = employees.findIndex(e => e.id === employee.id);
    if (index >= 0) employees[index] = employee;
    else employees.push(employee);
    setLocal('vogue_employees', employees);
    return employee;
  },

  async deleteEmployee(employeeId: string): Promise<void> {
    if (isFirebaseEnabled && firestore) {
      try {
        await deleteDoc(doc(firestore, 'employees', employeeId));
        return;
      } catch (err) {
        console.error("Firestore delete employee error.", err);
        throw err;
      }
    }
    const employees = getLocal<Employee[]>('vogue_employees', mockSeeds.MOCK_EMPLOYEES);
    const filtered = employees.filter(e => e.id !== employeeId);
    setLocal('vogue_employees', filtered);
  },

  // ==========================================
  // CATEGORIES & BRANDS
  // ==========================================
  async getCategories(): Promise<Category[]> {
    if (isFirebaseEnabled && firestore) {
      try {
        const snap = await getDocs(collection(firestore, 'categories'));
        const alreadySeeded = await checkWasAlreadySeeded();
        if (snap.empty && !alreadySeeded) {
          for (const c of mockSeeds.MOCK_CATEGORIES) {
            await setDoc(doc(firestore, 'categories', c.id), c);
          }
          return mockSeeds.MOCK_CATEGORIES;
        }
        return snap.docs.map(d => d.data() as Category);
      } catch (err) {
        console.error(err);
      }
    }
    return getLocal<Category[]>('vogue_categories', mockSeeds.MOCK_CATEGORIES);
  },

  async saveCategory(cat: Category): Promise<Category> {
    if (isFirebaseEnabled && firestore) {
      try {
        await setDoc(doc(firestore, 'categories', cat.id), cat);
        return cat;
      } catch (err) {
        console.error(err);
      }
    }
    const list = getLocal<Category[]>('vogue_categories', mockSeeds.MOCK_CATEGORIES);
    const idx = list.findIndex(c => c.id === cat.id);
    if (idx >= 0) list[idx] = cat;
    else list.push(cat);
    setLocal('vogue_categories', list);
    return cat;
  },

  async getBrands(): Promise<Brand[]> {
    if (isFirebaseEnabled && firestore) {
      try {
        const snap = await getDocs(collection(firestore, 'brands'));
        const alreadySeeded = await checkWasAlreadySeeded();
        if (snap.empty && !alreadySeeded) {
          for (const b of mockSeeds.MOCK_BRANDS) {
            await setDoc(doc(firestore, 'brands', b.id), b);
          }
          return mockSeeds.MOCK_BRANDS;
        }
        return snap.docs.map(d => d.data() as Brand);
      } catch (err) {
        console.error(err);
      }
    }
    return getLocal<Brand[]>('vogue_brands', mockSeeds.MOCK_BRANDS);
  },

  async saveBrand(brand: Brand): Promise<Brand> {
    if (isFirebaseEnabled && firestore) {
      try {
        await setDoc(doc(firestore, 'brands', brand.id), brand);
        return brand;
      } catch (err) {
        console.error(err);
      }
    }
    const list = getLocal<Brand[]>('vogue_brands', mockSeeds.MOCK_BRANDS);
    const idx = list.findIndex(b => b.id === brand.id);
    if (idx >= 0) list[idx] = brand;
    else list.push(brand);
    setLocal('vogue_brands', list);
    return brand;
  },

  // ==========================================
  // PRODUCTS & VARIANTS
  // ==========================================
  async getProducts(): Promise<Product[]> {
    if (isFirebaseEnabled && firestore) {
      try {
        const snap = await getDocs(collection(firestore, 'products'));
        const alreadySeeded = await checkWasAlreadySeeded();
        if (snap.empty && !alreadySeeded) {
          for (const p of mockSeeds.MOCK_PRODUCTS) {
            await setDoc(doc(firestore, 'products', p.id), p);
          }
          return mockSeeds.MOCK_PRODUCTS;
        }
        return snap.docs.map(d => d.data() as Product);
      } catch (err) {
        console.error(err);
      }
    }
    return getLocal<Product[]>('vogue_products', mockSeeds.MOCK_PRODUCTS);
  },

  async saveProduct(product: Product): Promise<Product> {
    if (isFirebaseEnabled && firestore) {
      try {
        await setDoc(doc(firestore, 'products', product.id), product);
        return product;
      } catch (err) {
        console.error(err);
        throw err;
      }
    }
    const list = getLocal<Product[]>('vogue_products', mockSeeds.MOCK_PRODUCTS);
    const idx = list.findIndex(p => p.id === product.id);
    if (idx >= 0) list[idx] = product;
    else list.push(product);
    setLocal('vogue_products', list);
    return product;
  },

  async deleteProduct(productId: string): Promise<void> {
    if (isFirebaseEnabled && firestore) {
      try {
        await deleteDoc(doc(firestore, 'products', productId));
        // Also delete variants related to this product in background
        const variantsSnap = await getDocs(query(collection(firestore, 'productVariants'), where('productId', '==', productId)));
        for (const d of variantsSnap.docs) {
          await deleteDoc(d.ref);
        }
        return;
      } catch (err) {
        console.error(err);
        throw err;
      }
    }
    const list = getLocal<Product[]>('vogue_products', mockSeeds.MOCK_PRODUCTS);
    setLocal('vogue_products', list.filter(p => p.id !== productId));
    const variants = getLocal<ProductVariant[]>('vogue_variants', mockSeeds.MOCK_VARIANTS);
    setLocal('vogue_variants', variants.filter(v => v.productId !== productId));
  },

  async getVariants(): Promise<ProductVariant[]> {
    if (isFirebaseEnabled && firestore) {
      try {
        const snap = await getDocs(collection(firestore, 'productVariants'));
        const alreadySeeded = await checkWasAlreadySeeded();
        if (snap.empty && !alreadySeeded) {
          for (const v of mockSeeds.MOCK_VARIANTS) {
            await setDoc(doc(firestore, 'productVariants', v.id), v);
          }
          return mockSeeds.MOCK_VARIANTS;
        }
        return snap.docs.map(d => d.data() as ProductVariant);
      } catch (err) {
        console.error(err);
      }
    }
    return getLocal<ProductVariant[]>('vogue_variants', mockSeeds.MOCK_VARIANTS);
  },

  async saveVariant(variant: ProductVariant): Promise<ProductVariant> {
    if (isFirebaseEnabled && firestore) {
      try {
        await setDoc(doc(firestore, 'productVariants', variant.id), variant);
        return variant;
      } catch (err) {
        console.error(err);
      }
    }
    const list = getLocal<ProductVariant[]>('vogue_variants', mockSeeds.MOCK_VARIANTS);
    const idx = list.findIndex(v => v.id === variant.id);
    if (idx >= 0) list[idx] = variant;
    else list.push(variant);
    setLocal('vogue_variants', list);
    return variant;
  },

  async deleteVariant(variantId: string): Promise<void> {
    if (isFirebaseEnabled && firestore) {
      try {
        await deleteDoc(doc(firestore, 'productVariants', variantId));
        return;
      } catch (err) {
        console.error(err);
        throw err;
      }
    }
    const list = getLocal<ProductVariant[]>('vogue_variants', mockSeeds.MOCK_VARIANTS);
    setLocal('vogue_variants', list.filter(v => v.id !== variantId));
  },

  async adjustVariantStock(variantId: string, delta: number): Promise<number> {
    if (isFirebaseEnabled && firestore) {
      try {
        const docRef = doc(firestore, 'productVariants', variantId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const cur = snap.data() as ProductVariant;
          const newStock = Math.max(0, cur.stock + delta);
          await updateDoc(docRef, { stock: newStock });
          return newStock;
        }
      } catch (err) {
        console.error(err);
      }
    }
    const list = getLocal<ProductVariant[]>('vogue_variants', mockSeeds.MOCK_VARIANTS);
    const idx = list.findIndex(v => v.id === variantId);
    if (idx >= 0) {
      list[idx].stock = Math.max(0, list[idx].stock + delta);
      setLocal('vogue_variants', list);
      return list[idx].stock;
    }
    return 0;
  },

  // ==========================================
  // CUSTOMERS & LOYALTY
  // ==========================================
  async getCustomers(): Promise<Customer[]> {
    if (isFirebaseEnabled && firestore) {
      try {
        const snap = await getDocs(collection(firestore, 'customers'));
        const alreadySeeded = await checkWasAlreadySeeded();
        if (snap.empty && !alreadySeeded) {
          for (const c of mockSeeds.MOCK_CUSTOMERS) {
            await setDoc(doc(firestore, 'customers', c.id), c);
          }
          return mockSeeds.MOCK_CUSTOMERS;
        }
        return snap.docs.map(d => d.data() as Customer);
      } catch (err) {
        console.error(err);
      }
    }
    return getLocal<Customer[]>('vogue_customers', mockSeeds.MOCK_CUSTOMERS);
  },

  async saveCustomer(customer: Customer): Promise<Customer> {
    if (isFirebaseEnabled && firestore) {
      try {
        await setDoc(doc(firestore, 'customers', customer.id), customer);
        return customer;
      } catch (err) {
        console.error(err);
      }
    }
    const list = getLocal<Customer[]>('vogue_customers', mockSeeds.MOCK_CUSTOMERS);
    const idx = list.findIndex(c => c.id === customer.id);
    if (idx >= 0) list[idx] = customer;
    else list.push(customer);
    
    // Automatically recalculate rewards tier based on loyalty points
    let tier: 'Silver' | 'Gold' | 'Platinum' = 'Silver';
    if (customer.loyaltyPoints >= 1000) tier = 'Platinum';
    else if (customer.loyaltyPoints >= 300) tier = 'Gold';
    customer.rewardLevel = tier;

    setLocal('vogue_customers', list);
    return customer;
  },

  // ==========================================
  // SUPPLIERS & PURCHASES
  // ==========================================
  async getSuppliers(): Promise<Supplier[]> {
    if (isFirebaseEnabled && firestore) {
      try {
        const snap = await getDocs(collection(firestore, 'suppliers'));
        const alreadySeeded = await checkWasAlreadySeeded();
        if (snap.empty && !alreadySeeded) {
          for (const s of mockSeeds.MOCK_SUPPLIERS) {
            await setDoc(doc(firestore, 'suppliers', s.id), s);
          }
          return mockSeeds.MOCK_SUPPLIERS;
        }
        return snap.docs.map(d => d.data() as Supplier);
      } catch (err) {
        console.error(err);
      }
    }
    return getLocal<Supplier[]>('vogue_suppliers', mockSeeds.MOCK_SUPPLIERS);
  },

  async saveSupplier(supplier: Supplier): Promise<Supplier> {
    if (isFirebaseEnabled && firestore) {
      try {
        await setDoc(doc(firestore, 'suppliers', supplier.id), supplier);
        return supplier;
      } catch (err) {
        console.error(err);
      }
    }
    const list = getLocal<Supplier[]>('vogue_suppliers', mockSeeds.MOCK_SUPPLIERS);
    const idx = list.findIndex(s => s.id === supplier.id);
    if (idx >= 0) list[idx] = supplier;
    else list.push(supplier);
    setLocal('vogue_suppliers', list);
    return supplier;
  },

  async getPurchases(): Promise<PurchaseOrder[]> {
    if (isFirebaseEnabled && firestore) {
      try {
        const snap = await getDocs(collection(firestore, 'purchaseOrders'));
        const alreadySeeded = await checkWasAlreadySeeded();
        if (snap.empty && !alreadySeeded) {
          for (const p of mockSeeds.MOCK_PURCHASES) {
            await setDoc(doc(firestore, 'purchaseOrders', p.id), p);
          }
          return mockSeeds.MOCK_PURCHASES;
        }
        return snap.docs.map(d => d.data() as PurchaseOrder);
      } catch (err) {
        console.error(err);
      }
    }
    return getLocal<PurchaseOrder[]>('vogue_purchases', mockSeeds.MOCK_PURCHASES);
  },

  async savePurchase(purchase: PurchaseOrder): Promise<PurchaseOrder> {
    if (isFirebaseEnabled && firestore) {
      try {
        await setDoc(doc(firestore, 'purchaseOrders', purchase.id), purchase);
        return purchase;
      } catch (err) {
        console.error(err);
      }
    }
    const list = getLocal<PurchaseOrder[]>('vogue_purchases', mockSeeds.MOCK_PURCHASES);
    const idx = list.findIndex(p => p.id === purchase.id);
    if (idx >= 0) list[idx] = purchase;
    else list.push(purchase);
    setLocal('vogue_purchases', list);
    return purchase;
  },

  // ==========================================
  // EXPENSES
  // ==========================================
  async getExpenses(): Promise<Expense[]> {
    if (isFirebaseEnabled && firestore) {
      try {
        const snap = await getDocs(collection(firestore, 'expenses'));
        const alreadySeeded = await checkWasAlreadySeeded();
        if (snap.empty && !alreadySeeded) {
          for (const e of mockSeeds.MOCK_EXPENSES) {
            await setDoc(doc(firestore, 'expenses', e.id), e);
          }
          return mockSeeds.MOCK_EXPENSES;
        }
        return snap.docs.map(d => d.data() as Expense);
      } catch (err) {
        console.error(err);
      }
    }
    return getLocal<Expense[]>('vogue_expenses', mockSeeds.MOCK_EXPENSES);
  },

  async saveExpense(expense: Expense): Promise<Expense> {
    if (isFirebaseEnabled && firestore) {
      try {
        await setDoc(doc(firestore, 'expenses', expense.id), expense);
        return expense;
      } catch (err) {
        console.error(err);
      }
    }
    const list = getLocal<Expense[]>('vogue_expenses', mockSeeds.MOCK_EXPENSES);
    const idx = list.findIndex(e => e.id === expense.id);
    if (idx >= 0) list[idx] = expense;
    else list.push(expense);
    setLocal('vogue_expenses', list);
    return expense;
  },

  async deleteExpense(expenseId: string): Promise<void> {
    if (isFirebaseEnabled && firestore) {
      try {
        await deleteDoc(doc(firestore, 'expenses', expenseId));
        return;
      } catch (err) {
        console.error(err);
        throw err;
      }
    }
    const list = getLocal<Expense[]>('vogue_expenses', mockSeeds.MOCK_EXPENSES);
    setLocal('vogue_expenses', list.filter(e => e.id !== expenseId));
  },

  // ==========================================
  // SALES (POS TRANSACTION CHECKOUT)
  // ==========================================
  async getSales(): Promise<Sale[]> {
    if (isFirebaseEnabled && firestore) {
      try {
        const snap = await getDocs(collection(firestore, 'sales'));
        const alreadySeeded = await checkWasAlreadySeeded();
        if (snap.empty && !alreadySeeded) {
          for (const s of mockSeeds.MOCK_SALES) {
            await setDoc(doc(firestore, 'sales', s.id), s);
          }
          return mockSeeds.MOCK_SALES;
        }
        return snap.docs.map(d => d.data() as Sale);
      } catch (err) {
        console.error(err);
      }
    }
    return getLocal<Sale[]>('vogue_sales', mockSeeds.MOCK_SALES);
  },

  async checkoutSale(sale: Sale): Promise<Sale> {
    // 1. Save Sale to Database
    if (isFirebaseEnabled && firestore) {
      try {
        await setDoc(doc(firestore, 'sales', sale.id), sale);
      } catch (err) {
        console.error("Firestore checkout save failed.", err);
      }
    } else {
      const sales = getLocal<Sale[]>('vogue_sales', mockSeeds.MOCK_SALES);
      sales.push(sale);
      setLocal('vogue_sales', sales);
    }

    // 2. Adjust Product Variant stock counts
    for (const item of sale.items) {
      await this.adjustVariantStock(item.variantId, -item.quantity);
    }

    // 3. Update Customer Loyalty Points
    if (sale.customerId && sale.customerId !== 'walk-in') {
      const customers = await this.getCustomers();
      const cIdx = customers.findIndex(c => c.id === sale.customerId);
      if (cIdx >= 0) {
        const cust = customers[cIdx];
        cust.loyaltyPoints = Math.max(0, cust.loyaltyPoints - sale.loyaltyPointsRedeemed + sale.loyaltyPointsEarned);
        await this.saveCustomer(cust);
      }
    }

    return sale;
  },

  // ==========================================
  // RETURNS & EXCHANGES
  // ==========================================
  async getReturns(): Promise<Return[]> {
    if (isFirebaseEnabled && firestore) {
      try {
        const snap = await getDocs(collection(firestore, 'returns'));
        return snap.docs.map(d => d.data() as Return);
      } catch (err) {
        console.error(err);
      }
    }
    return getLocal<Return[]>('vogue_returns', []);
  },

  async processReturn(ret: Return): Promise<Return> {
    // 1. Add return record
    if (isFirebaseEnabled && firestore) {
      try {
        await setDoc(doc(firestore, 'returns', ret.id), ret);
      } catch (err) {
        console.error(err);
      }
    } else {
      const returns = getLocal<Return[]>('vogue_returns', []);
      returns.push(ret);
      setLocal('vogue_returns', returns);
    }

    // 2. Adjust inventory: Return stock back to inventory
    await this.adjustVariantStock(ret.variantId, ret.quantity);

    // 3. If exchange, deduct exchange variant stock
    if (ret.type === 'exchange' && ret.exchangeVariantId) {
      await this.adjustVariantStock(ret.exchangeVariantId, -ret.quantity);
    }

    return ret;
  }
};
