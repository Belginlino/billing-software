import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../../services/db';
import { Product, ProductVariant, Customer, Sale, SaleItem, PaymentMethod } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useBarcode } from '../../hooks/useBarcode';
import { toast } from 'react-toastify';
import { 
  FiSearch, FiTrash2, FiPlus, FiMinus, FiUser, 
  FiPercent, FiTag, FiPrinter, FiCheckCircle, FiShoppingBag 
} from 'react-icons/fi';
import { formatCurrency, printDocument } from '../../utils/export';

export const POS: React.FC = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const currencySymbol = settings?.currency || '₹';

  // State Lists
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Cart & checkout states
  const [cart, setCart] = useState<{ variant: ProductVariant; quantity: number }[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchPhone, setSearchPhone] = useState('');
  const [itemDiscount, setItemDiscount] = useState<number>(0); // manual absolute transaction discount
  const [redeemPoints, setRedeemPoints] = useState<boolean>(false);

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [splitDetails, setSplitDetails] = useState<{ [key: string]: number }>({ 'Cash': 0, 'Credit Card': 0 });
  const [referenceNo, setReferenceNo] = useState('');

  // UI state filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [categories, setCategories] = useState<string[]>(['All']);
  
  // Modals / Overlays
  const [activeVariantSelectProduct, setActiveVariantSelectProduct] = useState<Product | null>(null);
  const [checkoutResultSale, setCheckoutResultSale] = useState<Sale | null>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  // Quick Customer Register State
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'catalog' | 'cart'>('catalog');

  useEffect(() => {
    const loadPOSData = async () => {
      try {
        const [prodList, varList, custList] = await Promise.all([
          dbService.getProducts(),
          dbService.getVariants(),
          dbService.getCustomers()
        ]);
        // Only active products
        const activeProds = prodList.filter(p => p.status === 'active');
        setProducts(activeProds);
        setVariants(varList);
        setCustomers(custList);

        // Derive categories
        const cats = ['All', ...new Set(activeProds.map(p => p.category))];
        setCategories(cats);
      } catch (err) {
        toast.error("Failed to load POS catalog data.");
      }
    };
    loadPOSData();
  }, []);

  // Barcode Scanner Listener
  useBarcode({
    onScan: (scannedBarcode) => {
      // Find variant by barcode
      const match = variants.find(v => v.barcode === scannedBarcode);
      if (match) {
        const prod = products.find(p => p.id === match.productId);
        if (prod) {
          addVariantToCart(match);
          toast.success(`Scanned: ${prod.name} (${match.color}/${match.size})`);
        }
      } else {
        toast.warning(`Barcode "${scannedBarcode}" not recognized.`);
      }
    }
  });

  const addVariantToCart = (variant: ProductVariant) => {
    if (variant.stock <= 0) {
      toast.error("Item is out of stock!");
      return;
    }

    setCart(prev => {
      const idx = prev.findIndex(item => item.variant.id === variant.id);
      if (idx >= 0) {
        const newQty = prev[idx].quantity + 1;
        if (newQty > variant.stock) {
          toast.warning(`Cannot exceed available stock of ${variant.stock} units.`);
          return prev;
        }
        const updated = [...prev];
        updated[idx] = { ...prev[idx], quantity: newQty };
        return updated;
      }
      return [...prev, { variant, quantity: 1 }];
    });
  };

  const removeVariantFromCart = (variantId: string) => {
    setCart(prev => prev.filter(item => item.variant.id !== variantId));
  };

  const updateCartQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeVariantFromCart(variantId);
      return;
    }
    const item = cart.find(i => i.variant.id === variantId);
    if (!item) return;

    if (quantity > item.variant.stock) {
      toast.warning(`Only ${item.variant.stock} units available in stock.`);
      return;
    }

    setCart(prev => prev.map(i => i.variant.id === variantId ? { ...i, quantity } : i));
  };

  // Customer selection
  const handleSearchCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPhone) {
      setSelectedCustomer(null);
      return;
    }
    const match = customers.find(c => c.phone.includes(searchPhone));
    if (match) {
      setSelectedCustomer(match);
      toast.success(`Customer associated: ${match.name}`);
    } else {
      toast.error("Customer phone not found.");
    }
  };

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) {
      toast.error("Name and Phone are required.");
      return;
    }
    try {
      const newCustomer: Customer = {
        id: `cust-${Date.now()}`,
        name: newCustName,
        phone: newCustPhone,
        email: newCustEmail,
        birthday: '',
        address: '',
        loyaltyPoints: 0,
        rewardLevel: 'Silver',
        createdAt: new Date().toISOString()
      };
      await dbService.saveCustomer(newCustomer);
      setCustomers(prev => [...prev, newCustomer]);
      setSelectedCustomer(newCustomer);
      setShowAddCustomerModal(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustEmail('');
      toast.success("New customer registered successfully!");
    } catch (err) {
      toast.error("Failed to register customer.");
    }
  };

  // Calculations
  const getSubtotal = () => {
    return cart.reduce((acc, item) => {
      const p = products.find(prod => prod.id === item.variant.productId);
      if (!p) return acc;
      const discountedPrice = p.sellingPrice * (1 - p.discount / 100);
      return acc + (discountedPrice * item.quantity);
    }, 0);
  };

  const getTaxAndFinalTotals = () => {
    const subtotal = getSubtotal();
    
    // Apply loyalty points redemption if checked
    let redemptionValue = 0;
    if (redeemPoints && selectedCustomer) {
      const valuePerPoint = settings?.loyaltyRedemptionValue || 1;
      const maxPossibleRedeem = Math.min(selectedCustomer.loyaltyPoints * valuePerPoint, subtotal - itemDiscount);
      redemptionValue = Math.max(0, maxPossibleRedeem);
    }

    const netTaxable = Math.max(0, subtotal - itemDiscount - redemptionValue);
    const taxRate = settings?.taxPercentage || 18;
    
    // Reverse calculate GST or append it. POS usually adds GST or holds GST inclusive. Let's make it inclusive.
    // tax = netTaxable * (taxRate / (100 + taxRate))
    const gstAmount = netTaxable * (taxRate / (100 + taxRate));
    const totalAmount = netTaxable; // Inclusive of GST
    const taxableSubtotal = totalAmount - gstAmount;

    // Earn points
    const pointsRatio = settings?.loyaltyPointsRatio || 0.05;
    const pointsEarned = Math.round(totalAmount * pointsRatio);

    return {
      subtotal,
      discountAmount: itemDiscount + redemptionValue,
      redemptionPointsUsed: redeemPoints && selectedCustomer ? Math.round(redemptionValue / (settings?.loyaltyRedemptionValue || 1)) : 0,
      gstAmount,
      taxableSubtotal,
      totalAmount,
      pointsEarned
    };
  };

  const totals = getTaxAndFinalTotals();

  // Checkout process
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty!");
      return;
    }

    if (paymentMethod === 'Split Payment') {
      const splitTotal = Object.values(splitDetails).reduce((a, b) => a + b, 0);
      if (Math.abs(splitTotal - totals.totalAmount) > 0.01) {
        toast.error(`Split payments must sum up exactly to the total amount of ${formatCurrency(totals.totalAmount, currencySymbol)} (Current sum: ${formatCurrency(splitTotal, currencySymbol)}).`);
        return;
      }
    }

    try {
      const invoiceNum = `${settings?.invoicePrefix || 'VOG-'}${Date.now().toString().slice(-6)}`;
      
      // Build SaleItems array
      const saleItems: SaleItem[] = cart.map(item => {
        const p = products.find(prod => prod.id === item.variant.productId)!;
        const discountedPrice = p.sellingPrice * (1 - p.discount / 100);
        return {
          variantId: item.variant.id,
          productId: item.variant.productId,
          name: item.variant.productName,
          color: item.variant.color,
          size: item.variant.size,
          price: discountedPrice,
          quantity: item.quantity,
          discountApplied: 0,
          gstRate: p.gst,
          total: discountedPrice * item.quantity
        };
      });

      const newSale: Sale = {
        id: `sale-${Date.now()}`,
        invoiceNumber: invoiceNum,
        customerId: selectedCustomer ? selectedCustomer.id : 'walk-in',
        customerName: selectedCustomer ? selectedCustomer.name : 'Walk-In Customer',
        customerPhone: selectedCustomer ? selectedCustomer.phone : '-',
        cashierId: user?.id || 'e-cashier',
        cashierName: user?.username || 'Cashier',
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        gstAmount: totals.gstAmount,
        loyaltyPointsRedeemed: totals.redemptionPointsUsed,
        loyaltyPointsEarned: totals.pointsEarned,
        totalAmount: totals.totalAmount,
        paymentMethod,
        paymentDetails: {
          splitDetails: paymentMethod === 'Split Payment' ? splitDetails : undefined,
          referenceNo: referenceNo || undefined
        },
        items: saleItems,
        createdAt: new Date().toISOString()
      };

      // Execute db checkout (deducts stock and awards loyalty points)
      await dbService.checkoutSale(newSale);
      await dbService.addAuditLog(
        user?.id || 'e-cashier',
        user?.username || 'Cashier',
        user?.role || 'cashier',
        "Sales Completed",
        `Created invoice ${invoiceNum} (Total: ${formatCurrency(totals.totalAmount, currencySymbol)})`
      );

      // Refresh list to capture updated stock numbers
      const updatedVariants = await dbService.getVariants();
      setVariants(updatedVariants);

      setCheckoutResultSale(newSale);
      toast.success("Checkout successfully processed!");
    } catch (err) {
      toast.error("Failed to complete transaction.");
    }
  };

  const resetPOS = () => {
    setCart([]);
    setSelectedCustomer(null);
    setSearchPhone('');
    setItemDiscount(0);
    setRedeemPoints(false);
    setPaymentMethod('Cash');
    setReferenceNo('');
    setCheckoutResultSale(null);
  };

  // Filter catalog
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.barcode.includes(searchTerm);
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="d-flex flex-column h-100">
      {/* Mobile / Tablet Tab Switcher */}
      <div className="d-flex d-lg-none mb-3 p-1 rounded-3 bg-secondary border" style={{ borderColor: 'var(--border-color)', gap: '0.25rem' }}>
        <button
          type="button"
          className={`btn btn-sm flex-grow-1 py-2 fw-semibold transition-all border-0 ${activeTab === 'catalog' ? 'bg-accent text-white' : 'text-secondary bg-transparent'}`}
          style={{ borderRadius: '8px' }}
          onClick={() => setActiveTab('catalog')}
        >
          Catalog & Products
        </button>
        <button
          type="button"
          className={`btn btn-sm flex-grow-1 py-2 fw-semibold transition-all border-0 d-flex align-items-center justify-content-center gap-2 ${activeTab === 'cart' ? 'bg-accent text-white' : 'text-secondary bg-transparent'}`}
          style={{ borderRadius: '8px' }}
          onClick={() => setActiveTab('cart')}
        >
          Checkout Cart
          <span className={`custom-badge py-0.5 px-1.5 rounded ${activeTab === 'cart' ? 'bg-secondary text-primary' : 'bg-accent text-white'}`} style={{ fontSize: '0.7rem' }}>
            {cart.reduce((s, i) => s + i.quantity, 0)}
          </span>
        </button>
      </div>

      <div className="pos-container">
        {/* Catalog / Left Panel */}
        <div className={`pos-catalog glass-card p-3 border-0 ${activeTab === 'catalog' ? 'd-flex' : 'd-none d-lg-flex'}`}>
        <div className="d-flex flex-column flex-sm-row gap-2 mb-3">
          {/* Search bar */}
          <div className="input-group flex-grow-1">
            <span className="input-group-text bg-transparent border-end-0" style={{ borderColor: 'var(--border-color)' }}>
              <FiSearch className="text-secondary" />
            </span>
            <input
              type="text"
              placeholder="Search by name, SKU or scan barcode..."
              className="form-control bg-transparent border-start-0"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* Category filter */}
          <select 
            className="form-select bg-transparent"
            style={{ width: '160px', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Product Cards Catalog Grid */}
        <div className="pos-products-grid">
          {filteredProducts.length === 0 ? (
            <div className="w-100 text-center py-5 text-secondary">
              No active clothing products match your filter parameters.
            </div>
          ) : (
            filteredProducts.map(p => {
              const discountedPrice = p.sellingPrice * (1 - p.discount / 100);
              // Calculate total stock of this product across all its variants
              const prodVariants = variants.filter(v => v.productId === p.id);
              const totalStock = prodVariants.reduce((sum, v) => sum + v.stock, 0);

              return (
                <div 
                  key={p.id} 
                  className="pos-product-card" 
                  onClick={() => {
                    if (prodVariants.length === 1) {
                      addVariantToCart(prodVariants[0]);
                    } else {
                      setActiveVariantSelectProduct(p);
                    }
                  }}
                >
                  <div className="position-relative mb-2">
                    <img 
                      src={p.image} 
                      alt={p.name} 
                      className="w-100 rounded-3" 
                      style={{ height: '120px', objectFit: 'cover' }} 
                    />
                    {p.discount > 0 && (
                      <span className="badge-danger custom-badge position-absolute top-0 end-0 m-2">
                        -{p.discount}%
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-secondary small d-block font-monospace">{p.brand}</span>
                    <h6 className="fw-semibold mb-1 text-truncate" style={{ fontSize: '0.85rem' }}>{p.name}</h6>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <div>
                      {p.discount > 0 ? (
                        <>
                          <span className="fw-bold text-accent small">{formatCurrency(discountedPrice, currencySymbol)}</span>
                          <span className="text-muted text-decoration-line-through small ms-1" style={{ fontSize: '0.75rem' }}>
                            {formatCurrency(p.sellingPrice, currencySymbol)}
                          </span>
                        </>
                      ) : (
                        <span className="fw-bold text-accent small">{formatCurrency(p.sellingPrice, currencySymbol)}</span>
                      )}
                    </div>
                    <span className={`custom-badge text-nowrap ${totalStock <= 0 ? 'badge-danger' : totalStock <= 5 ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.65rem' }}>
                      {totalStock <= 0 ? 'Stockout' : `Qty: ${totalStock}`}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

        {/* Cart & Billing Panel / Right Side */}
        <div className={`pos-cart glass-card p-3 border-0 ${activeTab === 'cart' ? 'd-flex' : 'd-none d-lg-flex'}`}>
        <h5 className="fw-bold mb-3 d-flex justify-content-between align-items-center">
          Checkout Cart
          <span className="badge bg-accent">{cart.reduce((s, i) => s + i.quantity, 0)} Items</span>
        </h5>

        {/* Cart Item Drawer */}
        <div className="pos-cart-items mb-3">
          {cart.length === 0 ? (
            <div className="d-flex flex-column align-items-center justify-content-center h-100 text-secondary py-5">
              <FiShoppingBag size={48} className="mb-3 text-muted" />
              <p className="small text-center">Cart is empty.<br />Click products on the left or scan barcode directly.</p>
            </div>
          ) : (
            cart.map(item => {
              const p = products.find(prod => prod.id === item.variant.productId)!;
              const discountedPrice = p.sellingPrice * (1 - p.discount / 100);
              return (
                <div key={item.variant.id} className="d-flex justify-content-between align-items-center p-2.5 rounded-3 mb-2 bg-tertiary border" style={{ borderColor: 'var(--border-color)' }}>
                  <div className="overflow-hidden flex-grow-1 pe-2">
                    <h6 className="mb-0 text-truncate fw-semibold" style={{ fontSize: '0.85rem' }}>{p.name}</h6>
                    <span className="text-secondary small font-monospace" style={{ fontSize: '0.75rem' }}>
                      Size: {item.variant.size} | Color: {item.variant.color} | SKU: {item.variant.sku}
                    </span>
                    <div className="fw-bold text-accent small mt-1">
                      {formatCurrency(discountedPrice, currencySymbol)} x {item.quantity}
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    {/* Quantity Adjustment buttons */}
                    <div className="input-group input-group-sm" style={{ width: '80px' }}>
                      <button className="btn btn-outline-secondary p-1" onClick={() => updateCartQuantity(item.variant.id, item.quantity - 1)}>
                        <FiMinus size={12} />
                      </button>
                      <span className="form-control text-center p-1 font-monospace" style={{ fontSize: '0.8rem', backgroundColor: 'transparent', color: 'var(--text-primary)' }}>{item.quantity}</span>
                      <button className="btn btn-outline-secondary p-1" onClick={() => updateCartQuantity(item.variant.id, item.quantity + 1)}>
                        <FiPlus size={12} />
                      </button>
                    </div>
                    {/* Delete Item */}
                    <button className="btn btn-sm btn-link text-danger border-0 p-1" onClick={() => removeVariantFromCart(item.variant.id)}>
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Customer Registry Area */}
        <div className="p-3 rounded-3 bg-tertiary border mb-3" style={{ borderColor: 'var(--border-color)' }}>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="small fw-semibold text-secondary">Customer Integration</span>
            <button 
              className="btn btn-sm btn-link text-accent text-decoration-none p-0" 
              onClick={() => setShowAddCustomerModal(true)}
            >
              + Quick Add
            </button>
          </div>

          <form onSubmit={handleSearchCustomer} className="input-group input-group-sm mb-2">
            <span className="input-group-text bg-transparent" style={{ borderColor: 'var(--border-color)' }}>
              <FiUser className="text-secondary" />
            </span>
            <input 
              type="text" 
              placeholder="Search Customer Phone..." 
              className="form-control bg-transparent"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
            />
            <button className="btn btn-outline-secondary border-start-0" type="submit" style={{ borderColor: 'var(--border-color)' }}>Search</button>
          </form>

          {selectedCustomer ? (
            <div className="d-flex justify-content-between align-items-center mt-2 p-2 rounded bg-secondary border">
              <div>
                <strong className="small text-primary d-block">{selectedCustomer.name}</strong>
                <span className="text-muted small" style={{ fontSize: '0.72rem' }}>Tier: {selectedCustomer.rewardLevel} | {selectedCustomer.phone}</span>
              </div>
              <div className="text-end">
                <span className="badge bg-accent d-block mb-1">{selectedCustomer.loyaltyPoints} points</span>
                {selectedCustomer.loyaltyPoints > 0 && (
                  <div className="form-check form-switch d-inline-block">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="redeemSwitch" 
                      checked={redeemPoints}
                      onChange={(e) => setRedeemPoints(e.target.checked)}
                    />
                    <label className="form-check-label text-secondary small ms-1" style={{ fontSize: '0.75rem' }} htmlFor="redeemSwitch">Redeem</label>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <span className="small text-muted d-block mt-1">Associated profile: <strong>Walk-in Customer</strong></span>
          )}
        </div>

        {/* Calculations / Totals breakdown */}
        <div className="p-3 bg-tertiary rounded-3 border mb-3" style={{ borderColor: 'var(--border-color)', fontSize: '0.85rem' }}>
          <div className="d-flex justify-content-between mb-1.5 text-secondary">
            <span>Subtotal (After product discounts):</span>
            <span className="font-monospace fw-semibold">{formatCurrency(totals.subtotal, currencySymbol)}</span>
          </div>
          
          <div className="d-flex justify-content-between mb-1.5 align-items-center">
            <span className="text-secondary">Manual Invoice Discount:</span>
            <div className="input-group input-group-sm" style={{ width: '90px' }}>
              <span className="input-group-text bg-transparent p-1" style={{ borderColor: 'var(--border-color)', fontSize: '0.75rem' }}>{currencySymbol}</span>
              <input 
                type="number" 
                className="form-control text-end p-1 font-monospace" 
                style={{ borderColor: 'var(--border-color)', fontSize: '0.8rem', backgroundColor: 'transparent', color: 'var(--text-primary)' }}
                value={itemDiscount}
                min={0}
                max={totals.subtotal}
                onChange={(e) => setItemDiscount(Math.max(0, Number(e.target.value)))}
              />
            </div>
          </div>

          {totals.discountAmount > itemDiscount && (
            <div className="d-flex justify-content-between mb-1.5 text-success">
              <span>Loyalty Point Deduction:</span>
              <span className="font-monospace">- {formatCurrency(totals.discountAmount - itemDiscount, currencySymbol)}</span>
            </div>
          )}

          <div className="d-flex justify-content-between mb-1.5 text-secondary border-bottom pb-2" style={{ borderColor: 'var(--border-color)' }}>
            <span>GST Inclusive ({settings?.taxPercentage || 18}%):</span>
            <span className="font-monospace">{formatCurrency(totals.gstAmount, currencySymbol)}</span>
          </div>

          <div className="d-flex justify-content-between pt-2">
            <span className="fw-bold fs-6">Net Payable Total:</span>
            <span className="fw-bold fs-6 text-accent font-monospace">{formatCurrency(totals.totalAmount, currencySymbol)}</span>
          </div>

          {selectedCustomer && (
            <div className="mt-2 text-success small fw-medium">
              ★ Will earn +{totals.pointsEarned} loyalty reward points.
            </div>
          )}
        </div>

        {/* Payment and Checkout Section */}
        <div className="mt-auto">
          <div className="mb-3">
            <label className="form-label text-secondary small fw-medium">Payment Mode</label>
            <select 
              className="form-select bg-transparent"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI / QR Code</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Wallet">Mobile Wallet</option>
              <option value="Gift Card">Gift Card</option>
              <option value="Split Payment">Split Payments</option>
            </select>
          </div>

          {/* Conditional Input UI depending on Payment Mode */}
          {paymentMethod === 'Split Payment' ? (
            <div className="p-3 bg-tertiary rounded border mb-3" style={{ borderColor: 'var(--border-color)' }}>
              <span className="small fw-semibold text-secondary d-block mb-2">Split Amounts</span>
              {['Cash', 'UPI', 'Credit Card'].map(method => (
                <div key={method} className="d-flex justify-content-between align-items-center mb-2">
                  <span className="small text-secondary">{method}:</span>
                  <div className="input-group input-group-sm" style={{ width: '120px' }}>
                    <span className="input-group-text bg-transparent p-1">{currencySymbol}</span>
                    <input 
                      type="number"
                      className="form-control text-end p-1 font-monospace"
                      value={splitDetails[method] || 0}
                      onChange={(e) => setSplitDetails({ ...splitDetails, [method]: Math.max(0, Number(e.target.value)) })}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            paymentMethod !== 'Cash' && (
              <div className="mb-3">
                <input 
                  type="text" 
                  className="form-control form-control-sm bg-transparent" 
                  placeholder="Transaction Reference / Auth Code..."
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                />
              </div>
            )
          )}

          {/* Checkout triggers */}
          <button 
            className="btn btn-accent w-100 py-2.5 fw-bold d-flex justify-content-center align-items-center gap-2"
            onClick={handleCheckout}
            disabled={cart.length === 0}
          >
            Checkout & Process Bill
          </button>
        </div>
      </div>

      {/* MODAL: Variant Selector popup */}
      {activeVariantSelectProduct && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-secondary text-primary border" style={{ borderColor: 'var(--border-color)' }}>
              <div className="modal-header border-bottom" style={{ borderColor: 'var(--border-color)' }}>
                <h5 className="modal-title fw-bold">Select Clothing Variant</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setActiveVariantSelectProduct(null)}></button>
              </div>
              <div className="modal-body">
                <h6 className="fw-semibold mb-3">{activeVariantSelectProduct.name}</h6>
                <div className="table-responsive">
                  <table className="table table-hover align-middle border-0">
                    <thead>
                      <tr className="text-secondary small text-uppercase" style={{ fontSize: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                        <th className="border-0">Color</th>
                        <th className="border-0">Size</th>
                        <th className="border-0">Stock</th>
                        <th className="border-0 text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants
                        .filter(v => v.productId === activeVariantSelectProduct.id)
                        .map(variant => (
                          <tr key={variant.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td><span className="fw-medium">{variant.color}</span></td>
                            <td><span className="badge bg-tertiary text-primary font-monospace">{variant.size}</span></td>
                            <td>
                              <span className={`custom-badge ${variant.stock <= 0 ? 'badge-danger' : variant.stock <= variant.lowStockThreshold ? 'badge-warning' : 'badge-success'}`}>
                                {variant.stock} units
                              </span>
                            </td>
                            <td className="text-end">
                              <button 
                                className="btn btn-sm btn-accent" 
                                disabled={variant.stock <= 0}
                                onClick={() => {
                                  addVariantToCart(variant);
                                  setActiveVariantSelectProduct(null);
                                }}
                              >
                                Select
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Quick Customer Register popup */}
      {showAddCustomerModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
            <div className="modal-content bg-secondary text-primary border" style={{ borderColor: 'var(--border-color)' }}>
              <div className="modal-header border-bottom" style={{ borderColor: 'var(--border-color)' }}>
                <h5 className="modal-title fw-bold">Register Customer</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddCustomerModal(false)}></button>
              </div>
              <form onSubmit={handleQuickAddCustomer}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-medium">Full Name</label>
                    <input 
                      type="text" 
                      className="form-control bg-transparent" 
                      style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-medium">Phone Number</label>
                    <input 
                      type="tel" 
                      className="form-control bg-transparent" 
                      style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-medium">Email Address</label>
                    <input 
                      type="email" 
                      className="form-control bg-transparent" 
                      style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                      value={newCustEmail}
                      onChange={(e) => setNewCustEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer border-top" style={{ borderColor: 'var(--border-color)' }}>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowAddCustomerModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-sm btn-accent">Save Customer</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY MODAL: Checkout invoice receipt print-view */}
      {checkoutResultSale && (
        <div className="modal show d-block animate-fade-in" style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', zIndex: 1060 }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '440px' }}>
            <div className="modal-content bg-secondary text-primary border" style={{ borderColor: 'var(--border-color)', borderRadius: '16px' }}>
              <div className="modal-body text-center p-4">
                <div className="text-success mb-3">
                  <FiCheckCircle size={56} />
                </div>
                <h5 className="fw-bold mb-1">Transaction Successful</h5>
                <p className="text-secondary small mb-4">Invoice generated: <strong>{checkoutResultSale.invoiceNumber}</strong></p>
                
                {/* Print Receipt Section preview wrapper */}
                <div className="p-3 bg-tertiary rounded text-start border mb-4 font-monospace" id="printable-invoice" style={{ fontSize: '0.82rem', color: '#111827', backgroundColor: '#ffffff' }}>
                  <div className="text-center mb-3">
                    <h6 className="fw-bold mb-0 text-dark">{settings?.storeName || 'LINO MENSWEAR'}</h6>
                    <span className="small text-muted" style={{ fontSize: '0.7rem' }}>GST IN: {settings?.gstNumber || '27AAPCV1234F1Z9'}</span>
                    <hr className="my-2 border-dark" />
                  </div>
                  
                  <div className="mb-2.5">
                    <strong>Invoice No:</strong> {checkoutResultSale.invoiceNumber}<br />
                    <strong>Date:</strong> {new Date(checkoutResultSale.createdAt).toLocaleString()}<br />
                    <strong>Cashier:</strong> {checkoutResultSale.cashierName}<br />
                    <strong>Customer:</strong> {checkoutResultSale.customerName}
                  </div>

                  <hr className="my-2 border-dashed border-dark" />

                  {/* Items List */}
                  <div className="mb-2">
                    {checkoutResultSale.items.map((item, index) => (
                      <div key={index} className="d-flex justify-content-between mb-1">
                        <span>
                          {item.name} ({item.color}/{item.size}) x{item.quantity}
                        </span>
                        <span>{formatCurrency(item.total, currencySymbol)}</span>
                      </div>
                    ))}
                  </div>

                  <hr className="my-2 border-dashed border-dark" />

                  <div className="d-flex justify-content-between mb-1">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(checkoutResultSale.subtotal, currencySymbol)}</span>
                  </div>
                  {checkoutResultSale.discountAmount > 0 && (
                    <div className="d-flex justify-content-between mb-1 text-danger">
                      <span>Discount / Reward:</span>
                      <span>-{formatCurrency(checkoutResultSale.discountAmount, currencySymbol)}</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between mb-1.5">
                    <span>GST (Inc.):</span>
                    <span>{formatCurrency(checkoutResultSale.gstAmount, currencySymbol)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2 fw-bold text-dark fs-6">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(checkoutResultSale.totalAmount, currencySymbol)}</span>
                  </div>

                  <hr className="my-2 border-dark" />
                  <div className="text-center mt-2.5" style={{ fontSize: '0.75rem' }}>
                    <p className="mb-0">★ Loyalty Points Earned: +{checkoutResultSale.loyaltyPointsEarned} ★</p>
                    <p className="mb-0 text-muted mt-1">Thank you for shopping with us!</p>
                  </div>
                </div>

                {/* Options button block */}
                <div className="d-flex gap-2.5">
                  <button 
                    className="btn btn-outline-secondary flex-grow-1 py-2 d-flex justify-content-center align-items-center gap-2"
                    onClick={() => printDocument('printable-invoice', 'Purchase Invoice')}
                  >
                    <FiPrinter /> Print Invoice
                  </button>
                  <button 
                    className="btn btn-accent flex-grow-1 py-2"
                    onClick={resetPOS}
                  >
                    Next Customer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
};
