import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { loginStart, loginSuccess, loginFailure } from '../redux/authSlice';
import { authAPI } from '../services/api';
import { FiShield, FiLock, FiArrowRight, FiEye, FiEyeOff } from 'react-icons/fi';
import campusBg from '../assets/mits_campus.png';

const AdminLogin = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.auth);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!username || !password) {
      setValidationError("Please fill in all fields.");
      return;
    }

    dispatch(loginStart());
    try {
      const res = await authAPI.login({ username, password });
      
      // Enforce staff/admin check on response
      if (!res.data.user.is_staff && !res.data.user.is_superuser) {
        dispatch(loginFailure("Access denied. Your account does not have administrator privileges."));
        return;
      }

      dispatch(loginSuccess(res.data));
      navigate('/admin/dashboard');
    } catch (err) {
      const errMsg = err.response?.data?.detail || "Invalid admin username or password.";
      dispatch(loginFailure(errMsg));
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

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none z-[1]" />

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
            className="px-6 py-2 border border-[#800000] text-[#800000] bg-white hover:bg-[#800000] hover:text-white rounded-full font-serif text-sm font-medium shadow-sm transition cursor-pointer"
          >
            Student Login
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
              ADMIN PORTAL
            </h2>
            <p className="mt-4 font-serif text-lg text-white/90 drop-shadow-md leading-relaxed">
              MITS Newspaper Moderation Console. Verify articles, manage users, and post official campus announcements.
            </p>
          </motion.div>

          {/* Right Floating White Login Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="md:col-span-6 w-full max-w-md ml-auto bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-gray-100 space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#800000]/10 rounded-2xl text-[#800000]">
                <FiShield className="text-2xl" />
              </div>
              <div>
                <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#800000] tracking-wider uppercase">
                  ADMIN LOGIN
                </h2>
                <p className="font-serif text-xs text-gray-500">Authorized personnel authentication</p>
              </div>
            </div>

            {(validationError || error) && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2.5 rounded-xl font-serif">
                {validationError || error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-serif font-medium text-gray-800 mb-1.5">
                  Admin Username
                </label>
                <input
                  type="text"
                  placeholder="Enter Admin Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white font-serif text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-serif font-medium text-gray-800 mb-1.5">
                  Security Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter Admin Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white font-serif text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-700 focus:outline-none"
                  >
                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-[#800000] hover:bg-[#660000] text-white rounded-xl font-serif font-bold text-base tracking-wider uppercase shadow-md hover:shadow-lg disabled:opacity-50 transition-all cursor-pointer"
              >
                {isLoading ? 'AUTHENTICATING...' : 'AUTHENTICATE ADMIN'}
              </motion.button>

              <div className="text-center pt-2 border-t border-gray-100">
                <Link to="/" className="font-serif text-xs font-semibold text-[#800000] hover:underline">
                  Go back to Student Portal
                </Link>
              </div>
            </form>
          </motion.div>
        </div>
      </div>

      {/* Bottom Spacer */}
      <footer className="relative z-20 h-10 w-full" />
    </div>
  );
};

export default AdminLogin;
