import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { isFirebaseEnabled } from '../firebase/config';
import { 
  FiGrid, FiShoppingBag, FiBox, FiTruck, FiDollarSign, 
  FiUsers, FiLock, FiPieChart, FiSettings, FiSun, FiMoon, 
  FiLogOut, FiMenu, FiUser, FiX, FiChevronRight
} from 'react-icons/fi';

export const DashboardLayout: React.FC = () => {
  const { user, logout, hasPermission } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { settings } = useSettings();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Define sidebar links with route path, label, icon, and allowed roles
  const menuItems = [
    { path: '/', label: 'Dashboard', icon: <FiGrid />, roles: ['super_admin', 'store_manager', 'cashier', 'inventory_staff', 'accountant'] },
    { path: '/pos', label: 'Billing POS', icon: <FiShoppingBag />, roles: ['super_admin', 'store_manager', 'cashier'] },
    { path: '/inventory', label: 'Inventory', icon: <FiBox />, roles: ['super_admin', 'store_manager', 'inventory_staff'] },
    { path: '/suppliers', label: 'Suppliers', icon: <FiTruck />, roles: ['super_admin', 'store_manager', 'inventory_staff'] },
    { path: '/expenses', label: 'Expenses', icon: <FiDollarSign />, roles: ['super_admin', 'store_manager', 'accountant'] },
    { path: '/employees', label: 'Employees', icon: <FiUsers />, roles: ['super_admin', 'store_manager'] },
    { path: '/users', label: 'User Control', icon: <FiLock />, roles: ['super_admin'] },
    { path: '/reports', label: 'Analytics & Reports', icon: <FiPieChart />, roles: ['super_admin', 'store_manager', 'accountant'] },
    { path: '/settings', label: 'Store Settings', icon: <FiSettings />, roles: ['super_admin'] },
  ];

  // Helper to format role name for display
  const formatRole = (role: string) => {
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getPageTitle = () => {
    const matched = menuItems.find(item => item.path === location.pathname);
    return matched ? matched.label : 'Management System';
  };

  return (
    <div className="app-container">
      {/* Backdrop for mobile drawer */}
      {mobileOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-mobile-active' : ''}`} style={{ backgroundColor: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}>
        {/* Brand Header */}
        <div className="d-flex align-items-center justify-content-between p-3 border-bottom" style={{ borderColor: 'var(--sidebar-border)', height: '70px' }}>
          <div className="d-flex align-items-center gap-2 overflow-hidden">
            {settings?.storeLogo ? (
              <img 
                src={settings.storeLogo} 
                alt="Logo" 
                className="rounded-circle"
                style={{ width: '32px', height: '32px', objectFit: 'cover' }}
              />
            ) : (
              <div className="bg-accent rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px', minWidth: '32px' }}>
                <span className="fw-bold text-white small">V</span>
              </div>
            )}
            {(!collapsed || mobileOpen) && (
              <span className="fw-bold tracking-tight text-truncate" style={{ fontSize: '1.25rem', fontFamily: 'Outfit', color: 'var(--accent-color)' }}>
                lino clothing<span style={{ color: 'var(--text-primary)' }}>.</span>
              </span>
            )}
          </div>
          <button 
            className="btn btn-sm btn-link p-0 border-0 d-none d-md-block" 
            style={{ opacity: 0.7, color: 'var(--sidebar-text)' }}
            onClick={() => setCollapsed(!collapsed)}
          >
            <FiMenu size={18} />
          </button>
          <button 
            className="btn btn-sm btn-link p-0 border-0 d-md-none" 
            style={{ color: 'var(--sidebar-text)' }}
            onClick={() => setMobileOpen(false)}
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-grow-1 p-2 overflow-y-auto" style={{ listStyle: 'none' }}>
          {menuItems.map(item => {
            if (!hasPermission(item.roles as any)) return null;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="sidebar-link text-decoration-none"
                title={collapsed ? item.label : ''}
                onClick={() => setMobileOpen(false)}
              >
                <div className="sidebar-link-content">
                  <span className="sidebar-link-icon">
                    {item.icon}
                  </span>
                  {(!collapsed || mobileOpen) && <span className="sidebar-link-text">{item.label}</span>}
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="p-2 border-top" style={{ borderColor: 'var(--sidebar-border)' }}>
          {/* Theme Switcher */}
          <button 
            onClick={() => {
              toggleTheme();
              setMobileOpen(false);
            }}
            className="btn btn-sm w-100 sidebar-link border-0"
            style={{ textAlign: 'left' }}
          >
            <div className="sidebar-link-content">
              <span className="sidebar-link-icon">
                {theme === 'dark' ? <FiSun className="text-warning" /> : <FiMoon />}
              </span>
              {(!collapsed || mobileOpen) && <span className="sidebar-link-text">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
            </div>
          </button>

          {/* Logout */}
          <button 
            onClick={handleLogout}
            className="btn btn-sm w-100 sidebar-link text-danger border-0"
            style={{ textAlign: 'left' }}
          >
            <div className="sidebar-link-content">
              <span className="sidebar-link-icon">
                <FiLogOut />
              </span>
              {(!collapsed || mobileOpen) && <span className="sidebar-link-text">Logout</span>}
            </div>
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className={`main-content ${collapsed ? 'main-content-expanded' : ''}`} style={{
        backgroundColor: 'var(--bg-primary)',
        transition: 'margin-left var(--transition-speed) ease'
      }}>
        {/* Top Navbar Header */}
        <header className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom" style={{ borderColor: 'var(--border-color)', height: '50px' }}>
          <div className="d-flex align-items-center gap-2">
            <button 
              className="btn btn-sm btn-link text-secondary p-0 border-0 d-md-none" 
              onClick={() => setMobileOpen(true)}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <FiMenu size={22} />
            </button>
            <h4 className="fw-bold mb-0 text-accent tracking-tight">{getPageTitle()}</h4>
          </div>
          <div className="d-flex align-items-center gap-3">
            <span className="text-secondary small d-none d-sm-inline">
              Today: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <div className="bg-secondary px-3 py-1.5 rounded-3 border d-none d-md-block" style={{ borderColor: 'var(--border-color)' }}>
              <span className="small text-secondary">POS: </span>
              <span className="small fw-semibold text-accent">{isFirebaseEnabled ? 'Cloud Sync' : 'Offline Mock'}</span>
            </div>
            {/* User Profile Avatar with dynamic Dicebear SVG */}
            {user && (
              <div className="d-flex align-items-center gap-2 border-start ps-3" style={{ borderColor: 'var(--border-color)' }}>
                <img 
                  src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${user.username}`} 
                  alt="avatar" 
                  className="rounded-circle border bg-light" 
                  style={{ width: '36px', height: '36px', objectFit: 'cover' }}
                />
                <div className="d-none d-lg-block text-start" style={{ lineHeight: 1.2 }}>
                  <div className="fw-semibold text-primary" style={{ fontSize: '0.85rem' }}>{user.username}</div>
                  <div className="text-secondary small" style={{ fontSize: '0.7rem' }}>{formatRole(user.role)}</div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Outlet for router page rendering */}
        <div className="animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
