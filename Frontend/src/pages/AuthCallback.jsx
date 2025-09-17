// Auth Callback Page - src/pages/AuthCallback.jsx
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithGitHub } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        toast.error('GitHub authentication was cancelled');
        navigate('/login');
        return;
      }

      if (!code) {
        toast.error('No authorization code received');
        navigate('/login');
        return;
      }

      const result = await loginWithGitHub(code);
      if (result.success) {
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, loginWithGitHub, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <h2 className="mt-4 text-xl font-semibold text-gray-900">
          Connecting your GitHub account...
        </h2>
        <p className="mt-2 text-gray-600">
          Please wait while we set up your account.
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;