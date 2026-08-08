import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { dbService } from '../../services/db';
import { Product, ProductVariant, Category, Brand } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { toast } from 'react-toastify';
import { 
  FiPlus, FiSearch, FiEdit2, FiTrash2, FiAlertCircle, 
  FiCheckCircle, FiChevronDown, FiChevronUp, FiSettings 
} from 'react-icons/fi';
import { formatCurrency } from '../../utils/export';

export const Inventory: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { settings } = useSettings();
  const currencySymbol = settings?.currency || '$';

  // DB States
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  // Expanded product IDs list
  const [expandedProductIds, setExpandedProductIds] = useState<string[]>([]);

  // Delete confirm modal target state
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; name: string; type: 'product' | 'variant' } | null>(null);

  // Search/Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [selectedStockStatus, setSelectedStockStatus] = useState('All');

  // Modals
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showStockAdjustModal, setShowStockAdjustModal] = useState(false);
  
  // Stock Adjust State
  const [adjustVariant, setAdjustVariant] = useState<ProductVariant | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Stock Audit');

  // Form States (New Product)
  const [prodName, setProdName] = useState('');
  const [prodSKU, setProdSKU] = useState('');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodBrand, setProdBrand] = useState('');
  const [prodPurchasePrice, setProdPurchasePrice] = useState<number>(0);
  const [prodSellingPrice, setProdSellingPrice] = useState<number>(0);
  const [prodDiscount, setProdDiscount] = useState<number>(0);
  const [prodGST, setProdGST] = useState<number>(18);
  const [prodImage, setProdImage] = useState('');
  const [prodSupplier, setProdSupplier] = useState('');
  const [prodSize, setProdSize] = useState('M');

  const loadInventory = async () => {
    setLoading(true);
    try {
      const [prodData, varData, catData, brandData] = await Promise.all([
        dbService.getProducts(),
        dbService.getVariants(),
        dbService.getCategories(),
        dbService.getBrands()
      ]);
      setProducts(prodData);
      setVariants(varData);
      setCategories(catData);
      setBrands(brandData);

      // Pre-fill categories in forms if present
      if (catData.length > 0) setProdCategory(catData[0].name);
      if (brandData.length > 0) setProdBrand(brandData[0].name);
    } catch (err) {
      toast.error("Failed to load inventory data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const toggleProductExpand = (id: string) => {
    setExpandedProductIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  // Stock Adjustment Submission
  const handleStockAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustVariant) return;

    try {
      const currentStock = adjustVariant.stock;
      // Calculate final stock
      let delta = adjustAmount;
      if (adjustReason === 'Damaged' || adjustReason === 'Reduce Stock') {
        delta = -Math.abs(adjustAmount);
      } else if (adjustReason === 'Add Stock' || adjustReason === 'Returned Stock') {
        delta = Math.abs(adjustAmount);
      } // If 'Set Stock', delta = adjustAmount - currentStock
      else if (adjustReason === 'Stock Audit') {
        delta = adjustAmount - currentStock;
      }

      const newStock = await dbService.adjustVariantStock(adjustVariant.id, delta);
      
      // Audit log
      await dbService.addAuditLog(
        user?.id || 'sys',
        user?.username || 'System',
        user?.role || 'store_manager',
        "Inventory Updates",
        `Adjusted stock for variant ${adjustVariant.sku} from ${currentStock} to ${newStock} (Reason: ${adjustReason})`
      );

      toast.success("Stock level updated successfully!");
      setShowStockAdjustModal(false);
      setAdjustVariant(null);
      setAdjustAmount(0);
      loadInventory();
    } catch (err) {
      toast.error("Failed to adjust inventory stock.");
    }
  };

  // Product Add Submission
  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodSKU || !prodBarcode) {
      toast.error("Name, SKU and Barcode are required.");
      return;
    }

    try {
      const pId = `p-${Date.now()}`;
      const newProduct: Product = {
        id: pId,
        barcode: prodBarcode,
        sku: prodSKU,
        name: prodName,
        description: prodDesc,
        brand: prodBrand,
        category: prodCategory,
        purchasePrice: Number(prodPurchasePrice),
        sellingPrice: Number(prodSellingPrice),
        discount: Number(prodDiscount),
        gst: Number(prodGST),
        image: prodImage || "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=200&auto=format&fit=crop&q=80",
        supplierId: prodSupplier || "sup-elite",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Create a default variant with the selected size and color Black
      const vId = `v-${Date.now()}`;
      const defaultVariant: ProductVariant = {
        id: vId,
        productId: pId,
        productName: prodName,
        color: "Black",
        size: prodSize,
        material: "Cotton",
        stock: 10,
        lowStockThreshold: settings?.lowStockAlertLevel || 5,
        barcode: prodBarcode,
        sku: `${prodSKU}-${prodSize}-BLK`
      };

      await dbService.saveProduct(newProduct);
      await dbService.saveVariant(defaultVariant);

      await dbService.addAuditLog(
        user?.id || 'sys',
        user?.username || 'System',
        user?.role || 'store_manager',
        "User Creation", // standard action in rules
        `Created product ${prodName} (${prodSKU}) with default ${prodSize}-Black variant.`
      );

      toast.success("New product with default variant successfully added!");
      setShowAddProductModal(false);
      
      // Reset Form fields
      setProdName('');
      setProdSKU('');
      setProdBarcode('');
      setProdDesc('');
      setProdPurchasePrice(0);
      setProdSellingPrice(0);
      setProdDiscount(0);
      setProdImage('');
      setProdSize('M');

      loadInventory();
    } catch (err) {
      toast.error("Failed to add product.");
    }
  };

  const handleDeleteProductClick = (pId: string, name: string) => {
    setDeleteConfirmTarget({ id: pId, name, type: 'product' });
  };

  const handleDeleteProductConfirm = async (pId: string, name: string) => {
    try {
      await dbService.deleteProduct(pId);
      await dbService.addAuditLog(
        user?.id || 'sys',
        user?.username || 'System',
        user?.role || 'store_manager',
        "Inventory Updates",
        `Deleted product "${name}" and all related variants`
      );
      toast.success("Product deleted successfully.");
      loadInventory();
    } catch (err) {
      toast.error("Failed to delete product.");
    }
  };

  const handleDeleteVariantConfirm = async (vId: string, name: string) => {
    try {
      await dbService.deleteVariant(vId);
      await dbService.addAuditLog(
        user?.id || 'sys',
        user?.username || 'System',
        user?.role || 'store_manager',
        "Inventory Updates",
        `Deleted variant "${name}"`
      );
      toast.success("Variant deleted successfully.");
      loadInventory();
    } catch (err) {
      toast.error("Failed to delete variant.");
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-accent" role="status">
          <span className="visually-hidden">Loading Inventory...</span>
        </div>
      </div>
    );
  }

  // Filter products list
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.barcode.includes(searchTerm);
    const matchesCategory = selectedCat === 'All' || p.category === selectedCat;
    
    // Stock Status filters
    const prodVariants = variants.filter(v => v.productId === p.id);
    const isLow = prodVariants.some(v => v.stock > 0 && v.stock <= v.lowStockThreshold);
    const isOut = prodVariants.every(v => v.stock === 0) || prodVariants.length === 0;

    let matchesStock = true;
    if (selectedStockStatus === 'Low Stock') matchesStock = isLow;
    else if (selectedStockStatus === 'Out of Stock') matchesStock = isOut;

    return matchesSearch && matchesCategory && matchesStock;
  });

  return (
    <div>
      {/* Visual Banners Stats */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-md-4">
          <div className="glass-card p-3 border-0 d-flex align-items-center gap-3">
            <div className="rounded-circle bg-accent p-3 text-white">
              <FiCheckCircle size={22} />
            </div>
            <div>
              <span className="text-secondary small">Total Master Items</span>
              <h4 className="fw-bold mb-0">{products.length} Products</h4>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="glass-card p-3 border-0 d-flex align-items-center gap-3" style={{ backgroundColor: 'var(--color-warning-bg)' }}>
            <div className="rounded-circle bg-warning p-3 text-white" style={{ backgroundColor: 'var(--color-warning) !important' }}>
              <FiAlertCircle size={22} />
            </div>
            <div>
              <span className="text-secondary small">Low Stock Alert Levels</span>
              <h4 className="fw-bold mb-0 text-warning">{variants.filter(v => v.stock > 0 && v.stock <= v.lowStockThreshold).length} Variants</h4>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="glass-card p-3 border-0 d-flex align-items-center gap-3" style={{ backgroundColor: 'var(--color-danger-bg)' }}>
            <div className="rounded-circle bg-danger p-3 text-white" style={{ backgroundColor: 'var(--color-danger) !important' }}>
              <FiAlertCircle size={22} />
            </div>
            <div>
              <span className="text-secondary small">Completely Out of Stock</span>
              <h4 className="fw-bold mb-0 text-danger">{variants.filter(v => v.stock === 0).length} Variants</h4>
            </div>
          </div>
        </div>
      </div>

      {/* Action Header / Filters */}
      <div className="glass-card p-3 mb-4 border-0">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div className="d-flex flex-grow-1 flex-column flex-sm-row gap-2">
            {/* Search Input */}
            <div className="input-group">
              <span className="input-group-text bg-transparent border-end-0" style={{ borderColor: 'var(--border-color)' }}>
                <FiSearch className="text-secondary" />
              </span>
              <input
                type="text"
                placeholder="Search products by Name, SKU, Barcode..."
                className="form-control bg-transparent border-start-0"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Category dropdown filter */}
            <select 
              className="form-select bg-transparent" 
              style={{ width: '150px', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
            >
              <option value="All">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            {/* Stock status filter */}
            <select 
              className="form-select bg-transparent" 
              style={{ width: '150px', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              value={selectedStockStatus}
              onChange={(e) => setSelectedStockStatus(e.target.value)}
            >
              <option value="All">All Stock Levels</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>

          {/* Add Product Button */}
          {hasPermission(['super_admin', 'store_manager', 'inventory_staff']) && (
            <button 
              className="btn btn-accent d-flex align-items-center gap-2"
              onClick={() => setShowAddProductModal(true)}
            >
              <FiPlus /> Add New Product
            </button>
          )}
        </div>
      </div>

      {/* Products Table grid list */}
      {products.length === 0 ? (
        <div className="glass-card p-4 text-center border-0">
          <h5 className="fw-bold">No products yet</h5>
          <p className="text-secondary small mb-3">Your product catalog is empty. Add products to start selling and tracking inventory.</p>
          {hasPermission(['super_admin', 'store_manager', 'inventory_staff']) && (
            <div>
              <button className="btn btn-accent d-inline-flex align-items-center gap-2" onClick={() => setShowAddProductModal(true)}>
                <FiPlus /> Add First Product
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="custom-table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}></th>
              <th>Product Details</th>
              <th>SKU / Barcode</th>
              <th>Category / Brand</th>
              <th>Finances</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-4 text-secondary">
                  No products matched the search query or filters.
                </td>
              </tr>
            ) : (
              filteredProducts.map(p => {
                const isExpanded = expandedProductIds.includes(p.id);
                const prodVariants = variants.filter(v => v.productId === p.id);
                const totalStock = prodVariants.reduce((sum, v) => sum + v.stock, 0);

                return (
                  <React.Fragment key={p.id}>
                    <tr>
                      <td>
                        <button 
                          className="btn btn-sm btn-link text-secondary p-0 border-0"
                          onClick={() => toggleProductExpand(p.id)}
                        >
                          {isExpanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
                        </button>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <img 
                            src={p.image} 
                            alt={p.name} 
                            className="rounded"
                            style={{ width: '42px', height: '42px', objectFit: 'cover' }}
                          />
                          <div>
                            <strong className="text-primary d-block">{p.name}</strong>
                            <span className="text-muted small" style={{ fontSize: '0.75rem' }}>{p.description.slice(0, 50)}...</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="font-monospace small d-block">{p.sku}</span>
                        <span className="text-muted font-monospace small" style={{ fontSize: '0.72rem' }}>Barcode: {p.barcode}</span>
                      </td>
                      <td>
                        <span className="small text-primary">{p.category}</span>
                        <span className="text-secondary small d-block" style={{ fontSize: '0.75rem' }}>Brand: {p.brand}</span>
                      </td>
                      <td>
                        <div className="small">Sell: <strong>{formatCurrency(p.sellingPrice * (1 - p.discount/100), currencySymbol)}</strong></div>
                        <div className="text-secondary small" style={{ fontSize: '0.75rem' }}>Cost: {formatCurrency(p.purchasePrice, currencySymbol)}</div>
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-2">
                          <button 
                            className="btn btn-sm btn-outline-secondary p-1.5" 
                            title="Expand variants list"
                            onClick={() => toggleProductExpand(p.id)}
                          >
                            <FiSettings size={14} />
                          </button>
                          {hasPermission(['super_admin']) && (
                            <button 
                              className="btn btn-sm btn-outline-danger p-1.5" 
                              title="Delete Product"
                              onClick={() => handleDeleteProductClick(p.id, p.name)}
                            >
                              <FiTrash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Collapsible Variants Row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="p-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                          <div className="p-3 rounded bg-secondary border" style={{ borderColor: 'var(--border-color)' }}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <h6 className="fw-bold mb-0 text-accent small">Sizing & Color Variants Matrix</h6>
                            </div>
                            <div className="table-responsive">
                              <table className="table table-sm table-hover align-middle mb-0" style={{ color: 'var(--text-primary)' }}>
                                <thead>
                                  <tr className="text-secondary small" style={{ fontSize: '0.72rem', borderBottom: '1px solid var(--border-color)' }}>
                                    <th>Color</th>
                                    <th>Size</th>
                                    <th>Material</th>
                                    <th>SKU Variant</th>
                                    <th>Barcode</th>
                                    <th>Stock Level</th>
                                    {hasPermission(['super_admin', 'store_manager', 'inventory_staff']) && <th className="text-end">Update Stock</th>}
                                  </tr>
                                </thead>
                                <tbody>
                                  {prodVariants.map(variant => (
                                    <tr key={variant.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                      <td><strong>{variant.color}</strong></td>
                                      <td><span className="badge bg-tertiary text-primary font-monospace">{variant.size}</span></td>
                                      <td className="text-secondary small">{variant.material}</td>
                                      <td className="font-monospace small">{variant.sku}</td>
                                      <td className="font-monospace text-secondary small">{variant.barcode}</td>
                                      <td>
                                        <span className={`custom-badge ${variant.stock <= 0 ? 'badge-danger' : variant.stock <= variant.lowStockThreshold ? 'badge-warning' : 'badge-success'}`}>
                                          {variant.stock <= 0 ? 'OUT OF STOCK' : `${variant.stock} units`}
                                        </span>
                                      </td>
                                      {hasPermission(['super_admin', 'store_manager', 'inventory_staff']) && (
                                        <td className="text-end">
                                          <div className="d-inline-flex gap-2">
                                            <button 
                                              className="btn btn-sm btn-outline-accent py-0.5 px-2"
                                              onClick={() => {
                                                setAdjustVariant(variant);
                                                setShowStockAdjustModal(true);
                                              }}
                                            >
                                              Adjust Stock
                                            </button>
                                            {hasPermission(['super_admin']) && (
                                              <button 
                                                className="btn btn-sm btn-outline-danger py-0.5 px-1.5"
                                                title="Delete Variant"
                                                onClick={() => setDeleteConfirmTarget({ id: variant.id, name: `${variant.productName} (${variant.color}/${variant.size})`, type: 'variant' })}
                                              >
                                                <FiTrash2 size={12} />
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      )}

      {/* MODAL: Stock Adjust popup */}
      {showStockAdjustModal && adjustVariant && createPortal(
        <div
          className="modal show d-block"
          role="dialog"
          aria-modal="true"
          aria-label="Adjust stock dialog"
          onKeyDown={(e) => { if (e.key === 'Escape') { setShowStockAdjustModal(false); setAdjustVariant(null); } }}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1050 }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
            <div className="modal-content bg-secondary text-primary border" style={{ borderColor: 'var(--border-color)' }}>
              <div className="modal-header border-bottom" style={{ borderColor: 'var(--border-color)' }}>
                <h5 className="modal-title fw-bold">Adjust Stock Level</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => { setShowStockAdjustModal(false); setAdjustVariant(null); }}></button>
              </div>
              <form onSubmit={handleStockAdjustSubmit}>
                <div className="modal-body">
                  <div className="mb-2">
                    <span className="small text-secondary">Variant:</span>
                    <strong className="d-block small">{adjustVariant.productName} ({adjustVariant.color}/{adjustVariant.size})</strong>
                    <span className="small text-secondary font-monospace" style={{ fontSize: '0.72rem' }}>Current stock count: {adjustVariant.stock}</span>
                  </div>
                  <hr className="my-2" style={{ color: 'var(--border-color)' }} />

                  {/* Size of the Dress Option */}
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-medium">Size of the Dress</label>
                    <select 
                      className="form-select bg-transparent" 
                      style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                      value={adjustVariant.id}
                      onChange={(e) => {
                        const selectedVar = variants.find(v => v.id === e.target.value);
                        if (selectedVar) {
                          setAdjustVariant(selectedVar);
                        }
                      }}
                    >
                      {variants
                        .filter(v => v.productId === adjustVariant.productId)
                        .map(v => (
                          <option key={v.id} value={v.id}>
                            {v.size} ({v.color}) - Stock: {v.stock}
                          </option>
                        ))
                      }
                    </select>
                  </div>
                  
                  {/* Adjustment reason */}
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-medium">Adjustment Type</label>
                    <select 
                      className="form-select bg-transparent" 
                      style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                    >
                      <option value="Add Stock">Add Stock (Supplier shipment received)</option>
                      <option value="Reduce Stock">Reduce Stock (Damaged / Missing)</option>
                      <option value="Returned Stock">Returned Stock (Customer exchange)</option>
                      <option value="Stock Audit">Manual Override (Set absolute stock)</option>
                    </select>
                  </div>

                  {/* Adjustment amount */}
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-medium">
                      {adjustReason === 'Stock Audit' ? 'New Total Quantity' : 'Quantity Count'}
                    </label>
                    <input 
                      type="number" 
                      className="form-control bg-transparent font-monospace"
                      style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(Number(e.target.value))}
                      min={0}
                      required 
                    />
                  </div>
                </div>
                <div className="modal-footer border-top" style={{ borderColor: 'var(--border-color)' }}>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setShowStockAdjustModal(false); setAdjustVariant(null); }}>Cancel</button>
                  <button type="submit" className="btn btn-sm btn-accent">Apply Stock Adjustment</button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: Add Product popup */}
      {showAddProductModal && createPortal(
        <div
          className="modal show d-block"
          role="dialog"
          aria-modal="true"
          aria-label="Create new product dialog"
          onKeyDown={(e) => { if (e.key === 'Escape') { setShowAddProductModal(false); } }}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1050, overflowY: 'auto' }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
            <div className="modal-content bg-secondary text-primary border" style={{ borderColor: 'var(--border-color)' }}>
              <div className="modal-header border-bottom" style={{ borderColor: 'var(--border-color)' }}>
                <h5 className="modal-title fw-bold">Create New Clothing Product</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddProductModal(false)}></button>
              </div>
              <form onSubmit={handleAddProductSubmit}>
                <div className="modal-body" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label text-secondary small fw-medium">Product Name</label>
                      <input type="text" className="form-control bg-transparent" value={prodName} onChange={(e) => setProdName(e.target.value)} required />
                    </div>
                    <div className="col-6 col-md-3">
                      <label className="form-label text-secondary small fw-medium">Master SKU</label>
                      <input type="text" className="form-control bg-transparent" value={prodSKU} onChange={(e) => setProdSKU(e.target.value)} placeholder="SU-ARM-SLIM" required />
                    </div>
                    <div className="col-6 col-md-3">
                      <label className="form-label text-secondary small fw-medium">Master Barcode</label>
                      <input type="text" className="form-control bg-transparent" value={prodBarcode} onChange={(e) => setProdBarcode(e.target.value)} required />
                    </div>

                    <div className="col-12">
                      <label className="form-label text-secondary small fw-medium">Description</label>
                      <textarea className="form-control bg-transparent" rows={2} value={prodDesc} onChange={(e) => setProdDesc(e.target.value)}></textarea>
                    </div>

                    <div className="col-6 col-md-3">
                      <label className="form-label text-secondary small fw-medium">Category</label>
                      <select className="form-select bg-transparent" value={prodCategory} onChange={(e) => setProdCategory(e.target.value)}>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="col-6 col-md-3">
                      <label className="form-label text-secondary small fw-medium">Brand</label>
                      <select className="form-select bg-transparent" value={prodBrand} onChange={(e) => setProdBrand(e.target.value)}>
                        {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                      </select>
                    </div>
                    <div className="col-6 col-md-3">
                      <label className="form-label text-secondary small fw-medium">Purchase Cost Price ({currencySymbol})</label>
                      <input type="number" className="form-control bg-transparent" value={prodPurchasePrice} onChange={(e) => setProdPurchasePrice(Number(e.target.value))} required />
                    </div>
                    <div className="col-6 col-md-3">
                      <label className="form-label text-secondary small fw-medium">Retail Selling Price ({currencySymbol})</label>
                      <input type="number" className="form-control bg-transparent" value={prodSellingPrice} onChange={(e) => setProdSellingPrice(Number(e.target.value))} required />
                    </div>

                    <div className="col-6 col-md-3">
                      <label className="form-label text-secondary small fw-medium">Discount (%)</label>
                      <input type="number" className="form-control bg-transparent" value={prodDiscount} onChange={(e) => setProdDiscount(Number(e.target.value))} />
                    </div>
                    <div className="col-6 col-md-3">
                      <label className="form-label text-secondary small fw-medium">GST (%)</label>
                      <select className="form-select bg-transparent" value={prodGST} onChange={(e) => setProdGST(Number(e.target.value))}>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18% (Standard)</option>
                        <option value={28}>28%</option>
                      </select>
                    </div>
                    <div className="col-6 col-md-3">
                      <label className="form-label text-secondary small fw-medium">Size of the Dress</label>
                      <select 
                        className="form-select bg-transparent" 
                        style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                        value={prodSize} 
                        onChange={(e) => setProdSize(e.target.value)}
                      >
                        <option value="XS">XS</option>
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                        <option value="XXL">XXL</option>
                        <option value="38">38</option>
                        <option value="40">40</option>
                        <option value="42">42</option>
                        <option value="44">44</option>
                      </select>
                    </div>
                    <div className="col-12 col-md-9">
                      <label className="form-label text-secondary small fw-medium">Product Image URL</label>
                      <input type="text" className="form-control bg-transparent" value={prodImage} onChange={(e) => setProdImage(e.target.value)} placeholder="https://unsplash..." />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top" style={{ borderColor: 'var(--border-color)' }}>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowAddProductModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-sm btn-accent">Save Product Details</button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: Custom delete confirmation dialog */}
      {deleteConfirmTarget && createPortal(
        <div
          className="modal show d-block"
          role="dialog"
          aria-modal="true"
          aria-label="Delete confirmation dialog"
          onKeyDown={(e) => { if (e.key === 'Escape') { setDeleteConfirmTarget(null); } }}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1100 }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
            <div className="modal-content bg-secondary text-primary border" style={{ borderColor: 'var(--border-color)' }}>
              <div className="modal-header border-bottom" style={{ borderColor: 'var(--border-color)' }}>
                <h5 className="modal-title fw-bold text-danger d-flex align-items-center gap-2">
                  <FiAlertCircle /> Confirm Delete
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setDeleteConfirmTarget(null)}></button>
              </div>
              <div className="modal-body">
                <p className="mb-0 text-start">
                  Are you absolutely sure you want to delete the {deleteConfirmTarget.type === 'product' ? 'product' : 'variant'} <strong>"{deleteConfirmTarget.name}"</strong>?
                </p>
                {deleteConfirmTarget.type === 'product' && (
                  <p className="text-warning small mt-2 mb-0 text-start">
                    <FiAlertCircle /> Warning: This will permanently delete all associated size/color variants as well.
                  </p>
                )}
              </div>
              <div className="modal-footer border-top" style={{ borderColor: 'var(--border-color)' }}>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setDeleteConfirmTarget(null)}>Cancel</button>
                <button 
                  type="button" 
                  className="btn btn-sm btn-danger"
                  onClick={async () => {
                    const target = deleteConfirmTarget;
                    setDeleteConfirmTarget(null);
                    if (target.type === 'product') {
                      await handleDeleteProductConfirm(target.id, target.name);
                    } else {
                      await handleDeleteVariantConfirm(target.id, target.name);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
