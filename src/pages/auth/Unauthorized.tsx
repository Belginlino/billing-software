import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertTriangle, FiArrowLeft } from 'react-icons/fi';

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5 text-center">
      <div className="rounded-circle bg-danger-bg p-4 mb-4 text-danger border border-danger-subtle d-inline-flex">
        <FiAlertTriangle size={48} />
      </div>
      <h1 className="h3 fw-bold text-accent mb-2">Access Denied</h1>
      <p className="text-secondary mb-4 mx-auto" style={{ maxWidth: '400px' }}>
        You do not have the required role privileges to access this module. Please contact your Store Manager or Super Admin if you believe this is in error.
      </p>
      <button 
        onClick={() => navigate('/')} 
        className="btn btn-accent d-inline-flex align-items-center gap-2"
      >
        <FiArrowLeft /> Return to Dashboard
      </button>
    </div>
  );
};
