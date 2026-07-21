import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { FiMail, FiArrowLeft, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Steps: 'email', 'otp', 'reset'
  const [step, setStep] = useState('email');
  
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email) {
      setError("Email is required.");
      return;
    }
    setError('');
    setMessage('');
    setIsLoading(true);
    try {
      const response = await authAPI.forgotPassword(email);
      setMessage(response.data?.message || "A verification OTP has been sent to your registered email address.");
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || "Failed to process recovery request.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      setError("Verification code (OTP) is required.");
      return;
    }
    setError('');
    setMessage('');
    setIsLoading(true);
    try {
      await authAPI.verifyOtp(email, otp);
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || "Invalid or expired verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError("New Password and Confirm Password are required.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError('');
    setMessage('');
    setIsLoading(true);
    try {
      await authAPI.resetPassword(email, otp, password);
      navigate('/login', { 
        state: { message: "Your password has been reset successfully. Please log in." } 
      });
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || "Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-12 transition-colors duration-300">
      <div className="max-w-md w-full bg-card border border-border p-8 rounded-3xl shadow-lg space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-text">Reset Password</h2>
          <p className="mt-1.5 text-xs text-gray-500">
            {step === 'email' && "Enter your registered college email"}
            {step === 'otp' && "Verify the 6-digit OTP sent to your mail"}
            {step === 'reset' && "Set your new account password"}
          </p>
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

        {step === 'email' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Registered Email Address
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
              {isLoading ? 'Processing...' : 'Send Verification OTP'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Verification Code (6-Digit OTP)
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm tracking-widest text-center font-mono font-bold transition-all"
                />
                <FiLock className="absolute left-3.5 top-3.5 text-gray-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold flex items-center justify-center hover:bg-primary/95 disabled:opacity-50 transition-all"
            >
              {isLoading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isLoading}
                className="text-xs font-bold text-primary hover:underline"
              >
                Resend OTP Verification Code
              </button>
            </div>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-2xl bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
                />
                <FiLock className="absolute left-3.5 top-3.5 text-gray-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-gray-400 hover:text-text focus:outline-none"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-2xl bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
                />
                <FiLock className="absolute left-3.5 top-3.5 text-gray-400" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-3.5 text-gray-400 hover:text-text focus:outline-none"
                >
                  {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
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
