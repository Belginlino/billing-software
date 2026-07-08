import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/db';
import { Sale, Expense, ProductVariant, Customer, PurchaseOrder, Product } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { toast } from 'react-toastify';
import { 
  FiFileText, FiDownload, FiDollarSign, FiPercent, 
  FiPieChart, FiTrendingUp, FiShoppingBag, FiUsers 
} from 'react-icons/fi';
import { formatCurrency, formatDate, exportToCSV, exportToExcel, printDocument } from '../../utils/export';

// Chart JS
import { Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend 
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type ReportTab = 'finance' | 'sales' | 'gst' | 'expenses' | 'stock';

export const Reports: React.FC = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const currencySymbol = settings?.currency || '₹';

  // DB States
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<ReportTab>('finance');

  useEffect(() => {
    const loadReportsData = async () => {
      setLoading(true);
      try {
        const [salesData, expensesData, variantsData, productsData, customersData, purchasesData] = await Promise.all([
          dbService.getSales(),
          dbService.getExpenses(),
          dbService.getVariants(),
          dbService.getProducts(),
          dbService.getCustomers(),
          dbService.getPurchases()
        ]);
        setSales(salesData);
        setExpenses(expensesData);
        setVariants(variantsData);
        setProducts(productsData);
        setCustomers(customersData);
        setPurchases(purchasesData);
      } catch (err) {
        toast.error("Failed to load reports analytics.");
      } finally {
        setLoading(false);
      }
    };
    loadReportsData();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-accent" role="status">
          <span className="visually-hidden">Loading Reports...</span>
        </div>
      </div>
    );
  }

  // ==========================================
  // CALCULATIONS & METRICS
  // ==========================================
  const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
  
  // Cost of Goods Sold (COGS) helper
  const getProductForVariant = (variantId: string): Product | undefined => {
    const v = variants.find(varItem => varItem.id === variantId);
    if (!v) return undefined;
    return products.find(p => p.id === v.productId);
  };

  const getCOGS = () => {
    return sales.reduce((acc, s) => {
      return acc + s.items.reduce((sum, item) => {
        const p = getProductForVariant(item.variantId);
        const costPrice = p ? p.purchasePrice : 0;
        return sum + (costPrice * item.quantity);
      }, 0);
    }, 0);
  };

  const totalCOGS = getCOGS();
  const totalOperatingExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  
  // Gross Profit = Revenue - COGS
  const grossProfit = totalRevenue - totalCOGS;
  // Net Profit = Gross Profit - Operating Expenses
  const netProfit = grossProfit - totalOperatingExpenses;
  
  // Tax totals (GST collected is inclusive in sales)
  const totalGSTCollected = sales.reduce((acc, s) => acc + s.gstAmount, 0);

  // ==========================================
  // CHART DATA: Revenue vs Expenses
  // ==========================================
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = new Date().getFullYear();
  
  const monthlyRevenueArray = Array(12).fill(0);
  const monthlyExpenseArray = Array(12).fill(0);

  sales.forEach(s => {
    const d = new Date(s.createdAt);
    if (d.getFullYear() === currentYear) {
      monthlyRevenueArray[d.getMonth()] += s.totalAmount;
    }
  });

  expenses.forEach(e => {
    const d = new Date(e.date);
    if (d.getFullYear() === currentYear) {
      monthlyExpenseArray[d.getMonth()] += e.amount;
    }
  });

  // Since we are in mid-year, trim display labels to months with data
  const monthlyChartData = {
    labels: months.slice(0, new Date().getMonth() + 1),
    datasets: [
      {
        label: 'Revenue',
        data: monthlyRevenueArray.slice(0, new Date().getMonth() + 1),
        backgroundColor: '#6366f1',
        borderWidth: 1,
        borderRadius: 4
      },
      {
        label: 'Expenses',
        data: monthlyExpenseArray.slice(0, new Date().getMonth() + 1),
        backgroundColor: '#ef4444',
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: 'var(--text-secondary)',
          font: { family: 'Outfit' }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'var(--border-color)' },
        ticks: { color: 'var(--text-secondary)', font: { family: 'Outfit' } }
      },
      y: {
        grid: { color: 'var(--border-color)' },
        ticks: { color: 'var(--text-secondary)', font: { family: 'Outfit' } }
      }
    }
  };

  // ==========================================
  // EXPORT HANDLERS
  // ==========================================
  const handleCSVExport = () => {
    if (activeTab === 'sales') {
      const headers = ['invoiceNumber', 'customerName', 'customerPhone', 'cashierName', 'subtotal', 'discountAmount', 'gstAmount', 'totalAmount', 'paymentMethod', 'createdAt'];
      exportToCSV(sales, headers, `Sales_Report_${Date.now()}`);
    } else if (activeTab === 'gst') {
      const headers = ['invoiceNumber', 'customerName', 'totalAmount', 'gstAmount', 'createdAt'];
      exportToCSV(sales, headers, `GST_Report_${Date.now()}`);
    } else if (activeTab === 'expenses') {
      const headers = ['date', 'category', 'description', 'amount', 'createdAt'];
      exportToCSV(expenses, headers, `Expenses_Report_${Date.now()}`);
    } else if (activeTab === 'stock') {
      const headers = ['productName', 'sku', 'barcode', 'color', 'size', 'stock', 'lowStockThreshold'];
      exportToCSV(variants, headers, `Stock_Inventory_Report_${Date.now()}`);
    } else {
      toast.warning("Select Sales, Expenses, GST, or Stock tab to trigger CSV downloads.");
    }
  };

  const handleExcelExport = () => {
    if (activeTab === 'sales') {
      const headers = ['invoiceNumber', 'customerName', 'customerPhone', 'cashierName', 'subtotal', 'discountAmount', 'gstAmount', 'totalAmount', 'paymentMethod', 'createdAt'];
      exportToExcel(sales, headers, `Sales_Report_${Date.now()}`);
    } else if (activeTab === 'gst') {
      const headers = ['invoiceNumber', 'customerName', 'totalAmount', 'gstAmount', 'createdAt'];
      exportToExcel(sales, headers, `GST_Report_${Date.now()}`);
    } else if (activeTab === 'expenses') {
      const headers = ['date', 'category', 'description', 'amount', 'createdAt'];
      exportToExcel(expenses, headers, `Expenses_Report_${Date.now()}`);
    } else if (activeTab === 'stock') {
      const headers = ['productName', 'sku', 'barcode', 'color', 'size', 'stock', 'lowStockThreshold'];
      exportToExcel(variants, headers, `Stock_Inventory_Report_${Date.now()}`);
    } else {
      toast.warning("Select Sales, Expenses, GST, or Stock tab to trigger Excel downloads.");
    }
  };

  return (
    <div>
      {/* Dynamic Tab Filter controls */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div className="btn-group bg-secondary border p-1 rounded-3" style={{ borderColor: 'var(--border-color)' }}>
          <button 
            className={`btn btn-sm px-3 ${activeTab === 'finance' ? 'btn-accent' : 'btn-link text-secondary text-decoration-none'}`}
            onClick={() => setActiveTab('finance')}
          >
            <FiTrendingUp className="me-1.5" /> Profit & Loss
          </button>
          <button 
            className={`btn btn-sm px-3 ${activeTab === 'sales' ? 'btn-accent' : 'btn-link text-secondary text-decoration-none'}`}
            onClick={() => setActiveTab('sales')}
          >
            <FiShoppingBag className="me-1.5" /> Sales Receipts
          </button>
          <button 
            className={`btn btn-sm px-3 ${activeTab === 'gst' ? 'btn-accent' : 'btn-link text-secondary text-decoration-none'}`}
            onClick={() => setActiveTab('gst')}
          >
            <FiPercent className="me-1.5" /> GST Tax
          </button>
          <button 
            className={`btn btn-sm px-3 ${activeTab === 'expenses' ? 'btn-accent' : 'btn-link text-secondary text-decoration-none'}`}
            onClick={() => setActiveTab('expenses')}
          >
            <FiDollarSign className="me-1.5" /> Operating Expenses
          </button>
          <button 
            className={`btn btn-sm px-3 ${activeTab === 'stock' ? 'btn-accent' : 'btn-link text-secondary text-decoration-none'}`}
            onClick={() => setActiveTab('stock')}
          >
            <FiFileText className="me-1.5" /> Stock Levels
          </button>
        </div>

        {/* Exporters */}
        <div className="d-flex gap-2">
          <button 
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
            onClick={() => printDocument('printable-report-area', `${activeTab.toUpperCase()} Analytics Sheet`)}
          >
            <FiFileText /> Export PDF
          </button>
          <button 
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
            onClick={handleExcelExport}
            disabled={activeTab === 'finance'}
          >
            <FiDownload /> Excel
          </button>
          <button 
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
            onClick={handleCSVExport}
            disabled={activeTab === 'finance'}
          >
            <FiDownload /> CSV
          </button>
        </div>
      </div>

      {/* Main reporting panel print wrapper */}
      <div id="printable-report-area">
        {activeTab === 'finance' && (
          <div>
            {/* Finance summary indicators */}
            <div className="row g-4 mb-4">
              <div className="col-12 col-sm-6 col-xl-3">
                <div className="glass-card p-4 border-0">
                  <span className="text-secondary small text-uppercase tracking-wider">Gross Sales Revenue</span>
                  <h3 className="fw-bold mt-1 mb-0 text-accent font-monospace">{formatCurrency(totalRevenue, currencySymbol)}</h3>
                </div>
              </div>
              <div className="col-12 col-sm-6 col-xl-3">
                <div className="glass-card p-4 border-0">
                  <span className="text-secondary small text-uppercase tracking-wider">Cost of Goods (COGS)</span>
                  <h3 className="fw-bold mt-1 mb-0 font-monospace">{formatCurrency(totalCOGS, currencySymbol)}</h3>
                </div>
              </div>
              <div className="col-12 col-sm-6 col-xl-3">
                <div className="glass-card p-4 border-0">
                  <span className="text-secondary small text-uppercase tracking-wider">Operating Expenses (OPEX)</span>
                  <h3 className="fw-bold mt-1 mb-0 text-danger font-monospace">{formatCurrency(totalOperatingExpenses, currencySymbol)}</h3>
                </div>
              </div>
              <div className="col-12 col-sm-6 col-xl-3">
                <div className="glass-card p-4 border-0">
                  <span className="text-secondary small text-uppercase tracking-wider">Net Profit Earnings</span>
                  <h3 className={`fw-bold mt-1 mb-0 font-monospace ${netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatCurrency(netProfit, currencySymbol)}
                  </h3>
                </div>
              </div>
            </div>

            {/* Income Statement comparison graph & P&L sheet */}
            <div className="row g-4">
              {/* MoM Performance Chart */}
              <div className="col-12 col-xl-7">
                <div className="glass-card p-4 border-0" style={{ height: '350px' }}>
                  <h6 className="fw-bold mb-3">Revenue vs Operating Expenses (MoM)</h6>
                  <div style={{ height: '260px' }}>
                    <Bar data={monthlyChartData} options={barChartOptions} />
                  </div>
                </div>
              </div>

              {/* Profit & Loss Sheet Table */}
              <div className="col-12 col-xl-5">
                <div className="glass-card p-4 border-0">
                  <h6 className="fw-bold mb-3">P&L Financial Sheet</h6>
                  <div className="d-flex flex-column gap-2.5" style={{ fontSize: '0.9rem' }}>
                    <div className="d-flex justify-content-between pb-2 border-bottom">
                      <span className="text-secondary">Gross Revenue:</span>
                      <strong className="font-monospace">{formatCurrency(totalRevenue, currencySymbol)}</strong>
                    </div>
                    <div className="d-flex justify-content-between pb-2 border-bottom">
                      <span className="text-secondary">Less Cost of Goods Sold (COGS):</span>
                      <span className="font-monospace text-danger">- {formatCurrency(totalCOGS, currencySymbol)}</span>
                    </div>
                    <div className="d-flex justify-content-between pb-2 border-bottom">
                      <span className="fw-semibold">Gross Profit Margin:</span>
                      <strong className="font-monospace text-success">{formatCurrency(grossProfit, currencySymbol)}</strong>
                    </div>
                    <div className="d-flex justify-content-between pb-2 border-bottom">
                      <span className="text-secondary">Less Operating Expenses (OPEX):</span>
                      <span className="font-monospace text-danger">- {formatCurrency(totalOperatingExpenses, currencySymbol)}</span>
                    </div>
                    <div className="d-flex justify-content-between pt-1 fw-bold fs-6">
                      <span>Net Operating Earnings:</span>
                      <span className={`font-monospace ${netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(netProfit, currencySymbol)}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between pt-2 border-top mt-2 small">
                      <span className="text-secondary">Operating Profit Ratio:</span>
                      <strong className="text-accent">{totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(1)}%` : '0%'}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sales Table list tab */}
        {activeTab === 'sales' && (
          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Customer Name</th>
                  <th>Subtotal</th>
                  <th>Points Deduct</th>
                  <th>GST Collection</th>
                  <th>Paid Total</th>
                  <th>Payment Type</th>
                  <th>Checkout Time</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-secondary">No checkout receipts recorded in database.</td>
                  </tr>
                ) : (
                  sales.map(s => (
                    <tr key={s.id}>
                      <td className="fw-semibold text-accent font-monospace">{s.invoiceNumber}</td>
                      <td>
                        <div className="fw-medium">{s.customerName}</div>
                        <div className="text-secondary small" style={{ fontSize: '0.72rem' }}>{s.customerPhone}</div>
                      </td>
                      <td className="font-monospace">{formatCurrency(s.subtotal, currencySymbol)}</td>
                      <td className="text-danger font-monospace">- {formatCurrency(s.discountAmount, currencySymbol)}</td>
                      <td className="text-secondary font-monospace">{formatCurrency(s.gstAmount, currencySymbol)}</td>
                      <td className="fw-bold font-monospace">{formatCurrency(s.totalAmount, currencySymbol)}</td>
                      <td>
                        <span className="custom-badge badge-info">{s.paymentMethod}</span>
                      </td>
                      <td className="text-secondary small font-monospace">{formatDate(s.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* GST Report tab */}
        {activeTab === 'gst' && (
          <div>
            <div className="glass-card p-4 border-0 mb-4 d-flex justify-content-between align-items-center">
              <div>
                <span className="text-secondary small text-uppercase">Total GST Tax Collected</span>
                <h3 className="fw-bold text-accent font-monospace mt-1 mb-0">{formatCurrency(totalGSTCollected, currencySymbol)}</h3>
              </div>
              <div className="text-end">
                <span className="small text-secondary d-block">CGST (50%): {formatCurrency(totalGSTCollected / 2, currencySymbol)}</span>
                <span className="small text-secondary d-block">SGST (50%): {formatCurrency(totalGSTCollected / 2, currencySymbol)}</span>
              </div>
            </div>

            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Customer Phone</th>
                    <th>Net Bill Total (GST Inc)</th>
                    <th>CGST Collected (9%)</th>
                    <th>SGST Collected (9%)</th>
                    <th>GST Amount Total</th>
                    <th>Date Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map(s => (
                    <tr key={s.id}>
                      <td className="font-monospace fw-semibold text-accent">{s.invoiceNumber}</td>
                      <td className="font-monospace small">{s.customerPhone}</td>
                      <td className="font-monospace">{formatCurrency(s.totalAmount, currencySymbol)}</td>
                      <td className="font-monospace text-secondary">{formatCurrency(s.gstAmount / 2, currencySymbol)}</td>
                      <td className="font-monospace text-secondary">{formatCurrency(s.gstAmount / 2, currencySymbol)}</td>
                      <td className="fw-semibold font-monospace text-accent">{formatCurrency(s.gstAmount, currencySymbol)}</td>
                      <td className="text-secondary small font-monospace">{formatDate(s.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Expenses List tab */}
        {activeTab === 'expenses' && (
          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Invoice Value</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id}>
                    <td><strong>{e.date}</strong></td>
                    <td><span className="custom-badge badge-warning">{e.category}</span></td>
                    <td className="text-secondary small">{e.description}</td>
                    <td className="fw-bold font-monospace">{formatCurrency(e.amount, currencySymbol)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Stock Inventory List tab */}
        {activeTab === 'stock' && (
          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Variant Product</th>
                  <th>SKU Code</th>
                  <th>Barcode</th>
                  <th>Color / Size</th>
                  <th>Threshold</th>
                  <th className="text-end">Units in Stock</th>
                </tr>
              </thead>
              <tbody>
                {variants.map(v => (
                  <tr key={v.id}>
                    <td><strong>{v.productName}</strong></td>
                    <td className="font-monospace small">{v.sku}</td>
                    <td className="font-monospace text-secondary small">{v.barcode}</td>
                    <td>{v.color} / <span className="badge bg-tertiary text-primary font-monospace">{v.size}</span></td>
                    <td className="text-secondary font-monospace small">Threshold: {v.lowStockThreshold}</td>
                    <td className="text-end">
                      <span className={`fw-bold font-monospace custom-badge ${v.stock <= 0 ? 'badge-danger' : v.stock <= v.lowStockThreshold ? 'badge-warning' : 'badge-success'}`}>
                        {v.stock} units
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
