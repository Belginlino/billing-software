import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { FiHome, FiSun, FiMoon, FiLogOut, FiUser } from 'react-icons/fi';

export const POSLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="d-flex flex-column min-vh-100" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* POS Top Navbar */}
      <header className="navbar navbar-expand-lg border-bottom px-4 py-2" style={{
        borderColor: 'var(--border-color)',
        height: '60px',
        backgroundColor: 'var(--bg-secondary)'
      }}>
        <div className="container-fluid d-flex justify-content-between align-items-center">
          {/* Brand */}
          <div className="d-flex align-items-center gap-2" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            {settings?.storeLogo ? (
              <img 
                src={settings.storeLogo} 
                alt="Logo" 
                className="rounded-circle"
                style={{ width: '28px', height: '28px', objectFit: 'cover' }}
              />
            ) : (
              <div className="bg-accent rounded-circle d-flex align-items-center justify-content-center" style={{ width: '28px', height: '28px' }}>
                <span className="fw-bold text-white small">L</span>
              </div>
            )}
            <span className="fw-bold tracking-tight mb-0" style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
              {settings?.storeName || 'LINO MENSWEAR'} <span className="text-accent small font-monospace">POS</span>
            </span>
          </div>

          {/* Cashier Status Info */}
          {user && (
            <div className="d-flex align-items-center gap-2 bg-tertiary px-3 py-1 rounded-3 border d-none d-sm-flex" style={{ borderColor: 'var(--border-color)' }}>
              <FiUser size={14} className="text-accent" />
              <span className="small text-secondary" style={{ fontSize: '0.82rem' }}>
                Cashier: <strong className="text-primary">{user.username}</strong>
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="d-flex align-items-center gap-2">
            <button 
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2" 
              onClick={() => navigate('/')}
            >
              <FiHome /> <span className="d-none d-sm-inline">Back Office</span>
            </button>
            <button 
              onClick={toggleTheme}
              className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center"
              style={{ width: '32px', height: '32px', padding: 0 }}
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {theme === 'dark' ? <FiSun className="text-warning" /> : <FiMoon />}
            </button>
            <button 
              onClick={handleLogout}
              className="btn btn-sm btn-outline-danger d-flex align-items-center gap-2"
            >
              <FiLogOut /> <span className="d-none d-sm-inline">Exit POS</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main viewport */}
      <main className="flex-grow-1 p-3 container-fluid" style={{ overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
};
