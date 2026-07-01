import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { FiMail, FiArrowLeft, FiLock } from 'react-icons/fi';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendLink = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Email is required.");
      return;
    }
    setError('');
    setMessage('');
    setIsLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setMessage("A password recovery request has been processed. You can now define your new password directly below.");
      setIsResetMode(true);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to process recovery request.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Email and Password are required.");
      return;
    }
    setError('');
    setMessage('');
    setIsLoading(true);
    try {
      await authAPI.resetPassword(email, password);
      setMessage("Password has been reset successfully! You can now log in.");
      setIsResetMode(false);
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-12 transition-colors duration-300">
      <div className="max-w-md w-full bg-card border border-border p-8 rounded-3xl shadow-lg space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-text">Reset Password</h2>
          <p className="mt-1.5 text-xs text-gray-500">Recover your MITS student portal password</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2.5 rounded-xl">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-xs px-4 py-2.5 rounded-xl">
            {message}
          </div>
        )}

        {!isResetMode ? (
          <form onSubmit={handleSendLink} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                College Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="yourname@mits.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
                />
                <FiMail className="absolute left-3.5 top-3.5 text-gray-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold flex items-center justify-center hover:bg-primary/95 disabled:opacity-50 transition-all"
            >
              {isLoading ? 'Processing...' : 'Request Password Reset'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Confirm Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-bg/50 border border-border text-gray-400 text-sm focus:outline-none"
                />
                <FiMail className="absolute left-3.5 top-3.5 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
                />
                <FiLock className="absolute left-3.5 top-3.5 text-gray-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold flex items-center justify-center hover:bg-primary/95 disabled:opacity-50 transition-all"
            >
              {isLoading ? 'Resetting...' : 'Save New Password'}
            </button>
          </form>
        )}

        <div className="text-center pt-2">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
            <FiArrowLeft /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
