import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/db';
import { Expense, ExpenseCategory } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { toast } from 'react-toastify';
import { FiPlus, FiTrash2, FiSearch, FiDollarSign, FiPieChart } from 'react-icons/fi';
import { formatCurrency, formatDate } from '../../utils/export';

// Chart.js components
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export const Expenses: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { settings } = useSettings();
  const currencySymbol = settings?.currency || '$';

  // State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('Rent');
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expenseDesc, setExpenseDesc] = useState<string>('');

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const data = await dbService.getExpenses();
      setExpenses(data);
    } catch (err) {
      toast.error("Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseAmount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    try {
      const newExpense: Expense = {
        id: `exp-${Date.now()}`,
        category: expenseCategory,
        amount: Number(expenseAmount),
        date: expenseDate,
        description: expenseDesc,
        createdAt: new Date().toISOString()
      };

      await dbService.saveExpense(newExpense);
      await dbService.addAuditLog(
        user?.id || 'sys',
        user?.username || 'System',
        user?.role || 'accountant',
        "Settings Changes", // standard action in rules
        `Logged store expense: ${expenseCategory} (Amount: ${formatCurrency(newExpense.amount, currencySymbol)})`
      );

      toast.success("Expense logged successfully!");
      setShowAddModal(false);
      
      // Reset form
      setExpenseAmount(0);
      setExpenseCategory('Rent');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setExpenseDesc('');

      loadExpenses();
    } catch (err) {
      toast.error("Failed to log expense.");
    }
  };

  const handleDeleteExpense = async (id: string, category: string, amount: number) => {
    if (!window.confirm("Are you sure you want to delete this expense record?")) {
      return;
    }

    try {
      await dbService.deleteExpense(id);
      await dbService.addAuditLog(
        user?.id || 'sys',
        user?.username || 'System',
        user?.role || 'accountant',
        "Settings Changes",
        `Deleted expense log for ${category} of ${formatCurrency(amount, currencySymbol)}`
      );
      toast.success("Expense record deleted.");
      loadExpenses();
    } catch (err) {
      toast.error("Failed to delete expense record.");
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-accent" role="status">
          <span className="visually-hidden">Loading Expenses...</span>
        </div>
      </div>
    );
  }

  // Filter lists
  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          e.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'All' || e.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const totalExpenseSum = filteredExpenses.reduce((a, b) => a + b.amount, 0);

  // Compute expenses by category for Doughnut Chart
  const categoriesList: ExpenseCategory[] = ['Electricity', 'Rent', 'Salary', 'Internet', 'Maintenance', 'Marketing', 'Miscellaneous'];
  const categoryAmounts = categoriesList.map(cat => {
    return expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
  });

  const doughnutData = {
    labels: categoriesList,
    datasets: [
      {
        data: categoryAmounts,
        backgroundColor: [
          '#f59e0b', // Electricity
          '#ef4444', // Rent
          '#10b981', // Salary
          '#06b6d4', // Internet
          '#6366f1', // Maintenance
          '#ec4899', // Marketing
          '#6b7280'  // Miscellaneous
        ],
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
        position: 'right' as const,
        labels: {
          color: 'var(--text-secondary)',
          font: { family: 'Outfit', size: 12 }
        }
      }
    }
  };

  return (
    <div>
      <div className="row g-4 mb-4">
        {/* Total stats card */}
        <div className="col-12 col-md-5">
          <div className="glass-card p-4 h-100 border-0 d-flex flex-column justify-content-between">
            <div>
              <span className="text-secondary small text-uppercase tracking-wider">Filtered Total Expenses</span>
              <h2 className="fw-bold mt-1 mb-2 text-danger">{formatCurrency(totalExpenseSum, currencySymbol)}</h2>
              <p className="small text-secondary mb-0">Total cost incurred across all {filteredExpenses.length} transactions.</p>
            </div>
            
            {hasPermission(['super_admin', 'store_manager', 'accountant']) && (
              <button 
                className="btn btn-accent mt-4 d-flex align-items-center justify-content-center gap-2"
                onClick={() => setShowAddModal(true)}
              >
                <FiPlus /> Log Store Expense
              </button>
            )}
          </div>
        </div>

        {/* Categories Share Doughnut */}
        <div className="col-12 col-md-7">
          <div className="glass-card p-4 h-100 border-0">
            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <FiPieChart className="text-accent" /> Expense Breakdown Share
            </h6>
            <div style={{ height: '170px' }}>
              {expenses.length === 0 ? (
                <div className="d-flex justify-content-center align-items-center h-100 text-secondary small">No expenses logged.</div>
              ) : (
                <Doughnut data={doughnutData} options={chartOptions} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Table List */}
      <div className="glass-card p-3 mb-4 border-0">
        <div className="d-flex flex-column flex-sm-row gap-2">
          {/* Search */}
          <div className="input-group flex-grow-1">
            <span className="input-group-text bg-transparent border-end-0" style={{ borderColor: 'var(--border-color)' }}>
              <FiSearch className="text-secondary" />
            </span>
            <input 
              type="text" 
              className="form-control bg-transparent border-start-0" 
              placeholder="Search expenses by keyword description..."
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* Category Filter */}
          <select 
            className="form-select bg-transparent" 
            style={{ width: '180px', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="custom-table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description / Memo</th>
              <th>Amount Incurred</th>
              {hasPermission(['super_admin', 'store_manager', 'accountant']) && <th className="text-end">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-4 text-secondary">
                  No expense records match the filters.
                </td>
              </tr>
            ) : (
              filteredExpenses.map(exp => (
                <tr key={exp.id}>
                  <td><strong>{exp.date}</strong></td>
                  <td>
                    <span className={`custom-badge ${
                      exp.category === 'Salary' ? 'badge-success' : exp.category === 'Rent' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {exp.category}
                    </span>
                  </td>
                  <td className="text-secondary small">{exp.description}</td>
                  <td className="fw-bold font-monospace">{formatCurrency(exp.amount, currencySymbol)}</td>
                  {hasPermission(['super_admin', 'store_manager', 'accountant']) && (
                    <td className="text-end">
                      <button 
                        className="btn btn-sm btn-outline-danger p-1"
                        onClick={() => handleDeleteExpense(exp.id, exp.category, exp.amount)}
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: Log Expense popup */}
      {showAddModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
            <div className="modal-content bg-secondary text-primary border" style={{ borderColor: 'var(--border-color)' }}>
              <div className="modal-header border-bottom" style={{ borderColor: 'var(--border-color)' }}>
                <h5 className="modal-title fw-bold">Log Store Expense</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleAddExpense}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-medium">Expense Category</label>
                    <select 
                      className="form-select bg-transparent" 
                      style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
                    >
                      {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-medium">Cost Amount Incurred ({currencySymbol})</label>
                    <input 
                      type="number" 
                      className="form-control bg-transparent font-monospace" 
                      style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(Number(e.target.value))}
                      min={0.01}
                      step={0.01}
                      required 
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-medium">Date Incurred</label>
                    <input 
                      type="date" 
                      className="form-control bg-transparent" 
                      style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-medium">Description / Notes</label>
                    <textarea 
                      className="form-control bg-transparent" 
                      rows={2} 
                      style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                      value={expenseDesc}
                      onChange={(e) => setExpenseDesc(e.target.value)}
                      placeholder="e.g. Monthly high-speed fiber internet invoice..."
                      required
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer border-top" style={{ borderColor: 'var(--border-color)' }}>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-sm btn-accent">Save Expense Log</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
