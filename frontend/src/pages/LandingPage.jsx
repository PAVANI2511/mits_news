import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowRight, FiEye, FiEyeOff, FiAward } from 'react-icons/fi';
import { loginStart, loginSuccess, loginFailure } from '../redux/authSlice';
import { changeTheme, setCustomTheme } from '../redux/themeSlice';
import { authAPI, themesAPI } from '../services/api';
import campusBg from '../assets/mits_campus.png';

const LandingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.auth);

  // View state: 'landing' or 'login'
  const [view, setView] = useState(location.pathname === '/login' ? 'login' : 'landing');

  // Form states for login
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (location.pathname === '/login') {
      setView('login');
    } else {
      setView('landing');
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
    }
    const saved = localStorage.getItem('remember_username');
    if (saved) {
      setUsernameOrEmail(saved);
      setRememberMe(true);
    }
  }, [location.state]);

  const handleSignInClick = (e) => {
    e.preventDefault();
    setView('login');
    window.history.pushState({}, '', '/login');
  };

  const handleLogoClick = (e) => {
    e.preventDefault();
    setView('landing');
    window.history.pushState({}, '', '/');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!usernameOrEmail || !password) {
      setValidationError('Please fill in all fields.');
      return;
    }

    dispatch(loginStart());
    try {
      const res = await authAPI.login({
        username: usernameOrEmail,
        password: password,
      });

      dispatch(loginSuccess(res.data));

      if (rememberMe) {
        localStorage.setItem('remember_username', usernameOrEmail);
      } else {
        localStorage.removeItem('remember_username');
      }

      const themePref = res.data.user.profile?.theme_preference || 'light';
      try {
        const themeRes = await themesAPI.getDetail(themePref);
        if (themePref.startsWith('custom_')) {
          dispatch(setCustomTheme(themeRes.data));
        } else {
          dispatch(changeTheme(themePref));
        }
      } catch (err) {
        console.error('Failed to load user theme setting:', err);
      }

      navigate('/feed');
    } catch (err) {
      const errMsg =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        'Invalid username/email or password.';
      dispatch(loginFailure(errMsg));
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gray-900 font-sans selection:bg-[#800000] selection:text-white flex flex-col justify-between">
      {/* Background Campus Photograph */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: `url(${campusBg})` }}
        initial={false}
        animate={{
          scale: view === 'landing' ? 1.01 : 1.04,
          filter: view === 'landing' ? 'brightness(0.98)' : 'brightness(0.9)',
        }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Central Soft White Radial Glow Vignette (Image 1 intro page overlay) */}
      <AnimatePresence>
        {view === 'landing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 pointer-events-none z-[1]"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.94) 0%, rgba(255, 255, 255, 0.82) 35%, rgba(255, 255, 255, 0.3) 65%, rgba(255, 255, 255, 0) 85%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Top Navbar */}
      <header className="relative z-20 max-w-7xl mx-auto w-full px-6 sm:px-12 h-24 flex items-center justify-between">
        {/* Brand Logo */}
        <button
          onClick={handleLogoClick}
          className="flex items-center gap-2.5 group focus:outline-none cursor-pointer"
        >
          <div className="bg-[#800000] text-white px-2.5 py-1 rounded-md font-bold text-sm tracking-wider shadow-sm group-hover:bg-[#660000] transition">
            MITS
          </div>
          <span className="font-serif text-2xl font-bold text-[#800000] tracking-tight">
            Newspaper
          </span>
        </button>

        {/* Right Navigation */}
        <div className="flex items-center gap-6 sm:gap-8">
          <Link
            to="/feed"
            className="font-serif text-sm sm:text-base font-medium text-[#800000] hover:underline transition"
          >
            Explore Feed
          </Link>
          {view === 'landing' ? (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSignInClick}
              className="px-6 py-2 bg-[#800000] hover:bg-[#660000] text-white rounded-full font-serif text-sm font-medium shadow transition cursor-pointer"
            >
              Login
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleLogoClick}
              className="px-6 py-2 border border-[#800000] text-[#800000] bg-white/60 hover:bg-white rounded-full font-serif text-sm font-medium shadow-sm transition cursor-pointer"
            >
              Home
            </motion.button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div className="relative z-10 max-w-7xl mx-auto w-full flex-1 flex items-center justify-center px-6 sm:px-12 py-6">
        <AnimatePresence mode="wait">
          {view === 'landing' ? (
            /* ===================================================
               INTRO / LANDING HERO VIEW (Matching Image 1)
               =================================================== */
            <motion.main
              key="landing-hero"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-3xl mx-auto text-center space-y-6 sm:space-y-8 py-4"
            >
              {/* Official Badge Icon + Text */}
              <div className="flex flex-col items-center justify-center gap-1.5">
                <FiAward className="text-xl sm:text-2xl text-[#800000]" />
                <span className="font-serif text-xs sm:text-sm font-bold text-[#800000] uppercase tracking-widest">
                  THE OFFICIAL STUDENT VOICE
                </span>
              </div>

              {/* Main Editorial Headline */}
              <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-normal tracking-tight leading-[1.12] text-gray-900">
                Madanapalle Institute of <br />
                <span className="text-[#800000] font-normal">
                  Technology & Science
                </span>{' '}
                <br />
                <span className="text-gray-900 font-normal">Newspaper Portal</span>
              </h1>

              {/* Description Subtitle */}
              <p className="max-w-2xl mx-auto font-serif text-sm sm:text-base md:text-lg text-gray-800 leading-relaxed">
                A premium full-stack social publishing portal built for MITS. Register using your{' '}
                <span className="font-bold text-[#800000]">@mits.ac.in</span> email to post articles, upload media, share campus stories, and choose custom layouts.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-2">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to="/register"
                    className="px-8 py-3.5 bg-[#800000] hover:bg-[#660000] text-white rounded-full font-serif font-semibold text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                  >
                    <span>Create Student Profile</span>
                    <FiArrowRight className="text-lg" />
                  </Link>
                </motion.div>

                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to="/feed"
                    className="px-8 py-3.5 bg-white/50 hover:bg-white/80 text-[#800000] border border-[#800000] rounded-full font-serif font-semibold text-base flex items-center justify-center shadow-sm transition-all"
                  >
                    Enter as Viewer
                  </Link>
                </motion.div>
              </div>
            </motion.main>
          ) : (
            /* ===================================================
               LOGIN VIEW (Matching Image 2)
               =================================================== */
            <motion.div
              key="login-portal"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center py-4"
            >
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
              </motion.div>

              {/* Right Floating White Login Card */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="md:col-span-6 w-full max-w-md ml-auto bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-gray-100"
              >
                <div className="mb-6">
                  <h2 className="font-serif text-4xl sm:text-5xl font-extrabold text-[#800000] tracking-wider">
                    LOGIN
                  </h2>
                </div>

                {successMessage && (
                  <div className="bg-green-50 border border-green-200 text-green-700 text-xs px-4 py-2.5 rounded-xl mb-4 font-serif">
                    {successMessage}
                  </div>
                )}

                {(validationError || error) && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2.5 rounded-xl mb-4 font-serif">
                    {validationError || error}
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-5">
                  {/* Username field */}
                  <div>
                    <label className="block text-sm font-serif font-medium text-gray-800 mb-1.5">
                      Username
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your Username"
                      value={usernameOrEmail}
                      onChange={(e) => setUsernameOrEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white font-serif text-sm transition-all"
                    />
                  </div>

                  {/* Password field */}
                  <div>
                    <label className="block text-sm font-serif font-medium text-gray-800 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
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

                  {/* Remember me checkbox */}
                  <div className="flex items-center justify-between text-sm py-1">
                    <label className="flex items-center gap-2.5 cursor-pointer text-gray-700 select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-gray-300 text-[#800000] focus:ring-[#800000] h-4 w-4 bg-gray-50 transition cursor-pointer"
                      />
                      <span className="font-serif text-sm">Remember my login</span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 bg-[#800000] hover:bg-[#660000] text-white rounded-xl font-serif font-bold text-base tracking-wider uppercase shadow-md hover:shadow-lg disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isLoading ? 'SIGNING IN...' : 'LOGIN'}
                  </motion.button>

                  {/* Forgot Password Link */}
                  <div className="text-center pt-2">
                    <span className="font-serif text-sm text-gray-600">
                      Forgot password?{' '}
                    </span>
                    <Link
                      to="/forgot-password"
                      className="font-serif text-sm font-semibold text-[#800000] hover:underline"
                    >
                      Click here
                    </Link>
                  </div>

                  {/* Register Link */}
                  <div className="text-center pt-1 border-t border-gray-100">
                    <span className="font-serif text-xs text-gray-500">
                      Don't have an account?{' '}
                    </span>
                    <Link
                      to="/register"
                      className="font-serif text-xs font-semibold text-[#800000] hover:underline"
                    >
                      Register here
                    </Link>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Spacer for balanced viewport layout */}
      <footer className="relative z-20 h-10 w-full" />
    </div>
  );
};

export default LandingPage;

