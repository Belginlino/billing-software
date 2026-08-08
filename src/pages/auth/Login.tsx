import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { FcGoogle } from 'react-icons/fc';

export const Login: React.FC = () => {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      toast.success("Successfully logged in with Google!");
      navigate('/');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Google login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

      <form onSubmit={handleSubmit(onSubmit)} role="form" aria-labelledby="login-heading">
        {/* Email Input */}
        <div className="mb-3">
          <label htmlFor="email" className="form-label text-secondary small fw-medium">Email Address</label>
          <input
            id="email"
            name="email"
            type="email"
            aria-invalid={errors.email ? 'true' : 'false'}
            aria-describedby={errors.email ? 'email-error' : undefined}
            autoComplete="email"
            className={`form-control border bg-transparent ${errors.email ? 'border-danger' : ''}`}
            placeholder="name@linoclothing.com"
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
            <span id="email-error" className="text-danger small mt-1 d-block">{(errors.email.message as string)}</span>
          )}
        </div>

        {/* Password Input */}
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <label htmlFor="password" className="form-label text-secondary small fw-medium mb-0">Password</label>
            <Link to="/forgot-password" style={{ fontSize: '0.8rem' }} className="text-accent text-decoration-none">
              Forgot?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            aria-invalid={errors.password ? 'true' : 'false'}
            aria-describedby={errors.password ? 'password-error' : undefined}
            autoComplete="current-password"
            className={`form-control border bg-transparent ${errors.password ? 'border-danger' : ''}`}
            placeholder="Enter your password"
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
            <span id="password-error" className="text-danger small mt-1 d-block">{(errors.password.message as string)}</span>
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
          aria-label="Sign in to your account"
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Or Google Login */}
      <div className="d-flex align-items-center my-3 text-secondary">
        <hr className="flex-grow-1 border-secondary-subtle" />
        <span className="px-2 small text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Or continue with</span>
        <hr className="flex-grow-1 border-secondary-subtle" />
      </div>

      <button
        type="button"
        className="btn btn-outline-secondary w-100 py-2 d-flex justify-content-center align-items-center gap-2 border bg-transparent"
        style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
        onClick={handleGoogleLogin}
        disabled={loading}
      >
        <FcGoogle size={20} />
        Sign In with Google
      </button>
    </div>
  );
};
