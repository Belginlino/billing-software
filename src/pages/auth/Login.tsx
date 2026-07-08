import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      toast.success("Successfully logged in!");
      navigate('/');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="fs-4 fw-bold text-center mb-3">Welcome Back</h2>
      <p className="text-secondary text-center small mb-4">
        Log in to access inventory, billing terminal, and reports.
      </p>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Email Input */}
        <div className="mb-3">
          <label className="form-label text-secondary small fw-medium">Email Address</label>
          <input
            type="email"
            className={`form-control border bg-transparent ${errors.email ? 'border-danger' : ''}`}
            placeholder="name@voguemenswear.com"
            style={{ color: 'var(--text-primary)' }}
            {...register('email', { 
              required: 'Email address is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address'
              }
            })}
          />
          {errors.email && (
            <span className="text-danger small mt-1 d-block">{(errors.email.message as string)}</span>
          )}
        </div>

        {/* Password Input */}
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <label className="form-label text-secondary small fw-medium mb-0">Password</label>
            <Link to="/forgot-password" style={{ fontSize: '0.8rem' }} className="text-accent text-decoration-none">
              Forgot?
            </Link>
          </div>
          <input
            type="password"
            className={`form-control border bg-transparent ${errors.password ? 'border-danger' : ''}`}
            placeholder="••••••••"
            style={{ color: 'var(--text-primary)' }}
            {...register('password', { 
              required: 'Password is required',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters'
              }
            })}
          />
          {errors.password && (
            <span className="text-danger small mt-1 d-block">{(errors.password.message as string)}</span>
          )}
        </div>

        {/* Remember Me */}
        <div className="mb-4 form-check d-flex align-items-center gap-2">
          <input type="checkbox" className="form-check-input" id="rememberMe" />
          <label className="form-check-label text-secondary small" htmlFor="rememberMe">Remember my device</label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn btn-accent w-100 py-2 d-flex justify-content-center align-items-center gap-2"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              Authenticating...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Helper credentials box */}
      <div className="mt-4 p-3 rounded bg-tertiary border" style={{ borderColor: 'var(--border-color)', fontSize: '0.8rem' }}>
        <span className="fw-semibold text-accent d-block mb-1">Demo Accounts (Pass: [Role]123):</span>
        <ul className="list-unstyled mb-0 text-secondary">
          <li><strong>Admin:</strong> admin@voguemenswear.com / Admin123</li>
          <li><strong>Manager:</strong> manager@voguemenswear.com / Manager123</li>
          <li><strong>Cashier:</strong> cashier@voguemenswear.com / Cashier123</li>
          <li><strong>Inventory:</strong> inventory@voguemenswear.com / Inventory123</li>
          <li><strong>Accountant:</strong> accountant@voguemenswear.com / Accountant123</li>
        </ul>
      </div>
    </div>
  );
};
