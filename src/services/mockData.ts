import { 
  User, Employee, Category, Brand, Product, ProductVariant, 
  Customer, PurchaseOrder, Sale, Expense, Supplier, AuditLog, StoreSettings 
} from '../types';

export const MOCK_SETTINGS: StoreSettings = {
  storeName: "LINO MENSWEAR",
  storeLogo: "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\" fill=\"%23111827\"/><circle cx=\"50\" cy=\"50\" r=\"40\" stroke=\"%23fbbf24\" stroke-width=\"2\" fill=\"none\"/><path d=\"M35 65 L42 40 L50 55 L58 40 L65 65\" stroke=\"%23fbbf24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" fill=\"none\"/><path d=\"M45 32 L50 25 L55 32 Z\" fill=\"%23fbbf24\"/></svg>",
  gstNumber: "27AAPCV1234F1Z9",
  invoicePrefix: "VOG-",
  taxPercentage: 18, // GST 18% standard
  currency: "₹",
  theme: "dark",
  loyaltyPointsRatio: 0.05, // 5% of order value earned as points
  loyaltyRedemptionValue: 1, // 1 point = $1
  lowStockAlertLevel: 5
};

export const MOCK_USERS: User[] = [
  { id: "u-admin", username: "Super Admin", email: "admin@voguemenswear.com", role: "super_admin", status: "active", createdAt: "2026-01-01T10:00:00Z" },
  { id: "u-manager", username: "Store Manager", email: "manager@voguemenswear.com", role: "store_manager", status: "active", createdAt: "2026-01-02T10:00:00Z" },
  { id: "u-cashier", username: "Cashier John", email: "cashier@voguemenswear.com", role: "cashier", status: "active", createdAt: "2026-01-03T10:00:00Z" },
  { id: "u-inventory", username: "Inventory Staff", email: "inventory@voguemenswear.com", role: "inventory_staff", status: "active", createdAt: "2026-01-04T10:00:00Z" },
  { id: "u-accountant", username: "Accountant Dave", email: "accountant@voguemenswear.com", role: "accountant", status: "active", createdAt: "2026-01-05T10:00:00Z" }
];

export const MOCK_EMPLOYEES: Employee[] = [
  { id: "e-admin", name: "Super Admin", phone: "9876543210", email: "admin@voguemenswear.com", birthday: "1990-05-15", address: "123 Main St, Fashion City", salary: 7500, role: "super_admin", status: "active", attendance: {}, createdAt: "2026-01-01T10:00:00Z" },
  { id: "e-manager", name: "Store Manager", phone: "9876543211", email: "manager@voguemenswear.com", birthday: "1988-11-20", address: "456 Oak Rd, Metroville", salary: 4500, role: "store_manager", status: "active", attendance: {}, createdAt: "2026-01-02T10:00:00Z" },
  { id: "e-cashier", name: "Cashier John", phone: "9876543212", email: "cashier@voguemenswear.com", birthday: "1995-02-10", address: "789 Pine Ave, Uptown", salary: 2800, role: "cashier", status: "active", attendance: {}, createdAt: "2026-01-03T10:00:00Z" },
  { id: "e-inventory", name: "Inventory Staff", phone: "9876543213", email: "inventory@voguemenswear.com", birthday: "1997-08-25", address: "101 Elm St, Warehouse District", salary: 2600, role: "inventory_staff", status: "active", attendance: {}, createdAt: "2026-01-04T10:00:00Z" },
  { id: "e-accountant", name: "Accountant Dave", phone: "9876543214", email: "accountant@voguemenswear.com", birthday: "1991-12-05", address: "202 Finance Towers, Business City", salary: 3800, role: "accountant", status: "active", attendance: {}, createdAt: "2026-01-05T10:00:00Z" }
];

export const MOCK_CATEGORIES: Category[] = [
  { id: "cat-suits", name: "Suits", description: "Premium formal wear and blazers" },
  { id: "cat-shirts", name: "Shirts", description: "Formal and casual button-up shirts" },
  { id: "cat-trousers", name: "Trousers", description: "Chinos, formal trousers and denim jeans" },
  { id: "cat-jackets", name: "Jackets", description: "Winter coats, leather jackets and bombers" },
  { id: "cat-tshirts", name: "T-Shirts", description: "Casual cotton tees and polo shirts" }
];

export const MOCK_BRANDS: Brand[] = [
  { id: "brand-armani", name: "Giorgio Armani" },
  { id: "brand-ralph", name: "Ralph Lauren" },
  { id: "brand-tommy", name: "Tommy Hilfiger" },
  { id: "brand-zara", name: "Zara Men" },
  { id: "brand-ck", name: "Calvin Klein" }
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "p-suit",
    barcode: "890100100011",
    sku: "SU-ARM-SLIM-BLK",
    name: "Luxury Slim Fit Suit",
    description: "Tailored suit crafted from 100% fine Italian wool. Features dynamic classic lapels, internal padding, and matching flat-front trousers.",
    brand: "Giorgio Armani",
    category: "Suits",
    purchasePrice: 450,
    sellingPrice: 899,
    discount: 10,
    gst: 18,
    image: "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 200\"><rect width=\"200\" height=\"200\" rx=\"16\" fill=\"%231e293b\"/><path d=\"M60 40 L100 25 L140 40\" stroke=\"%2394a3b8\" stroke-width=\"4\" fill=\"none\"/><path d=\"M100 25 C100 15 90 15 90 20\" stroke=\"%2394a3b8\" stroke-width=\"4\" fill=\"none\"/><path d=\"M40 70 L60 55 L140 55 L160 70 L160 170 L40 170 Z\" fill=\"%230f172a\" stroke=\"%234f46e5\" stroke-width=\"3\"/><path d=\"M100 55 L75 100 L100 140 L125 100 Z\" fill=\"%231e293b\" stroke=\"%234f46e5\" stroke-width=\"2\"/><path d=\"M100 55 L95 65 L100 110 L105 65 Z\" fill=\"%23ef4444\"/><path d=\"M85 55 L100 70 L115 55\" fill=\"none\" stroke=\"%23ffffff\" stroke-width=\"3\"/><path d=\"M60 90 L75 90 L70 80 Z\" fill=\"%23ef4444\"/></svg>",
    supplierId: "sup-elite",
    status: "active",
    createdAt: "2026-02-10T11:00:00Z",
    updatedAt: "2026-02-10T11:00:00Z"
  },
  {
    id: "p-shirt",
    barcode: "890100100022",
    sku: "SH-RL-OXF-WHT",
    name: "Premium Cotton Oxford Shirt",
    description: "Classic button-down collar Oxford shirt made of lightweight breathable premium cotton. Finished with the signature embroidered pony.",
    brand: "Ralph Lauren",
    category: "Shirts",
    purchasePrice: 40,
    sellingPrice: 95,
    discount: 0,
    gst: 12,
    image: "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 200\"><rect width=\"200\" height=\"200\" rx=\"16\" fill=\"%230ea5e9\" fill-opacity=\"0.1\"/><path d=\"M50 40 L150 40 L160 70 L140 170 L60 170 L40 70 Z\" fill=\"%23ffffff\" stroke=\"%230ea5e9\" stroke-width=\"3\"/><path d=\"M100 65 L70 40 L100 40 L130 40 Z\" fill=\"%23f8fafc\" stroke=\"%230ea5e9\" stroke-width=\"3\"/><line x1=\"100\" y1=\"65\" x2=\"100\" y2=\"170\" stroke=\"%230ea5e9\" stroke-width=\"2\" stroke-dasharray=\"2,6\"/><rect x=\"110\" y=\"80\" width=\"25\" height=\"30\" rx=\"2\" fill=\"none\" stroke=\"%230ea5e9\" stroke-width=\"2\"/></svg>",
    supplierId: "sup-fabrics",
    status: "active",
    createdAt: "2026-02-11T11:00:00Z",
    updatedAt: "2026-02-11T11:00:00Z"
  },
  {
    id: "p-chino",
    barcode: "890100100033",
    sku: "TR-TH-CHIN-BEG",
    name: "Classic Stretch Chino Pants",
    description: "Features a comfortable stretch-cotton blend, relaxed slim fit, button-closed back pockets, and customized belt loops.",
    brand: "Tommy Hilfiger",
    category: "Trousers",
    purchasePrice: 35,
    sellingPrice: 79,
    discount: 5,
    gst: 12,
    image: "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 200\"><rect width=\"200\" height=\"200\" rx=\"16\" fill=\"%23f59e0b\" fill-opacity=\"0.1\"/><path d=\"M60 40 L140 40 L145 55 L55 55 Z\" fill=\"%23d97706\"/><path d=\"M55 55 L70 175 L95 175 L100 90 L105 175 L130 175 L145 55 Z\" fill=\"%23f59e0b\" stroke=\"%23b45309\" stroke-width=\"3\"/><path d=\"M65 55 C65 65 75 75 75 75\" stroke=\"%23b45309\" stroke-width=\"2\" fill=\"none\"/><path d=\"M135 55 C135 65 125 75 125 75\" stroke=\"%23b45309\" stroke-width=\"2\" fill=\"none\"/></svg>",
    supplierId: "sup-apex",
    status: "active",
    createdAt: "2026-02-12T11:00:00Z",
    updatedAt: "2026-02-12T11:00:00Z"
  },
  {
    id: "p-jacket",
    barcode: "890100100044",
    sku: "JK-ZAR-BOMB-BRW",
    name: "Designer Leather Bomber Jacket",
    description: "Distressed faux leather jacket featuring elastic rib cuffs, dual zipper compartments, and warm quilted inner lining.",
    brand: "Zara Men",
    category: "Jackets",
    purchasePrice: 65,
    sellingPrice: 149,
    discount: 15,
    gst: 18,
    image: "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 200\"><rect width=\"200\" height=\"200\" rx=\"16\" fill=\"%23ef4444\" fill-opacity=\"0.1\"/><path d=\"M40 70 L60 50 L140 50 L160 70 L155 160 L140 170 L60 170 L45 160 Z\" fill=\"%2378350f\" stroke=\"%23451a03\" stroke-width=\"3\"/><path d=\"M80 50 C80 40 120 40 120 50\" fill=\"none\" stroke=\"%23451a03\" stroke-width=\"4\"/><line x1=\"100\" y1=\"50\" x2=\"100\" y2=\"170\" stroke=\"%23fbbf24\" stroke-width=\"3\" stroke-dasharray=\"4,2\"/><line x1=\"65\" y1=\"120\" x2=\"80\" y2=\"110\" stroke=\"%23fbbf24\" stroke-width=\"2\"/><line x1=\"135\" y1=\"120\" x2=\"120\" y2=\"110\" stroke=\"%23fbbf24\" stroke-width=\"2\"/></svg>",
    supplierId: "sup-elite",
    status: "active",
    createdAt: "2026-02-13T11:00:00Z",
    updatedAt: "2026-02-13T11:00:00Z"
  },
  {
    id: "p-tshirt",
    barcode: "890100100055",
    sku: "TS-CK-CREW-GRY",
    name: "Crewneck Cotton T-Shirt",
    description: "Essential crewneck tee built with ultra-soft combed cotton. Regular fit, lightweight structure, and high durability.",
    brand: "Calvin Klein",
    category: "T-Shirts",
    purchasePrice: 12,
    sellingPrice: 29,
    discount: 0,
    gst: 5,
    image: "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 200\"><rect width=\"200\" height=\"200\" rx=\"16\" fill=\"%236366f1\" fill-opacity=\"0.1\"/><path d=\"M40 60 L65 45 L85 52 C90 48 110 48 115 52 L135 45 L160 60 L148 90 L135 85 L135 170 L65 170 L65 85 L52 90 Z\" fill=\"%236366f1\" stroke=\"%234f46e5\" stroke-width=\"3\"/><path d=\"M85 52 C90 56 110 56 115 52\" fill=\"none\" stroke=\"%234f46e5\" stroke-width=\"3\"/></svg>",
    supplierId: "sup-apex",
    status: "active",
    createdAt: "2026-02-14T11:00:00Z",
    updatedAt: "2026-02-14T11:00:00Z"
  }
];

export const MOCK_VARIANTS: ProductVariant[] = [
  // Luxury Suit Variants (Sizes 38, 40, 42; Black & Navy)
  { id: "v-suit-38-blk", productId: "p-suit", productName: "Luxury Slim Fit Suit", color: "Black", size: "38", material: "Wool", stock: 12, lowStockThreshold: 3, barcode: "890100100011", sku: "SU-ARM-SLIM-BLK-38" },
  { id: "v-suit-40-blk", productId: "p-suit", productName: "Luxury Slim Fit Suit", color: "Black", size: "40", material: "Wool", stock: 8, lowStockThreshold: 3, barcode: "890100100012", sku: "SU-ARM-SLIM-BLK-40" },
  { id: "v-suit-42-blk", productId: "p-suit", productName: "Luxury Slim Fit Suit", color: "Black", size: "42", material: "Wool", stock: 2, lowStockThreshold: 3, barcode: "890100100013", sku: "SU-ARM-SLIM-BLK-42" }, // low stock
  { id: "v-suit-40-nvy", productId: "p-suit", productName: "Luxury Slim Fit Suit", color: "Navy", size: "40", material: "Wool", stock: 6, lowStockThreshold: 3, barcode: "890100100014", sku: "SU-ARM-SLIM-NVY-40" },

  // Oxford Shirt Variants (Sizes M, L, XL; White & Light Blue)
  { id: "v-shirt-m-wht", productId: "p-shirt", productName: "Premium Cotton Oxford Shirt", color: "White", size: "M", material: "Cotton", stock: 25, lowStockThreshold: 5, barcode: "890100100022", sku: "SH-RL-OXF-WHT-M" },
  { id: "v-shirt-l-wht", productId: "p-shirt", productName: "Premium Cotton Oxford Shirt", color: "White", size: "L", material: "Cotton", stock: 18, lowStockThreshold: 5, barcode: "890100100023", sku: "SH-RL-OXF-WHT-L" },
  { id: "v-shirt-xl-wht", productId: "p-shirt", productName: "Premium Cotton Oxford Shirt", color: "White", size: "XL", material: "Cotton", stock: 0, lowStockThreshold: 5, barcode: "890100100024", sku: "SH-RL-OXF-WHT-XL" }, // out of stock
  { id: "v-shirt-m-lbl", productId: "p-shirt", productName: "Premium Cotton Oxford Shirt", color: "Light Blue", size: "M", material: "Cotton", stock: 15, lowStockThreshold: 5, barcode: "890100100025", sku: "SH-RL-OXF-LBL-M" },
  { id: "v-shirt-l-lbl", productId: "p-shirt", productName: "Premium Cotton Oxford Shirt", color: "Light Blue", size: "L", material: "Cotton", stock: 14, lowStockThreshold: 5, barcode: "890100100026", sku: "SH-RL-OXF-LBL-L" },

  // Chino Pants (Sizes 32, 34, 36; Beige)
  { id: "v-chino-32-beg", productId: "p-chino", productName: "Classic Stretch Chino Pants", color: "Beige", size: "32", material: "Cotton Blend", stock: 20, lowStockThreshold: 5, barcode: "890100100033", sku: "TR-TH-CHIN-BEG-32" },
  { id: "v-chino-34-beg", productId: "p-chino", productName: "Classic Stretch Chino Pants", color: "Beige", size: "34", material: "Cotton Blend", stock: 15, lowStockThreshold: 5, barcode: "890100100034", sku: "TR-TH-CHIN-BEG-34" },
  { id: "v-chino-36-beg", productId: "p-chino", productName: "Classic Stretch Chino Pants", color: "Beige", size: "36", material: "Cotton Blend", stock: 3, lowStockThreshold: 5, barcode: "890100100035", sku: "TR-TH-CHIN-BEG-36" }, // low stock

  // Jacket (Sizes M, L; Brown & Black)
  { id: "v-jacket-m-brw", productId: "p-jacket", productName: "Designer Leather Bomber Jacket", color: "Brown", size: "M", material: "Faux Leather", stock: 4, lowStockThreshold: 2, barcode: "890100100044", sku: "JK-ZAR-BOMB-BRW-M" },
  { id: "v-jacket-l-brw", productId: "p-jacket", productName: "Designer Leather Bomber Jacket", color: "Brown", size: "L", material: "Faux Leather", stock: 5, lowStockThreshold: 2, barcode: "890100100045", sku: "JK-ZAR-BOMB-BRW-L" },
  { id: "v-jacket-m-blk", productId: "p-jacket", productName: "Designer Leather Bomber Jacket", color: "Black", size: "M", material: "Faux Leather", stock: 1, lowStockThreshold: 2, barcode: "890100100046", sku: "JK-ZAR-BOMB-BLK-M" }, // low stock

  // T-Shirt (Sizes S, M, L; Grey)
  { id: "v-tshirt-s-gry", productId: "p-tshirt", productName: "Crewneck Cotton T-Shirt", color: "Heather Grey", size: "S", material: "Cotton", stock: 40, lowStockThreshold: 8, barcode: "890100100055", sku: "TS-CK-CREW-GRY-S" },
  { id: "v-tshirt-m-gry", productId: "p-tshirt", productName: "Crewneck Cotton T-Shirt", color: "Heather Grey", size: "M", material: "Cotton", stock: 35, lowStockThreshold: 8, barcode: "890100100056", sku: "TS-CK-CREW-GRY-M" },
  { id: "v-tshirt-l-gry", productId: "p-tshirt", productName: "Crewneck Cotton T-Shirt", color: "Heather Grey", size: "L", material: "Cotton", stock: 4, lowStockThreshold: 8, barcode: "890100100057", sku: "TS-CK-CREW-GRY-L" } // low stock
];

export const MOCK_CUSTOMERS: Customer[] = [
  { id: "c-john", name: "John Doe", phone: "9820098200", email: "john.doe@gmail.com", birthday: "1992-04-18", address: "Flat 402, Sunset Towers, Bandra, Mumbai", loyaltyPoints: 120, rewardLevel: "Silver", createdAt: "2026-01-15T09:00:00Z" },
  { id: "c-alice", name: "Alice Smith", phone: "9830098300", email: "alice.smith@yahoo.com", birthday: "1989-09-02", address: "Villa 12, Palms Estate, Juhu, Mumbai", loyaltyPoints: 580, rewardLevel: "Gold", createdAt: "2026-01-20T14:30:00Z" },
  { id: "c-bob", name: "Bob Johnson", phone: "9840098400", email: "bob.johnson@outlook.com", birthday: "1985-06-25", address: "Penthouse C, Crestview Heights, Colaba, Mumbai", loyaltyPoints: 1850, rewardLevel: "Platinum", createdAt: "2026-01-22T11:15:00Z" }
];

export const MOCK_SUPPLIERS: Supplier[] = [
  { id: "sup-elite", name: "Elite Apparel Distributors", company: "Elite Garments Pvt Ltd", gstNumber: "27AAAEC9876D1Z5", phone: "9910099100", email: "orders@elitegarments.com", address: "B-22 Industrial Estate, Okhla, New Delhi", pendingPayments: 1800, createdAt: "2026-01-05T08:00:00Z" },
  { id: "sup-fabrics", name: "Premium Fabrics Corp", company: "Premium Fabrics Corp", gstNumber: "07AAAPC4321A1Z2", phone: "9920099200", email: "sales@premiumfabrics.in", address: "44 textile hub, Surat, Gujarat", pendingPayments: 0, createdAt: "2026-01-10T10:00:00Z" },
  { id: "sup-apex", name: "Apex Garments Ltd", company: "Apex Garments Manufacturing", gstNumber: "24AAAPA6543C2Z0", phone: "9930099300", email: "apex@garments.co.in", address: "Plot 105, GIDC Apparel Park, Ahmedabad, Gujarat", pendingPayments: 450, createdAt: "2026-01-12T12:00:00Z" }
];

export const MOCK_PURCHASES: PurchaseOrder[] = [
  {
    id: "po-101",
    supplierId: "sup-elite",
    supplierName: "Elite Apparel Distributors",
    status: "Received",
    totalAmount: 1350,
    items: [
      { variantId: "v-suit-38-blk", productName: "Luxury Slim Fit Suit", color: "Black", size: "38", costPrice: 450, quantity: 3 }
    ],
    createdAt: "2026-06-05T10:00:00Z"
  },
  {
    id: "po-102",
    supplierId: "sup-apex",
    supplierName: "Apex Garments Ltd",
    status: "Pending",
    totalAmount: 450,
    items: [
      { variantId: "v-tshirt-s-gry", productName: "Crewneck Cotton T-Shirt", color: "Heather Grey", size: "S", costPrice: 12, quantity: 20 },
      { variantId: "v-chino-32-beg", productName: "Classic Stretch Chino Pants", color: "Beige", size: "32", costPrice: 35, quantity: 6 }
    ],
    createdAt: "2026-07-02T11:30:00Z"
  }
];

export const MOCK_EXPENSES: Expense[] = [
  { id: "exp-1", category: "Rent", amount: 2000, date: "2026-06-01", description: "Monthly retail store outlet rent", createdAt: "2026-06-01T09:00:00Z" },
  { id: "exp-2", category: "Electricity", amount: 320, date: "2026-06-15", description: "Electricity bill for May 2026", createdAt: "2026-06-15T10:00:00Z" },
  { id: "exp-3", category: "Salary", amount: 2800, date: "2026-06-30", description: "Employee salaries for June 2026", createdAt: "2026-06-30T17:00:00Z" },
  { id: "exp-4", category: "Internet", amount: 60, date: "2026-06-05", description: "High-speed broadband monthly subscription", createdAt: "2026-06-05T12:00:00Z" },
  { id: "exp-5", category: "Marketing", amount: 450, date: "2026-06-12", description: "Facebook and Instagram local ads campaign", createdAt: "2026-06-12T14:00:00Z" }
];

export const MOCK_SALES: Sale[] = [
  {
    id: "sale-2001",
    invoiceNumber: "VOG-10001",
    customerId: "c-john",
    customerName: "John Doe",
    customerPhone: "9820098200",
    cashierId: "e-cashier",
    cashierName: "Cashier John",
    subtotal: 809.1, // $899 - 10% product discount = 809.1
    discountAmount: 50, // customer coupon/loyalty reward discount
    gstAmount: 136.64, // (809.1 - 50) * 18% = 136.64
    loyaltyPointsRedeemed: 50,
    loyaltyPointsEarned: 40,
    totalAmount: 895.74, // 809.1 - 50 + 136.64
    paymentMethod: "UPI",
    items: [
      {
        variantId: "v-suit-38-blk",
        productId: "p-suit",
        name: "Luxury Slim Fit Suit",
        color: "Black",
        size: "38",
        price: 809.1,
        quantity: 1,
        discountApplied: 0,
        gstRate: 18,
        total: 809.1
      }
    ],
    createdAt: "2026-06-10T15:20:00Z"
  },
  {
    id: "sale-2002",
    invoiceNumber: "VOG-10002",
    customerId: "c-alice",
    customerName: "Alice Smith",
    customerPhone: "9830098300",
    cashierId: "e-cashier",
    cashierName: "Cashier John",
    subtotal: 245.2, // 1 oxford shirt ($95) + 2 chinos ($79 - 5% = $75.1 * 2 = $150.2) = $245.2
    discountAmount: 0,
    gstAmount: 29.42, // $245.2 * 12% = 29.42
    loyaltyPointsRedeemed: 0,
    loyaltyPointsEarned: 12,
    totalAmount: 274.62,
    paymentMethod: "Credit Card",
    items: [
      {
        variantId: "v-shirt-m-wht",
        productId: "p-shirt",
        name: "Premium Cotton Oxford Shirt",
        color: "White",
        size: "M",
        price: 95,
        quantity: 1,
        discountApplied: 0,
        gstRate: 12,
        total: 95
      },
      {
        variantId: "v-chino-32-beg",
        productId: "p-chino",
        name: "Classic Stretch Chino Pants",
        color: "Beige",
        size: "32",
        price: 75.1,
        quantity: 2,
        discountApplied: 0,
        gstRate: 12,
        total: 150.2
      }
    ],
    createdAt: "2026-06-25T11:45:00Z"
  },
  {
    id: "sale-2003",
    invoiceNumber: "VOG-10003",
    customerId: "c-bob",
    customerName: "Bob Johnson",
    customerPhone: "9840098400",
    cashierId: "e-cashier",
    cashierName: "Cashier John",
    subtotal: 254.65, // 1 jacket ($149 - 15% = 126.65) + 1 suit ($809.1) ... let's just make it: 2 jackets ($253.3)
    discountAmount: 100, // Redeemed points
    gstAmount: 27.59, // ($253.3 - 100) * 18% = 27.59
    loyaltyPointsRedeemed: 100,
    loyaltyPointsEarned: 12,
    totalAmount: 180.89,
    paymentMethod: "Split Payment",
    paymentDetails: {
      splitDetails: {
        "Cash": 80.89,
        "Credit Card": 100
      }
    },
    items: [
      {
        variantId: "v-jacket-m-brw",
        productId: "p-jacket",
        name: "Designer Leather Bomber Jacket",
        color: "Brown",
        size: "M",
        price: 126.65,
        quantity: 2,
        discountApplied: 0,
        gstRate: 18,
        total: 253.3
      }
    ],
    createdAt: "2026-07-06T18:10:00Z"
  }
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: "log-1", userId: "e-admin", username: "Super Admin", role: "super_admin", action: "User Creation", details: "Created employee user account cashier@voguemenswear.com", timestamp: "2026-01-03T10:05:00Z" },
  { id: "log-2", userId: "e-manager", username: "Store Manager", role: "store_manager", action: "Inventory Update", details: "Adjusted stock for variant v-suit-38-blk: Set stock to 12", timestamp: "2026-02-10T12:00:00Z" },
  { id: "log-3", userId: "e-cashier", username: "Cashier John", role: "cashier", action: "Sales Completed", details: "Generated invoice VOG-10001 for John Doe (Total: $895.74)", timestamp: "2026-06-10T15:20:00Z" },
  { id: "log-4", userId: "e-cashier", username: "Cashier John", role: "cashier", action: "Login", details: "User logged in from cashier terminal", timestamp: "2026-07-07T09:00:00Z" }
];
