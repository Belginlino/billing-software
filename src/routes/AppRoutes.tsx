import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { POSLayout } from '../layouts/POSLayout';

// Pages
import { Login } from '../pages/auth/Login';
import { ForgotPassword } from '../pages/auth/ForgotPassword';
import { Unauthorized } from '../pages/auth/Unauthorized';
import { Dashboard } from '../pages/dashboard/Dashboard';
import { POS } from '../pages/pos/POS';
import { Inventory } from '../pages/inventory/Inventory';
import { Suppliers } from '../pages/suppliers/Suppliers';
import { Expenses } from '../pages/expenses/Expenses';
import { Employees } from '../pages/employees/Employees';
import { Users } from '../pages/users/Users';
import { Reports } from '../pages/reports/Reports';
import { Settings } from '../pages/settings/Settings';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* AUTHENTICATION ROUTES (Guest access only) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* UNAUTHORIZED ROLE ACCESS REDIRECT PAGE */}
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* POS BILLING SCREEN (Cashier/Manager/Admin, wide-screen topnav layout) */}
      <Route element={<ProtectedRoute allowedRoles={['super_admin', 'store_manager', 'cashier']} />}>
        <Route element={<POSLayout />}>
          <Route path="/pos" element={<POS />} />
        </Route>
      </Route>

      {/* BACK OFFICE DASHBOARD LAYOUT (Collapsible sidebar layout) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          {/* Dashboard landing (All authenticated users can see stats summaries) */}
          <Route path="/" element={<Dashboard />} />

          {/* Inventory Manager (Inventory Staff, Manager, Admin) */}
          <Route element={<ProtectedRoute allowedRoles={['super_admin', 'store_manager', 'inventory_staff']} />}>
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/suppliers" element={<Suppliers />} />
          </Route>

          {/* Expense Logging (Accountant, Manager, Admin) */}
          <Route element={<ProtectedRoute allowedRoles={['super_admin', 'store_manager', 'accountant']} />}>
            <Route path="/expenses" element={<Expenses />} />
          </Route>

          {/* Employee Contract Manager (Manager, Admin) */}
          <Route element={<ProtectedRoute allowedRoles={['super_admin', 'store_manager']} />}>
            <Route path="/employees" element={<Employees />} />
          </Route>

          {/* Account priviledge lockers & logs (Super Admin only) */}
          <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
            <Route path="/users" element={<Users />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Financial Audits & Custom PDF Reports (Accountant, Manager, Admin) */}
          <Route element={<ProtectedRoute allowedRoles={['super_admin', 'store_manager', 'accountant']} />}>
            <Route path="/reports" element={<Reports />} />
          </Route>
        </Route>
      </Route>

      {/* CATCH ALL REDIRECTS */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
