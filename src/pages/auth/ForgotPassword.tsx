import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { FiArrowLeft } from 'react-icons/fi';

export const ForgotPassword: React.FC = () => {
  const { forgotPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      await forgotPassword(data.email);
      setSubmitted(true);
      toast.success("Password reset instructions simulated/sent!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to process password reset request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-3">
        <Link to="/login" className="text-secondary text-decoration-none small d-inline-flex align-items-center gap-1">
          <FiArrowLeft /> Back to Login
        </Link>
      </div>

      <h2 className="fs-4 fw-bold text-center mb-2">Forgot Password</h2>
      <p className="text-secondary text-center small mb-4">
        Enter your registered email address below, and we'll send instructions to reset your password.
      </p>

      {submitted ? (
        <div className="alert alert-success border-0 text-center" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
          <h6 className="fw-bold mb-1">Check Your Inbox</h6>
          <p className="small mb-0">
            A password reset email has been dispatched. Follow the links inside to assign a new password.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Email Input */}
          <div className="mb-4">
            <label className="form-label text-secondary small fw-medium">Email Address</label>
            <input
              type="email"
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
              <span className="text-danger small mt-1 d-block">{(errors.email.message as string)}</span>
            )}
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
                Processing...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>
      )}
    </div>
  );
};
