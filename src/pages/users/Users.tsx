import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/db';
import { User, AuditLog, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FiUserPlus, FiLock, FiUnlock, FiKey, FiActivity, FiUserCheck, FiTrash2 } from 'react-icons/fi';
import { formatDate } from '../../utils/export';

export const Users: React.FC = () => {
  const { user: currentUser } = useAuth();
  
  // States
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // Form State (New User Account)
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('cashier');

  const loadUserData = async () => {
    setLoading(true);
    try {
      const [usersData, logsData] = await Promise.all([
        dbService.getUsers(),
        dbService.getAuditLogs()
      ]);
      setUsers(usersData);
      setLogs(logsData);
    } catch (err) {
      toast.error("Failed to load user management details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail) {
      toast.error("Username and Email address are required.");
      return;
    }

    try {
      const userId = `u-${Date.now()}`;
      const newUser: User = {
        id: userId,
        username: userName,
        email: userEmail,
        role: userRole,
        status: 'active',
        createdAt: new Date().toISOString()
      };

      await dbService.saveUser(newUser);
      await dbService.addAuditLog(
        currentUser?.id || 'sys',
        currentUser?.username || 'Super Admin',
        currentUser?.role || 'super_admin',
        "User Creation",
        `Created employee account login: ${userEmail} (${userRole})`
      );

      toast.success("New user account created successfully!");
      setShowAddUserModal(false);
      
      // Reset
      setUserName('');
      setUserEmail('');
      setUserRole('cashier');
      loadUserData();
    } catch (err) {
      toast.error("Failed to create user account.");
    }
  };

  // Toggle user status (active / disabled)
  const handleToggleStatus = async (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error("Cannot disable or lock your own active login session.");
      return;
    }

    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    const logAction = newStatus === 'disabled' ? "Disable User" : "Unlock Account"; // mapping to standard rules actions

    try {
      user.status = newStatus;
      await dbService.saveUser(user);
      await dbService.addAuditLog(
        currentUser?.id || 'sys',
        currentUser?.username || 'Super Admin',
        currentUser?.role || 'super_admin',
        "Role Assignment", // audit action matches firestore.rules rules
        `Updated account status for ${user.email}: Set to ${newStatus}`
      );

      toast.success(`Account for ${user.username} has been ${newStatus === 'disabled' ? 'disabled/locked' : 'activated/unlocked'}.`);
      loadUserData();
    } catch (err) {
      toast.error("Failed to toggle user account status.");
    }
  };

  const handleUpdateRole = async (user: User, newRole: UserRole) => {
    if (user.id === currentUser?.id) {
      toast.error("Cannot change your own security privilege role.");
      return;
    }

    try {
      const oldRole = user.role;
      user.role = newRole;
      await dbService.saveUser(user);
      await dbService.addAuditLog(
        currentUser?.id || 'sys',
        currentUser?.username || 'Super Admin',
        currentUser?.role || 'super_admin',
        "Role Assignment",
        `Assigned role for ${user.email} from ${oldRole} to ${newRole}`
      );

      toast.success(`Security privileges updated: Assigned ${user.username} as ${formatRole(newRole)}.`);
      loadUserData();
    } catch (err) {
      toast.error("Failed to update user security role.");
    }
  };

  const handleResetPassword = async (user: User) => {
    try {
      await dbService.addAuditLog(
        currentUser?.id || 'sys',
        currentUser?.username || 'Super Admin',
        currentUser?.role || 'super_admin',
        "Password Reset",
        `Initiated password reset routine for employee: ${user.email}`
      );
      toast.success(`Password reset dispatch successfully queued/simulated for ${user.email}!`);
    } catch (err) {
      toast.error("Failed to queue password reset.");
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error("Cannot delete your own active login account.");
      return;
    }

    if (!window.confirm(`Are you absolutely sure you want to permanently delete user account "${user.username}"?`)) {
      return;
    }

    try {
      await dbService.deleteUser(user.id);
      await dbService.addAuditLog(
        currentUser?.id || 'sys',
        currentUser?.username || 'Super Admin',
        currentUser?.role || 'super_admin',
        "User Creation",
        `Permanently deleted login account: ${user.email}`
      );
      toast.success("User account deleted successfully.");
      loadUserData();
    } catch (err) {
      toast.error("Failed to delete user account.");
    }
  };

  const formatRole = (role: string) => {
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-accent" role="status">
          <span className="visually-hidden">Loading User Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Account Settings Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="fw-bold m-0">Employee Accounts</h5>
          <span className="text-secondary small">Super Admin Security Panel</span>
        </div>
        <button 
          className="btn btn-accent d-flex align-items-center gap-2"
          onClick={() => setShowAddUserModal(true)}
        >
          <FiUserPlus /> Create User Account
        </button>
      </div>

      {/* User Accounts Table */}
      <div className="custom-table-container mb-5">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Login Email Address</th>
              <th>System Role Level</th>
              <th>Session Status</th>
              <th>Last Active Login</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td><strong>{u.username}</strong></td>
                <td className="font-monospace small">{u.email}</td>
                <td>
                  {u.id === currentUser?.id ? (
                    <span className="custom-badge badge-success">{formatRole(u.role)}</span>
                  ) : (
                    <select 
                      className="form-select form-select-sm bg-transparent"
                      style={{ width: '160px', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                      value={u.role}
                      onChange={(e) => handleUpdateRole(u, e.target.value as UserRole)}
                    >
                      <option value="super_admin">Super Admin</option>
                      <option value="store_manager">Store Manager</option>
                      <option value="cashier">Cashier</option>
                      <option value="inventory_staff">Inventory Staff</option>
                      <option value="accountant">Accountant</option>
                    </select>
                  )}
                </td>
                <td>
                  <span className={`custom-badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                    {u.status === 'active' ? 'Unlocked' : 'Locked / Disabled'}
                  </span>
                </td>
                <td className="text-secondary small font-monospace">
                  {u.lastLogin ? formatDate(u.lastLogin) : 'Never'}
                </td>
                <td className="text-end">
                  <div className="d-inline-flex gap-1.5">
                    {/* Status Locker */}
                    <button 
                      className={`btn btn-sm p-1.5 btn-outline-secondary`}
                      onClick={() => handleToggleStatus(u)}
                      title={u.status === 'active' ? 'Disable / Lock account' : 'Unlock account'}
                    >
                      {u.status === 'active' ? <FiLock size={13} className="text-danger" /> : <FiUnlock size={13} className="text-success" />}
                    </button>
                    {/* Password reset */}
                    <button 
                      className="btn btn-sm btn-outline-secondary p-1.5" 
                      onClick={() => handleResetPassword(u)}
                      title="Reset Password"
                    >
                      <FiKey size={13} />
                    </button>
                    {/* Delete account */}
                    <button 
                      className="btn btn-sm btn-outline-danger p-1.5" 
                      onClick={() => handleDeleteUser(u)}
                      title="Delete Login"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* System Audit Logs Section */}
      <div className="mb-4">
        <h5 className="fw-bold d-flex align-items-center gap-2">
          <FiActivity className="text-accent" /> System Audit Logs
        </h5>
        <span className="text-secondary small">Real-time log of security events and sales checkouts</span>
      </div>

      {/* Audit Log Table */}
      <div className="custom-table-container">
        <table className="custom-table">
          <thead>
            <tr style={{ fontSize: '0.8rem' }}>
              <th>Timestamp</th>
              <th>User Account</th>
              <th>Action Category</th>
              <th>Log Details Description</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: '0.85rem' }}>
            {logs.map(log => (
              <tr key={log.id}>
                <td className="font-monospace text-secondary small">{formatDate(log.timestamp)}</td>
                <td>
                  <strong className="small">{log.username}</strong>
                  <span className="custom-badge badge-info ms-2" style={{ fontSize: '0.62rem' }}>
                    {formatRole(log.role)}
                  </span>
                </td>
                <td>
                  <span className={`custom-badge ${
                    log.action.includes('Sales') ? 'badge-success' : 
                    log.action.includes('User') || log.action.includes('Role') ? 'badge-warning' : 
                    'badge-info'
                  }`} style={{ fontSize: '0.65rem' }}>
                    {log.action}
                  </span>
                </td>
                <td className="text-secondary">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL: Onboard User Account popup */}
      {showAddUserModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
            <div className="modal-content bg-secondary text-primary border" style={{ borderColor: 'var(--border-color)' }}>
              <div className="modal-header border-bottom" style={{ borderColor: 'var(--border-color)' }}>
                <h5 className="modal-title fw-bold">Create User Login</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddUserModal(false)}></button>
              </div>
              <form onSubmit={handleCreateUser}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-medium">Staff Profile Name</label>
                    <input type="text" className="form-control bg-transparent" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="e.g. Sales Cashier John" required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-medium">System Email Address</label>
                    <input type="email" className="form-control bg-transparent font-monospace" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="username@voguemenswear.com" required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-medium">Assigned Role privileges</label>
                    <select className="form-select bg-transparent" value={userRole} onChange={(e) => setUserRole(e.target.value as UserRole)}>
                      <option value="super_admin">Super Admin</option>
                      <option value="store_manager">Store Manager</option>
                      <option value="cashier">Cashier</option>
                      <option value="inventory_staff">Inventory Staff</option>
                      <option value="accountant">Accountant</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer border-top" style={{ borderColor: 'var(--border-color)' }}>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowAddUserModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-sm btn-accent">Publish User Account</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
