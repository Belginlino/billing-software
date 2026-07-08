import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AuthLayout: React.FC = () => {
  const { user } = useAuth();

  // If already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100" style={{
      background: "radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.15) 0%, rgba(9, 13, 22, 0.05) 90.2%), var(--bg-primary)",
      transition: "background 0.3s ease"
    }}>
      <div className="container py-5 animate-fade-in" style={{ maxWidth: '480px' }}>
        <div className="glass-card p-4 p-md-5 border-0">
          <div className="text-center mb-4">
            <h1 className="h3 fw-bold text-accent mb-1 tracking-tight">LINO MENSWEAR</h1>
            <p className="text-muted small uppercase fw-bold mb-0">Menswear Management POS</p>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
};
