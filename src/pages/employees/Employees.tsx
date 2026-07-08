import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/db';
import { Employee, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { toast } from 'react-toastify';
import { FiPlus, FiSearch, FiCalendar, FiCheckCircle, FiTrash2 } from 'react-icons/fi';
import { formatCurrency } from '../../utils/export';

export const Employees: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { settings } = useSettings();
  const currencySymbol = settings?.currency || '$';

  // DB States
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  // Form State (New Employee)
  const [empName, setEmpName] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empRole, setEmpRole] = useState<UserRole>('cashier');
  const [empSalary, setEmpSalary] = useState<number>(2500);
  const [empBirthday, setEmpBirthday] = useState('');
  const [empAddress, setEmpAddress] = useState('');

  // Attendance logging state
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<{ [empId: string]: 'Present' | 'Absent' | 'Leave' }>({});

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const data = await dbService.getEmployees();
      setEmployees(data);

      // Pre-populate today's default attendance as Present
      const defaultAttendance: { [empId: string]: 'Present' | 'Absent' | 'Leave' } = {};
      data.forEach(e => {
        defaultAttendance[e.id] = e.attendance[attendanceDate] || 'Present';
      });
      setAttendanceRecords(defaultAttendance);
    } catch (err) {
      toast.error("Failed to load staff list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [attendanceDate]);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName || !empPhone || !empEmail) {
      toast.error("Name, Phone and Email are required fields.");
      return;
    }

    try {
      const newEmp: Employee = {
        id: `e-${Date.now()}`,
        name: empName,
        phone: empPhone,
        email: empEmail,
        birthday: empBirthday || '1995-01-01',
        address: empAddress,
        salary: Number(empSalary),
        role: empRole,
        status: 'active',
        attendance: {},
        createdAt: new Date().toISOString()
      };

      await dbService.saveEmployee(newEmp);
      await dbService.addAuditLog(
        user?.id || 'sys',
        user?.username || 'System',
        user?.role || 'store_manager',
        "User Creation", // standard action in rules
        `Hired employee roster profile: ${empName} (${empRole})`
      );

      toast.success("Employee onboarding profile completed!");
      setShowAddModal(false);
      
      // Reset
      setEmpName('');
      setEmpPhone('');
      setEmpEmail('');
      setEmpSalary(2500);
      setEmpAddress('');
      loadEmployees();
    } catch (err) {
      toast.error("Failed to onboard employee.");
    }
  };

  const handleSaveAttendance = async () => {
    try {
      for (const empId of Object.keys(attendanceRecords)) {
        const emp = employees.find(e => e.id === empId);
        if (emp) {
          emp.attendance[attendanceDate] = attendanceRecords[empId];
          await dbService.saveEmployee(emp);
        }
      }

      await dbService.addAuditLog(
        user?.id || 'sys',
        user?.username || 'System',
        user?.role || 'store_manager',
        "Settings Changes",
        `Logged employee attendance checklist for ${attendanceDate}`
      );

      toast.success(`Attendance logs for ${attendanceDate} successfully saved!`);
      setShowAttendanceModal(false);
      loadEmployees();
    } catch (err) {
      toast.error("Failed to save attendance logs.");
    }
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete employee record for "${name}"?`)) {
      return;
    }

    try {
      await dbService.deleteEmployee(id);
      await dbService.addAuditLog(
        user?.id || 'sys',
        user?.username || 'System',
        user?.role || 'super_admin',
        "Settings Changes",
        `Removed employee "${name}" from company records.`
      );
      toast.success("Employee roster profile removed.");
      loadEmployees();
    } catch (err) {
      toast.error("Failed to delete employee profile.");
    }
  };

  const formatRole = (role: string) => {
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // Filters
  const filteredEmployees = employees.filter(e => {
    return e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           e.phone.includes(searchTerm) || 
           e.role.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div>
      {/* Top Banner Stats */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-md-4">
          <div className="glass-card p-3 border-0 d-flex align-items-center gap-3">
            <div className="rounded-circle bg-accent p-3 text-white">
              <FiCheckCircle size={22} />
            </div>
            <div>
              <span className="text-secondary small">Total Active Staff</span>
              <h4 className="fw-bold mb-0">{employees.length} Employees</h4>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="glass-card p-3 border-0 d-flex align-items-center gap-3">
            <div className="rounded-circle bg-success p-3 text-white">
              <FiCalendar size={22} />
            </div>
            <div>
              <span className="text-secondary small">Attendance Rate (Today)</span>
              <h4 className="fw-bold mb-0">
                {employees.length > 0 
                  ? `${((employees.filter(e => e.attendance[new Date().toISOString().split('T')[0]] === 'Present').length / employees.length) * 100).toFixed(0)}%`
                  : '0%'
                }
              </h4>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="glass-card p-3 border-0 d-flex align-items-center gap-3">
            <div className="rounded-circle bg-info p-3 text-white">
              <FiCalendar size={22} />
            </div>
            <div>
              <span className="text-secondary small">Monthly Payroll Estimate</span>
              <h4 className="fw-bold mb-0">{formatCurrency(employees.reduce((s, e) => s + e.salary, 0), currencySymbol)}</h4>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Action Headers */}
      <div className="glass-card p-3 mb-4 border-0">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div className="input-group flex-grow-1" style={{ maxWidth: '400px' }}>
            <span className="input-group-text bg-transparent border-end-0" style={{ borderColor: 'var(--border-color)' }}>
              <FiSearch className="text-secondary" />
            </span>
            <input 
              type="text" 
              className="form-control bg-transparent border-start-0" 
              placeholder="Search staff by Name, Contact phone or Role..."
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="d-flex gap-2">
            <button 
              className="btn btn-outline-secondary d-flex align-items-center gap-2"
              onClick={() => setShowAttendanceModal(true)}
            >
              <FiCalendar /> Attendance Log
            </button>
            {hasPermission(['super_admin']) && (
              <button 
                className="btn btn-accent d-flex align-items-center gap-2"
                onClick={() => setShowAddModal(true)}
              >
                <FiPlus /> Hire Employee
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Employees grid table */}
      <div className="custom-table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Employee Name</th>
              <th>System Role Profile</th>
              <th>Contact Details</th>
              <th>Address Info</th>
              <th>Basic Salary</th>
              <th>Status</th>
              {hasPermission(['super_admin']) && <th className="text-end">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-4 text-secondary">No employees matched the query.</td>
              </tr>
            ) : (
              filteredEmployees.map(emp => (
                <tr key={emp.id}>
                  <td>
                    <div>
                      <strong className="text-primary d-block">{emp.name}</strong>
                      <span className="text-secondary small" style={{ fontSize: '0.72rem' }}>Birthday: {emp.birthday || 'N/A'}</span>
                    </div>
                  </td>
                  <td>
                    <span className="custom-badge badge-info">{formatRole(emp.role)}</span>
                  </td>
                  <td>
                    <div className="small">{emp.email}</div>
                    <div className="text-secondary font-monospace small" style={{ fontSize: '0.75rem' }}>{emp.phone}</div>
                  </td>
                  <td className="text-secondary small">{emp.address || '-'}</td>
                  <td className="fw-semibold font-monospace">{formatCurrency(emp.salary, currencySymbol)}/mo</td>
                  <td>
                    <span className={`custom-badge ${emp.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                      {emp.status}
                    </span>
                  </td>
                  {hasPermission(['super_admin']) && (
                    <td className="text-end">
                      <button 
                        className="btn btn-sm btn-outline-danger p-1" 
                        onClick={() => handleDeleteEmployee(emp.id, emp.name)}
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

      {/* MODAL: Onboard Employee popup */}
      {showAddModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-secondary text-primary border" style={{ borderColor: 'var(--border-color)' }}>
              <div className="modal-header border-bottom" style={{ borderColor: 'var(--border-color)' }}>
                <h5 className="modal-title fw-bold">Hire Employee</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleAddEmployee}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-medium">Employee Name</label>
                    <input type="text" className="form-control bg-transparent" value={empName} onChange={(e) => setEmpName(e.target.value)} required />
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label text-secondary small fw-medium">Phone</label>
                      <input type="tel" className="form-control bg-transparent font-monospace" value={empPhone} onChange={(e) => setEmpPhone(e.target.value)} required />
                    </div>
                    <div className="col-6">
                      <label className="form-label text-secondary small fw-medium">Email Address</label>
                      <input type="email" className="form-control bg-transparent" value={empEmail} onChange={(e) => setEmpEmail(e.target.value)} required />
                    </div>
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label text-secondary small fw-medium">Assigned Role</label>
                      <select className="form-select bg-transparent" value={empRole} onChange={(e) => setEmpRole(e.target.value as UserRole)}>
                        <option value="super_admin">Super Admin</option>
                        <option value="store_manager">Store Manager</option>
                        <option value="cashier">Cashier</option>
                        <option value="inventory_staff">Inventory Staff</option>
                        <option value="accountant">Accountant</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label text-secondary small fw-medium">Monthly Base Salary ({currencySymbol})</label>
                      <input type="number" className="form-control bg-transparent font-monospace" value={empSalary} onChange={(e) => setEmpSalary(Number(e.target.value))} required />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-medium">Birthday</label>
                    <input type="date" className="form-control bg-transparent" value={empBirthday} onChange={(e) => setEmpBirthday(e.target.value)} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-medium">Home Address</label>
                    <textarea className="form-control bg-transparent" rows={2} value={empAddress} onChange={(e) => setEmpAddress(e.target.value)}></textarea>
                  </div>
                </div>
                <div className="modal-footer border-top" style={{ borderColor: 'var(--border-color)' }}>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-sm btn-accent">Log Onboard Contract</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Daily Attendance checklist popup */}
      {showAttendanceModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-secondary text-primary border" style={{ borderColor: 'var(--border-color)' }}>
              <div className="modal-header border-bottom" style={{ borderColor: 'var(--border-color)' }}>
                <h5 className="modal-title fw-bold">Roster Attendance Sheet</h5>
                <button type="button" className="btn-close" onClick={() => setShowAttendanceModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3 d-flex align-items-center justify-content-between">
                  <span className="small text-secondary fw-semibold">Attendance Log Date:</span>
                  <input 
                    type="date" 
                    className="form-control bg-transparent w-50"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                  />
                </div>
                
                <div className="table-responsive border rounded bg-tertiary" style={{ borderColor: 'var(--border-color)' }}>
                  <table className="table table-sm align-middle mb-0" style={{ color: 'var(--text-primary)' }}>
                    <thead>
                      <tr className="text-secondary small" style={{ fontSize: '0.72rem', borderBottom: '1px solid var(--border-color)' }}>
                        <th>Employee</th>
                        <th>Role</th>
                        <th className="text-end">Roster Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map(emp => (
                        <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td><strong className="small">{emp.name}</strong></td>
                          <td><span className="small text-secondary">{formatRole(emp.role)}</span></td>
                          <td className="text-end">
                            <select 
                              className="form-select form-select-sm d-inline-block bg-transparent"
                              style={{ width: '100px', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                              value={attendanceRecords[emp.id] || 'Present'}
                              onChange={(e) => setAttendanceRecords({ ...attendanceRecords, [emp.id]: e.target.value as any })}
                            >
                              <option value="Present">Present</option>
                              <option value="Absent">Absent</option>
                              <option value="Leave">On Leave</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer border-top" style={{ borderColor: 'var(--border-color)' }}>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowAttendanceModal(false)}>Close</button>
                <button type="button" className="btn btn-sm btn-accent" onClick={handleSaveAttendance}>Save Attendance Check-In</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
