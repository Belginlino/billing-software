import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/db';
import { Supplier, PurchaseOrder, ProductVariant, PurchaseItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { toast } from 'react-toastify';
import { FiPlus, FiSearch, FiTruck, FiShoppingBag, FiCheck, FiSettings } from 'react-icons/fi';
import { formatCurrency, formatDate } from '../../utils/export';

export const Suppliers: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { settings } = useSettings();
  const currencySymbol = settings?.currency || '₹';

  // DB State lists
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'suppliers' | 'orders'>('suppliers');
  
  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showAddPOModal, setShowAddPOModal] = useState(false);

  // Form States (New Supplier)
  const [supName, setSupName] = useState('');
  const [supCompany, setSupCompany] = useState('');
  const [supGST, setSupGST] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');

  // Form States (New Purchase Order)
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poItems, setPoItems] = useState<PurchaseItem[]>([]);
  
  // Add PO item inputs
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [itemQty, setItemQty] = useState<number>(10);
  const [itemCost, setItemCost] = useState<number>(20);

  const loadSupplierData = async () => {
    setLoading(true);
    try {
      const [supData, poData, varData] = await Promise.all([
        dbService.getSuppliers(),
        dbService.getPurchases(),
        dbService.getVariants()
      ]);
      setSuppliers(supData);
      setPurchases(poData);
      setVariants(varData);

      if (supData.length > 0) setPoSupplierId(supData[0].id);
      if (varData.length > 0) setSelectedVariantId(varData[0].id);
    } catch (err) {
      toast.error("Failed to load suppliers page data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSupplierData();
  }, []);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName || !supCompany) {
      toast.error("Supplier Name and Company Name are required.");
      return;
    }

    try {
      const newSup: Supplier = {
        id: `sup-${Date.now()}`,
        name: supName,
        company: supCompany,
        gstNumber: supGST || '-',
        phone: supPhone,
        email: supEmail,
        address: supAddress,
        pendingPayments: 0,
        createdAt: new Date().toISOString()
      };

      await dbService.saveSupplier(newSup);
      await dbService.addAuditLog(
        user?.id || 'sys',
        user?.username || 'System',
        user?.role || 'store_manager',
        "Inventory Updates", // standard action in rules
        `Added new supplier profile: ${supCompany} (${supName})`
      );

      toast.success("New supplier profile created!");
      setShowAddSupplierModal(false);
      
      // Reset
      setSupName('');
      setSupCompany('');
      setSupGST('');
      setSupPhone('');
      setSupEmail('');
      setSupAddress('');
      loadSupplierData();
    } catch (err) {
      toast.error("Failed to add supplier.");
    }
  };

  // Add Item to draft PO list
  const addPOItemDraft = () => {
    if (!selectedVariantId) return;
    const v = variants.find(variant => variant.id === selectedVariantId);
    if (!v) return;

    // Check if already in draft
    if (poItems.some(i => i.variantId === selectedVariantId)) {
      toast.warning("Item already added to this Purchase Order draft list.");
      return;
    }

    const item: PurchaseItem = {
      variantId: selectedVariantId,
      productName: v.productName,
      color: v.color,
      size: v.size,
      costPrice: Number(itemCost),
      quantity: Number(itemQty)
    };

    setPoItems([...poItems, item]);
  };

  const removePOItemDraft = (varId: string) => {
    setPoItems(poItems.filter(i => i.variantId !== varId));
  };

  // Create Purchase Order submission
  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (poItems.length === 0) {
      toast.error("Please add at least one clothing item to the purchase order.");
      return;
    }

    const supplier = suppliers.find(s => s.id === poSupplierId);
    if (!supplier) return;

    try {
      const totalAmount = poItems.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0);
      const newPO: PurchaseOrder = {
        id: `po-${Date.now().toString().slice(-4)}`,
        supplierId: poSupplierId,
        supplierName: supplier.company,
        status: 'Pending',
        totalAmount,
        items: poItems,
        createdAt: new Date().toISOString()
      };

      await dbService.savePurchase(newPO);
      await dbService.addAuditLog(
        user?.id || 'sys',
        user?.username || 'System',
        user?.role || 'store_manager',
        "Inventory Updates",
        `Created purchase order ${newPO.id} for ${newPO.supplierName} (Value: ${formatCurrency(totalAmount, currencySymbol)})`
      );

      toast.success(`Purchase Order ${newPO.id} successfully created!`);
      setShowAddPOModal(false);
      setPoItems([]);
      loadSupplierData();
    } catch (err) {
      toast.error("Failed to generate Purchase Order.");
    }
  };

  // Receive stock from PO (updates inventory stock counts!)
  const handleReceiveStock = async (po: PurchaseOrder) => {
    if (!window.confirm(`Mark Purchase Order ${po.id} as Received? This will automatically add ${po.items.reduce((s, i) => s + i.quantity, 0)} units to your active inventory counts.`)) {
      return;
    }

    try {
      // 1. Update PO Status
      po.status = 'Received';
      await dbService.savePurchase(po);

      // 2. Adjust variant stock levels in database
      for (const item of po.items) {
        await dbService.adjustVariantStock(item.variantId, item.quantity);
      }

      // 3. Record Audit log
      await dbService.addAuditLog(
        user?.id || 'sys',
        user?.username || 'System',
        user?.role || 'store_manager',
        "Inventory Updates",
        `Received purchase order stock for ${po.id}: added variants stock levels.`
      );

      toast.success("Inventory stock levels successfully restocked!");
      loadSupplierData();
    } catch (err) {
      toast.error("Failed to process stock intake.");
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-accent" role="status">
          <span className="visually-hidden">Loading Suppliers...</span>
        </div>
      </div>
    );
  }

  // Filters
  const filteredSuppliers = suppliers.filter(s => {
    return s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           s.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
           s.email.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredOrders = purchases.filter(p => {
    return p.id.includes(searchTerm) || p.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div>
      {/* Tab Navigation header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="btn-group bg-secondary border p-1 rounded-3" style={{ borderColor: 'var(--border-color)' }}>
          <button 
            className={`btn btn-sm px-3 ${activeTab === 'suppliers' ? 'btn-accent' : 'btn-link text-secondary text-decoration-none'}`}
            onClick={() => { setActiveTab('suppliers'); setSearchTerm(''); }}
          >
            <FiTruck size={14} className="me-2" /> Suppliers Directory
          </button>
          <button 
            className={`btn btn-sm px-3 ${activeTab === 'orders' ? 'btn-accent' : 'btn-link text-secondary text-decoration-none'}`}
            onClick={() => { setActiveTab('orders'); setSearchTerm(''); }}
          >
            <FiShoppingBag size={14} className="me-2" /> Purchase Orders
          </button>
        </div>

        {hasPermission(['super_admin', 'store_manager', 'inventory_staff']) && (
          activeTab === 'suppliers' ? (
            <button className="btn btn-accent d-flex align-items-center gap-2" onClick={() => setShowAddSupplierModal(true)}>
              <FiPlus /> Add Supplier
            </button>
          ) : (
            <button className="btn btn-accent d-flex align-items-center gap-2" onClick={() => setShowAddPOModal(true)}>
              <FiPlus /> Draft Purchase Order
            </button>
          )
        )}
      </div>

      {/* Search Filter Header */}
      <div className="glass-card p-3 mb-4 border-0">
        <div className="input-group">
          <span className="input-group-text bg-transparent border-end-0" style={{ borderColor: 'var(--border-color)' }}>
            <FiSearch className="text-secondary" />
          </span>
          <input 
            type="text" 
            className="form-control bg-transparent border-start-0" 
            placeholder={activeTab === 'suppliers' ? "Search suppliers by Name, Company, Email..." : "Search orders by ID, Supplier Name..."}
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* TABLE VIEWS */}
      {activeTab === 'suppliers' ? (
        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Representative Contact</th>
                <th>GST Registration</th>
                <th>Email / Phone</th>
                <th>Address</th>
                <th className="text-end">Pending Dues</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-secondary">No suppliers matched search query.</td>
                </tr>
              ) : (
                filteredSuppliers.map(sup => (
                  <tr key={sup.id}>
                    <td><strong className="text-primary">{sup.company}</strong></td>
                    <td>{sup.name}</td>
                    <td className="font-monospace small">{sup.gstNumber}</td>
                    <td>
                      <div className="small">{sup.email}</div>
                      <div className="text-secondary small font-monospace">{sup.phone}</div>
                    </td>
                    <td className="text-secondary small">{sup.address}</td>
                    <td className="text-end fw-bold font-monospace text-warning">
                      {formatCurrency(sup.pendingPayments, currencySymbol)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>PO ID</th>
                <th>Supplier Partner</th>
                <th>Items Count</th>
                <th>Draft Date</th>
                <th>Order Cost Value</th>
                <th>Status</th>
                {hasPermission(['super_admin', 'store_manager', 'inventory_staff']) && <th className="text-end">Receiving Action</th>}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-secondary">No purchase orders found.</td>
                </tr>
              ) : (
                filteredOrders.map(po => {
                  const itemsQty = po.items.reduce((s, i) => s + i.quantity, 0);
                  return (
                    <tr key={po.id}>
                      <td className="fw-bold font-monospace text-accent">{po.id}</td>
                      <td><strong>{po.supplierName}</strong></td>
                      <td>{itemsQty} units ({po.items.length} unique variants)</td>
                      <td className="text-secondary small">{formatDate(po.createdAt)}</td>
                      <td className="fw-bold font-monospace">{formatCurrency(po.totalAmount, currencySymbol)}</td>
                      <td>
                        <span className={`custom-badge ${po.status === 'Received' ? 'badge-success' : 'badge-warning'}`}>
                          {po.status}
                        </span>
                      </td>
                      {hasPermission(['super_admin', 'store_manager', 'inventory_staff']) && (
                        <td className="text-end">
                          {po.status === 'Pending' ? (
                            <button 
                              className="btn btn-sm btn-accent d-inline-flex align-items-center gap-1 py-1"
                              onClick={() => handleReceiveStock(po)}
                            >
                              <FiCheck /> Receive Stock
                            </button>
                          ) : (
                            <span className="text-success small fw-semibold">★ Ingested</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: Add Supplier popup */}
      {showAddSupplierModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-secondary text-primary border" style={{ borderColor: 'var(--border-color)' }}>
              <div className="modal-header border-bottom" style={{ borderColor: 'var(--border-color)' }}>
                <h5 className="modal-title fw-bold">Add Supplier Partner</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddSupplierModal(false)}></button>
              </div>
              <form onSubmit={handleAddSupplier}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-medium">Company Name</label>
                    <input type="text" className="form-control bg-transparent" value={supCompany} onChange={(e) => setSupCompany(e.target.value)} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-medium">Representative Contact Name</label>
                    <input type="text" className="form-control bg-transparent" value={supName} onChange={(e) => setSupName(e.target.value)} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-medium">GSTIN Registration</label>
                    <input type="text" className="form-control bg-transparent font-monospace" placeholder="e.g. 27AAAEC9876D1Z5" value={supGST} onChange={(e) => setSupGST(e.target.value)} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-medium">Email Address</label>
                    <input type="email" className="form-control bg-transparent" value={supEmail} onChange={(e) => setSupEmail(e.target.value)} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-medium">Phone Number</label>
                    <input type="tel" className="form-control bg-transparent font-monospace" value={supPhone} onChange={(e) => setSupPhone(e.target.value)} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-medium">Office Address</label>
                    <textarea className="form-control bg-transparent" rows={2} value={supAddress} onChange={(e) => setSupAddress(e.target.value)}></textarea>
                  </div>
                </div>
                <div className="modal-footer border-top" style={{ borderColor: 'var(--border-color)' }}>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowAddSupplierModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-sm btn-accent">Save Supplier Profile</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Draft Purchase Order popup */}
      {showAddPOModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content bg-secondary text-primary border" style={{ borderColor: 'var(--border-color)' }}>
              <div className="modal-header border-bottom" style={{ borderColor: 'var(--border-color)' }}>
                <h5 className="modal-title fw-bold">Draft Supplier Purchase Order</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddPOModal(false)}></button>
              </div>
              <form onSubmit={handleCreatePO}>
                <div className="modal-body">
                  <div className="row g-3 mb-4">
                    {/* Supplier Picker */}
                    <div className="col-12 col-md-6">
                      <label className="form-label text-secondary small fw-medium">Select Supplier Partner</label>
                      <select className="form-select bg-transparent" value={poSupplierId} onChange={(e) => setPoSupplierId(e.target.value)}>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.company} ({s.name})</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Add item fields to PO */}
                  <div className="p-3 bg-tertiary rounded-3 border mb-4" style={{ borderColor: 'var(--border-color)' }}>
                    <span className="small fw-semibold text-secondary d-block mb-3">Add Variant Quantity</span>
                    <div className="row g-3 align-items-end">
                      <div className="col-12 col-sm-6">
                        <label className="form-label text-secondary small fw-medium">Select Variant Item</label>
                        <select className="form-select bg-transparent" value={selectedVariantId} onChange={(e) => setSelectedVariantId(e.target.value)}>
                          {variants.map(v => <option key={v.id} value={v.id}>{v.productName} ({v.color}/{v.size})</option>)}
                        </select>
                      </div>
                      <div className="col-6 col-sm-2">
                        <label className="form-label text-secondary small fw-medium">Quantity</label>
                        <input type="number" className="form-control bg-transparent" value={itemQty} onChange={(e) => setItemQty(Number(e.target.value))} min={1} />
                      </div>
                      <div className="col-6 col-sm-2">
                        <label className="form-label text-secondary small fw-medium">Unit Cost ({currencySymbol})</label>
                        <input type="number" className="form-control bg-transparent" value={itemCost} onChange={(e) => setItemCost(Number(e.target.value))} min={1} />
                      </div>
                      <div className="col-12 col-sm-2">
                        <button type="button" className="btn btn-accent w-100" onClick={addPOItemDraft}>Add Item</button>
                      </div>
                    </div>
                  </div>

                  {/* PO Draft items list */}
                  <h6 className="fw-bold text-secondary mb-2 small">Purchase Order Items Draft</h6>
                  <div className="table-responsive border rounded bg-tertiary" style={{ borderColor: 'var(--border-color)', maxHeight: '180px' }}>
                    <table className="table table-sm table-hover align-middle mb-0" style={{ color: 'var(--text-primary)' }}>
                      <thead>
                        <tr className="text-secondary small" style={{ fontSize: '0.72rem', borderBottom: '1px solid var(--border-color)' }}>
                          <th>Item Name</th>
                          <th>Size / Color</th>
                          <th>Unit Cost</th>
                          <th>Qty</th>
                          <th>Subtotal</th>
                          <th className="text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {poItems.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center text-secondary py-3 small">No draft items selected.</td>
                          </tr>
                        ) : (
                          poItems.map(item => (
                            <tr key={item.variantId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td><strong className="small">{item.productName}</strong></td>
                              <td><span className="small text-secondary">{item.color} / {item.size}</span></td>
                              <td className="font-monospace small">{formatCurrency(item.costPrice, currencySymbol)}</td>
                              <td>{item.quantity}</td>
                              <td className="fw-semibold font-monospace small">{formatCurrency(item.costPrice * item.quantity, currencySymbol)}</td>
                              <td className="text-end">
                                <button type="button" className="btn btn-sm btn-link text-danger p-0 border-0" onClick={() => removePOItemDraft(item.variantId)}>
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top" style={{ borderColor: 'var(--border-color)' }}>
                    <span className="fw-semibold text-secondary">Estimated Total PO Value:</span>
                    <h5 className="fw-bold font-monospace mb-0 text-accent">
                      {formatCurrency(poItems.reduce((acc, i) => acc + (i.costPrice * i.quantity), 0), currencySymbol)}
                    </h5>
                  </div>
                </div>
                <div className="modal-footer border-top" style={{ borderColor: 'var(--border-color)' }}>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setShowAddPOModal(false); setPoItems([]); }}>Cancel</button>
                  <button type="submit" className="btn btn-sm btn-accent">Publish Purchase Order</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
