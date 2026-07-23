import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authAPI } from '../services/api';
import { FiMail, FiArrowLeft, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import campusBg from '../assets/mits_campus.png';

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
    <div className="relative min-h-screen w-full overflow-hidden bg-gray-900 font-sans selection:bg-[#800000] selection:text-white flex flex-col justify-between">
      {/* Background Campus Photograph */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: `url(${campusBg})` }}
        initial={{ scale: 1.04, filter: 'brightness(0.9)' }}
        animate={{ scale: 1.02, filter: 'brightness(0.85)' }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/35 pointer-events-none z-[1]" />

      {/* Top Navbar */}
      <header className="relative z-20 max-w-7xl mx-auto w-full px-6 sm:px-12 h-24 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group focus:outline-none cursor-pointer">
          <div className="bg-[#800000] text-white px-2.5 py-1 rounded-md font-bold text-sm tracking-wider shadow-sm group-hover:bg-[#660000] transition">
            MITS
          </div>
          <span className="font-serif text-2xl font-bold text-[#800000] tracking-tight">
            Newspaper
          </span>
        </Link>

        {/* Right Navigation */}
        <div className="flex items-center gap-6 sm:gap-8">
          <Link
            to="/feed"
            className="font-serif text-sm sm:text-base font-medium text-[#800000] hover:underline transition"
          >
            Explore Feed
          </Link>
          <Link
            to="/login"
            className="px-6 py-2 bg-[#800000] hover:bg-[#660000] text-white rounded-full font-serif text-sm font-medium shadow transition cursor-pointer"
          >
            Login
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <div className="relative z-10 max-w-7xl mx-auto w-full flex-1 flex items-center justify-center px-6 sm:px-12 py-6">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center py-4">
          {/* Left Typography Overlay: MITS NEWS */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="hidden md:flex md:col-span-6 flex-col justify-center items-start pl-4 select-none"
          >
            <h2 className="font-serif text-6xl lg:text-7xl xl:text-8xl font-bold text-white tracking-wider leading-[0.95] drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] uppercase">
              MITS NEWS
            </h2>
            <p className="mt-4 font-serif text-lg text-white/90 drop-shadow-md leading-relaxed">
              Account Recovery & Verification Portal. Retrieve access to your official student account.
            </p>
          </motion.div>

          {/* Right Floating White Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="md:col-span-6 w-full max-w-md ml-auto bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-gray-100 space-y-6"
          >
            <div>
              <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#800000] tracking-wider uppercase">
                RESET PASSWORD
              </h2>
              <p className="mt-1 font-serif text-xs text-gray-600">
                {step === 'email' && "Enter your registered @mits.ac.in email address"}
                {step === 'otp' && "Enter the 6-digit OTP sent to your mail"}
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
              <form onSubmit={handleSendOtp} className="space-y-5">
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
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white text-sm transition-all"
                    />
                    <FiMail className="absolute left-3.5 top-3.5 text-gray-400 text-base" />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-[#800000] hover:bg-[#660000] text-white rounded-xl font-bold text-base tracking-wider uppercase shadow-md hover:shadow-lg disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isLoading ? 'PROCESSING...' : 'SEND OTP CODE'}
                </motion.button>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
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
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white text-sm tracking-widest text-center font-mono font-bold transition-all"
                    />
                    <FiLock className="absolute left-3.5 top-3.5 text-gray-400 text-base" />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-[#800000] hover:bg-[#660000] text-white rounded-xl font-bold text-base tracking-wider uppercase shadow-md hover:shadow-lg disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isLoading ? 'VERIFYING...' : 'VERIFY OTP'}
                </motion.button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isLoading}
                    className="text-xs font-semibold text-[#800000] hover:underline cursor-pointer"
                  >
                    Resend Verification Code
                  </button>
                </div>
              </form>
            )}

            {step === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-5">
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
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white text-sm transition-all"
                    />
                    <FiLock className="absolute left-3.5 top-3.5 text-gray-400 text-base" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-700 focus:outline-none"
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
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white text-sm transition-all"
                    />
                    <FiLock className="absolute left-3.5 top-3.5 text-gray-400 text-base" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-700 focus:outline-none"
                    >
                      {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-[#800000] hover:bg-[#660000] text-white rounded-xl font-bold text-base tracking-wider uppercase shadow-md hover:shadow-lg disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isLoading ? 'RESETTING...' : 'SAVE NEW PASSWORD'}
                </motion.button>
              </form>
            )}

            <div className="text-center pt-2 border-t border-gray-100">
              <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#800000] hover:underline cursor-pointer">
                <FiArrowLeft /> Back to Login
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Spacer */}
      <footer className="relative z-20 h-10 w-full" />
    </div>
  );
};

export default ForgotPassword;
