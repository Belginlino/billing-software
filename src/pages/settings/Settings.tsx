import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/db';
import { toast } from 'react-toastify';
import { FiSave, FiDownload, FiUpload, FiSettings, FiVolume2 } from 'react-icons/fi';
import { StoreSettings } from '../../types';

export const Settings: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  // Form states initialized from settings context
  const [storeName, setStoreName] = useState(settings?.storeName || '');
  const [storeLogo, setStoreLogo] = useState(settings?.storeLogo || '');
  const [gstNumber, setGstNumber] = useState(settings?.gstNumber || '');
  const [invoicePrefix, setInvoicePrefix] = useState(settings?.invoicePrefix || '');
  const [taxPercentage, setTaxPercentage] = useState(settings?.taxPercentage || 18);
  const [currency, setCurrency] = useState(settings?.currency || '₹');
  const [lowStockAlertLevel, setLowStockAlertLevel] = useState(settings?.lowStockAlertLevel || 5);
  const [loyaltyPointsRatio, setLoyaltyPointsRatio] = useState(settings?.loyaltyPointsRatio || 0.05);

  const [saving, setSaving] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated: Partial<StoreSettings> = {
        storeName,
        storeLogo,
        gstNumber,
        invoicePrefix,
        taxPercentage: Number(taxPercentage),
        currency,
        lowStockAlertLevel: Number(lowStockAlertLevel),
        loyaltyPointsRatio: Number(loyaltyPointsRatio)
      };

      await updateSettings(updated);
      
      // Audit log
      await dbService.addAuditLog(
        user?.id || 'sys',
        user?.username || 'Super Admin',
        user?.role || 'super_admin',
        "Settings Changes",
        `Updated store settings configuration (Logo, tax, currency, and stock alert levels).`
      );

      toast.success("Settings updated successfully!");
    } catch (err) {
      toast.error("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // BACKUP & RESTORE DB LOGIC
  // ==========================================
  const handleBackup = async () => {
    try {
      // Gather all local storage keys associated with the app database
      const backupData = {
        vogue_settings: localStorage.getItem('vogue_settings'),
        vogue_users: localStorage.getItem('vogue_users'),
        vogue_employees: localStorage.getItem('vogue_employees'),
        vogue_categories: localStorage.getItem('vogue_categories'),
        vogue_brands: localStorage.getItem('vogue_brands'),
        vogue_products: localStorage.getItem('vogue_products'),
        vogue_variants: localStorage.getItem('vogue_variants'),
        vogue_customers: localStorage.getItem('vogue_customers'),
        vogue_purchases: localStorage.getItem('vogue_purchases'),
        vogue_expenses: localStorage.getItem('vogue_expenses'),
        vogue_sales: localStorage.getItem('vogue_sales'),
        vogue_returns: localStorage.getItem('vogue_returns'),
        vogue_audit_logs: localStorage.getItem('vogue_audit_logs')
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vogue_menswear_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Log audit
      await dbService.addAuditLog(
        user?.id || 'sys',
        user?.username || 'Super Admin',
        user?.role || 'super_admin',
        "Settings Changes",
        "Generated and downloaded localized database configuration backup JSON file."
      );
      toast.success("Database backup file downloaded!");
    } catch (err) {
      toast.error("Failed to generate database backup.");
    }
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("WARNING: Restoring will overwrite all current local storage catalog collections, checkout bills, and employee logins. Do you wish to proceed?")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backupData = JSON.parse(event.target?.result as string);
        
        // Restore each key
        Object.keys(backupData).forEach(key => {
          if (backupData[key]) {
            localStorage.setItem(key, backupData[key]);
          }
        });

        // Log audit
        await dbService.addAuditLog(
          user?.id || 'sys',
          user?.username || 'Super Admin',
          user?.role || 'super_admin',
          "Settings Changes",
          "Restored and merged database configurations from backup JSON file upload."
        );

        toast.success("Database restored successfully! Reloading configuration...");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err) {
        toast.error("Failed to parse the backup JSON file. Ensure it is a valid backup.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="row g-4">
      {/* Configuration Form */}
      <div className="col-12 col-xl-8">
        <div className="glass-card p-4 border-0">
          <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
            <FiSettings size={18} className="text-accent" /> General Store Settings
          </h6>
          
          <form onSubmit={handleSaveSettings}>
            <div className="row g-3">
              {/* Store details */}
              <div className="col-12 col-md-6">
                <label className="form-label text-secondary small fw-medium">Store Name</label>
                <input type="text" className="form-control bg-transparent" value={storeName} onChange={(e) => setStoreName(e.target.value)} required />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label text-secondary small fw-medium">Store Logo Image URL</label>
                <input type="text" className="form-control bg-transparent" value={storeLogo} onChange={(e) => setStoreLogo(e.target.value)} />
              </div>

              <div className="col-6 col-md-4">
                <label className="form-label text-secondary small fw-medium">GSTIN Number</label>
                <input type="text" className="form-control bg-transparent font-monospace" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label text-secondary small fw-medium">Invoice No Prefix</label>
                <input type="text" className="form-control bg-transparent font-monospace" value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} />
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label text-secondary small fw-medium">Tax Percentage (GST %)</label>
                <input type="number" className="form-control bg-transparent" value={taxPercentage} onChange={(e) => setTaxPercentage(Number(e.target.value))} min={0} max={100} />
              </div>

              {/* Currency & stock alerts */}
              <div className="col-6 col-md-4">
                <label className="form-label text-secondary small fw-medium">Currency Symbol</label>
                <select className="form-select bg-transparent" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="$">USD ($)</option>
                  <option value="₹">INR (₹)</option>
                  <option value="£">GBP (£)</option>
                  <option value="€">EUR (€)</option>
                </select>
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label text-secondary small fw-medium">Low Stock Warning Count</label>
                <input type="number" className="form-control bg-transparent" value={lowStockAlertLevel} onChange={(e) => setLowStockAlertLevel(Number(e.target.value))} min={1} />
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label text-secondary small fw-medium">Loyalty Reward Ratio</label>
                <select className="form-select bg-transparent" value={loyaltyPointsRatio} onChange={(e) => setLoyaltyPointsRatio(Number(e.target.value))}>
                  <option value={0.02}>2% points back</option>
                  <option value={0.05}>5% points back (Standard)</option>
                  <option value={0.1}>10% points back (Platinum)</option>
                </select>
              </div>

              {/* Theme Settings selector */}
              <div className="col-12 border-top pt-3 mt-4" style={{ borderColor: 'var(--border-color)' }}>
                <span className="small text-secondary fw-semibold d-block mb-3">Workspace Layout Settings</span>
                <div className="d-flex align-items-center gap-3">
                  <button 
                    type="button" 
                    className={`btn btn-sm ${theme === 'dark' ? 'btn-accent' : 'btn-outline-secondary'}`}
                    onClick={() => setTheme('dark')}
                  >
                    Dark Slate Obsidian
                  </button>
                  <button 
                    type="button" 
                    className={`btn btn-sm ${theme === 'light' ? 'btn-accent' : 'btn-outline-secondary'}`}
                    onClick={() => setTheme('light')}
                  >
                    Classic Ice Light
                  </button>
                </div>
              </div>

              {/* Submit */}
              <div className="col-12 mt-4">
                <button type="submit" className="btn btn-accent d-flex align-items-center gap-2" disabled={saving}>
                  <FiSave /> {saving ? 'Saving changes...' : 'Save Settings Details'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Backup & Recovery panel */}
      <div className="col-12 col-xl-4">
        <div className="glass-card p-4 border-0 mb-4">
          <h6 className="fw-bold mb-3 d-flex align-items-center gap-2 text-warning">
            <FiDownload /> Local DB Backup
          </h6>
          <p className="text-secondary small mb-4">
            Compress and download all database configurations, employee files, supplier matrices, cost logs, and POS receipts into a standalone `.json` backup file.
          </p>
          <button className="btn btn-sm btn-outline-warning w-100 d-flex align-items-center justify-content-center gap-2 py-2" onClick={handleBackup}>
            <FiDownload /> Generate JSON Backup
          </button>
        </div>

        <div className="glass-card p-4 border-0">
          <h6 className="fw-bold mb-3 d-flex align-items-center gap-2 text-danger">
            <FiUpload /> Restore Database
          </h6>
          <p className="text-secondary small mb-4">
            Upload a previously generated database backup JSON file to overwrite and reinitialize your store inventory records, receipts, and user profiles.
          </p>
          <div className="position-relative">
            <input 
              type="file" 
              className="form-control form-control-sm bg-transparent" 
              accept=".json"
              style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
              onChange={handleRestore}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
