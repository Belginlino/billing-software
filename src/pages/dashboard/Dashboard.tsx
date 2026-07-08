import React, { useEffect, useState } from 'react';
import { dbService } from '../../services/db';
import { Sale, ProductVariant, Customer, Product, Expense } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { 
  FiTrendingUp, FiShoppingBag, FiDollarSign, FiAlertCircle, 
  FiUserPlus, FiArrowRight, FiActivity 
} from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../utils/export';
import { useSettings } from '../../context/SettingsContext';

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const Dashboard: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const currencySymbol = settings?.currency || '₹';

  const [sales, setSales] = useState<Sale[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [salesData, variantsData, productsData, customersData, expensesData] = await Promise.all([
          dbService.getSales(),
          dbService.getVariants(),
          dbService.getProducts(),
          dbService.getCustomers(),
          dbService.getExpenses()
        ]);
        setSales(salesData);
        setVariants(variantsData);
        setProducts(productsData);
        setCustomers(customersData);
        setExpenses(expensesData);
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5" style={{ minHeight: '300px' }}>
        <div className="spinner-border text-accent" role="status">
          <span className="visually-hidden">Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  // 1. CALCULATE TOP STATS
  const today = new Date().toDateString();
  const todaySales = sales.filter(s => new Date(s.createdAt).toDateString() === today);
  const todaySalesCount = todaySales.length;
  const todayRevenue = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);

  // Helper mapping variantId to purchasePrice
  const getProductForVariant = (variantId: string): Product | undefined => {
    const v = variants.find(varItem => varItem.id === variantId);
    if (!v) return undefined;
    return products.find(p => p.id === v.productId);
  };

  const getSaleProfit = (saleItem: any): number => {
    const p = getProductForVariant(saleItem.variantId);
    if (!p) return 0;
    // Profit = (sellingPriceAfterDiscount - purchasePrice) * quantity
    return (saleItem.price - p.purchasePrice) * saleItem.quantity;
  };

  const calculateTotalProfit = (saleList: Sale[]) => {
    return saleList.reduce((acc, s) => {
      const itemsProfit = s.items.reduce((sum, item) => sum + getSaleProfit(item), 0);
      // Deduct transaction-level discount (loyalty points / coupon discount)
      return acc + (itemsProfit - s.discountAmount);
    }, 0);
  };

  const todayProfit = calculateTotalProfit(todaySales);

  // Monthly stats
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlySales = sales.filter(s => {
    const d = new Date(s.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const monthlyRevenue = monthlySales.reduce((acc, s) => acc + s.totalAmount, 0);
  const monthlyProfit = calculateTotalProfit(monthlySales);

  // Inventory stats
  const lowStockProducts = variants.filter(v => v.stock > 0 && v.stock <= v.lowStockThreshold);
  const outOfStockProducts = variants.filter(v => v.stock === 0);

  // Recent Sales & Customers
  const recentSales = [...sales].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const recentCustomers = [...customers].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  // 2. CHART PREPARATIONS
  // A. Sales Trend Chart (Last 7 Days)
  const getLast7Days = () => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      result.push(d);
    }
    return result;
  };

  const last7Days = getLast7Days();
  const salesTrendLabels = last7Days.map(d => d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }));
  
  const revenueTrendData = last7Days.map(d => {
    const daySales = sales.filter(s => new Date(s.createdAt).toDateString() === d.toDateString());
    return daySales.reduce((acc, s) => acc + s.totalAmount, 0);
  });

  const profitTrendData = last7Days.map(d => {
    const daySales = sales.filter(s => new Date(s.createdAt).toDateString() === d.toDateString());
    return calculateTotalProfit(daySales);
  });

  const salesTrendChartData = {
    labels: salesTrendLabels,
    datasets: [
      {
        label: 'Revenue',
        data: revenueTrendData,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Net Profit',
        data: profitTrendData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        tension: 0.3,
        fill: true,
      }
    ]
  };

  // B. Category Sales Share Chart
  const categorySalesMap: { [key: string]: number } = {};
  sales.forEach(s => {
    s.items.forEach(item => {
      const p = getProductForVariant(item.variantId);
      if (p) {
        categorySalesMap[p.category] = (categorySalesMap[p.category] || 0) + item.total;
      }
    });
  });

  const categoryLabels = Object.keys(categorySalesMap);
  const categoryValues = Object.values(categorySalesMap);

  const categoryChartData = {
    labels: categoryLabels,
    datasets: [
      {
        data: categoryValues,
        backgroundColor: [
          '#4f46e5',
          '#06b6d4',
          '#10b981',
          '#f59e0b',
          '#ef4444',
        ],
        borderWidth: 1,
        borderColor: 'var(--border-color)'
      }
    ]
  };

  // C. Stock Status Chart
  const stockCategories = ['Healthy (>10)', 'Low (1-5)', 'Out of Stock'];
  const stockCounts = [
    variants.filter(v => v.stock > 10).length,
    variants.filter(v => v.stock > 0 && v.stock <= 5).length,
    variants.filter(v => v.stock === 0).length
  ];

  const stockChartData = {
    labels: stockCategories,
    datasets: [
      {
        label: 'Variant Count',
        data: stockCounts,
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
        borderWidth: 1,
        borderColor: 'var(--border-color)'
      }
    ]
  };

  const chartOptions = {
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

  return (
    <div>
      {/* Dynamic Role Greeting Banner */}
      <div className="mb-4">
        <h5 className="fw-bold">Welcome back, {user?.username}!</h5>
        <p className="text-secondary small">
          Here is the analytical overview for your men's clothing store operations today.
        </p>
      </div>

      {/* Low Stock Alerts */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <div className="alert alert-warning border-0 glass-card d-flex align-items-center gap-3 p-3 mb-4" style={{ backgroundColor: 'var(--color-warning-bg)' }}>
          <FiAlertCircle size={28} className="text-warning flex-shrink-0" />
          <div className="flex-grow-1">
            <h6 className="alert-heading fw-bold mb-1 text-warning">Stock Alerts Notification</h6>
            <p className="small mb-0 text-secondary">
              There are <strong>{outOfStockProducts.length}</strong> items completely out of stock and <strong>{lowStockProducts.length}</strong> items below the safety threshold.
            </p>
          </div>
          {hasPermission(['super_admin', 'store_manager', 'inventory_staff']) && (
            <Link to="/inventory" className="btn btn-sm btn-accent text-nowrap">Restock Inventory</Link>
          )}
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="row g-4 mb-4">
        {/* Today's Sales */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="glass-card p-4 h-100 border-0">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <span className="text-secondary small fw-medium text-uppercase tracking-wider">Today's Revenue</span>
                <h3 className="fw-bold mt-1 mb-0">{formatCurrency(todayRevenue, currencySymbol)}</h3>
              </div>
              <div className="rounded-3 bg-accent p-2.5 text-white">
                <FiDollarSign size={20} />
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge-success custom-badge">
                <FiTrendingUp /> +12%
              </span>
              <span className="text-muted small">{todaySalesCount} transactions</span>
            </div>
          </div>
        </div>

        {/* Today's Net Profit */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="glass-card p-4 h-100 border-0">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <span className="text-secondary small fw-medium text-uppercase tracking-wider">Today's Profit</span>
                <h3 className={`fw-bold mt-1 mb-0 ${todayProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatCurrency(todayProfit, currencySymbol)}
                </h3>
              </div>
              <div className="rounded-3 bg-success p-2.5 text-white">
                <FiTrendingUp size={20} />
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted small">Margin: </span>
              <span className="fw-semibold text-accent small">
                {todayRevenue > 0 ? `${((todayProfit / todayRevenue) * 100).toFixed(0)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="glass-card p-4 h-100 border-0">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <span className="text-secondary small fw-medium text-uppercase tracking-wider">Monthly Revenue</span>
                <h3 className="fw-bold mt-1 mb-0">{formatCurrency(monthlyRevenue, currencySymbol)}</h3>
              </div>
              <div className="rounded-3 bg-info p-2.5 text-white">
                <FiShoppingBag size={20} />
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted small">Target: </span>
              <span className="text-success small fw-semibold">85% achieved</span>
            </div>
          </div>
        </div>

        {/* Low Stock count */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="glass-card p-4 h-100 border-0">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <span className="text-secondary small fw-medium text-uppercase tracking-wider">Inventory Status</span>
                <h3 className="fw-bold mt-1 mb-0 text-warning">{lowStockProducts.length + outOfStockProducts.length} Alerts</h3>
              </div>
              <div className="rounded-3 bg-warning p-2.5 text-white">
                <FiAlertCircle size={20} />
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="text-danger fw-semibold small">{outOfStockProducts.length} Out of Stock</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics Graphs Row */}
      <div className="row g-4 mb-4">
        {/* Sales & Profit Chart */}
        <div className="col-12 col-xl-8">
          <div className="glass-card p-4 border-0" style={{ height: '380px' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <FiActivity className="text-accent" /> Revenue & Profit Trend (Last 7 Days)
              </h6>
            </div>
            <div style={{ height: '290px' }}>
              <Line data={salesTrendChartData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Category Share Distribution */}
        <div className="col-12 col-md-6 col-xl-4">
          <div className="glass-card p-4 border-0" style={{ height: '380px' }}>
            <h6 className="fw-bold mb-3">Sales Share by Category</h6>
            <div className="position-relative" style={{ height: '260px' }}>
              {categoryValues.length === 0 ? (
                <div className="d-flex justify-content-center align-items-center h-100 text-secondary small">
                  No sales recorded yet
                </div>
              ) : (
                <Doughnut 
                  data={categoryChartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: { color: 'var(--text-secondary)', font: { family: 'Outfit', size: 11 } }
                      }
                    }
                  }} 
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Lists Summary Row */}
      <div className="row g-4">
        {/* Recent Transactions List */}
        <div className="col-12 col-xl-8">
          <div className="glass-card p-4 border-0">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0">Recent Sales Checkout</h6>
              {hasPermission(['super_admin', 'store_manager', 'cashier']) && (
                <Link to="/pos" className="text-accent text-decoration-none small d-flex align-items-center gap-1">
                  Open POS Terminal <FiArrowRight />
                </Link>
              )}
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle border-0 mb-0">
                <thead>
                  <tr className="text-secondary small text-uppercase" style={{ fontSize: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                    <th className="border-0 px-2 py-3">Invoice</th>
                    <th className="border-0 px-2 py-3">Customer</th>
                    <th className="border-0 px-2 py-3">Total Paid</th>
                    <th className="border-0 px-2 py-3">Payment</th>
                    <th className="border-0 px-2 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-secondary py-4 small">No sales logged in DB.</td>
                    </tr>
                  ) : (
                    recentSales.map(sale => (
                      <tr key={sale.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td className="px-2 py-3 fw-semibold text-accent">{sale.invoiceNumber}</td>
                        <td className="px-2 py-3">
                          <div className="fw-medium">{sale.customerName}</div>
                          <div className="text-muted small" style={{ fontSize: '0.75rem' }}>{sale.customerPhone}</div>
                        </td>
                        <td className="px-2 py-3 fw-bold">{formatCurrency(sale.totalAmount, currencySymbol)}</td>
                        <td className="px-2 py-3">
                          <span className={`custom-badge ${sale.paymentMethod === 'Cash' ? 'badge-success' : 'badge-info'}`}>
                            {sale.paymentMethod}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-secondary small">{formatDate(sale.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Customers list */}
        <div className="col-12 col-md-6 col-xl-4">
          <div className="glass-card p-4 border-0">
            <h6 className="fw-bold mb-3">Loyal Customers Directory</h6>
            <div className="d-flex flex-column gap-3">
              {recentCustomers.length === 0 ? (
                <div className="text-center text-secondary py-4 small">No customers registered.</div>
              ) : (
                recentCustomers.map(cust => (
                  <div key={cust.id} className="d-flex align-items-center justify-content-between p-2 rounded hover-bg-tertiary">
                    <div className="overflow-hidden">
                      <div className="fw-semibold text-truncate small">{cust.name}</div>
                      <div className="text-muted small" style={{ fontSize: '0.75rem' }}>{cust.phone}</div>
                    </div>
                    <div className="text-end">
                      <span className="fw-bold text-accent small">{cust.loyaltyPoints} pts</span>
                      <span className={`d-block custom-badge mt-1 ${
                        cust.rewardLevel === 'Platinum' ? 'badge-success' : cust.rewardLevel === 'Gold' ? 'badge-warning' : 'badge-info'
                      }`} style={{ fontSize: '0.65rem' }}>
                        {cust.rewardLevel}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
