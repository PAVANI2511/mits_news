import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginStart, loginSuccess, loginFailure } from '../redux/authSlice';
import { changeTheme, setCustomTheme } from '../redux/themeSlice';
import { authAPI, themesAPI } from '../services/api';
import { FiMail, FiLock, FiArrowRight } from 'react-icons/fi';

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.auth);

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('remember_username');
    if (saved) {
      setUsernameOrEmail(saved);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!usernameOrEmail || !password) {
      setValidationError("Please fill in all fields.");
      return;
    }

    dispatch(loginStart());
    try {
      // Authenticate
      const res = await authAPI.login({
        username: usernameOrEmail, // DRF expects username/password
        password: password
      });

      dispatch(loginSuccess(res.data));

      if (rememberMe) {
        localStorage.setItem('remember_username', usernameOrEmail);
      } else {
        localStorage.removeItem('remember_username');
      }

      // Fetch user's saved theme from database
      const themePref = res.data.user.profile?.theme_preference || 'light';
      try {
        const themeRes = await themesAPI.getDetail(themePref);
        if (themePref.startsWith('custom_')) {
          dispatch(setCustomTheme(themeRes.data));
        } else {
          dispatch(changeTheme(themePref));
        }
      } catch (err) {
        console.error("Failed to load user theme setting:", err);
      }

      // Redirect
      navigate('/feed');
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || "Invalid username/email or password.";
      dispatch(loginFailure(errMsg));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-12 transition-colors duration-300">
      <div className="max-w-md w-full bg-card border border-border p-8 rounded-3xl shadow-lg space-y-6">
        <div className="text-center">
          <Link to="/" className="text-xl font-black text-primary font-mono tracking-wider">
            MITS NEWSPAPER
          </Link>
          <h2 className="mt-2 text-2xl font-extrabold text-text">Welcome back</h2>
          <p className="mt-1.5 text-xs text-gray-500">Sign in to your college student account</p>
        </div>

        {(validationError || error) && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2.5 rounded-xl">
            {validationError || error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Username or College Email
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="21691a05xx or email@mits.ac.in"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
              />
              <FiMail className="absolute left-3.5 top-3.5 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Password
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

          <div className="flex items-center justify-between text-xs my-3">
            <label className="flex items-center gap-2 cursor-pointer text-gray-500 hover:text-text select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4 bg-bg transition"
              />
              <span className="font-semibold">Remember Me</span>
            </label>
            <Link to="/forgot-password" className="font-bold text-primary hover:underline">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/95 shadow-lg shadow-primary/25 hover:shadow-primary/35 disabled:opacity-50 transition-all"
          >
            {isLoading ? 'Signing In...' : <><span className="text-sm">Sign In</span> <FiArrowRight /></>}
          </button>
        </form>

        <div className="text-center text-xs text-gray-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-primary hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
