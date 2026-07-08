import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginStart, loginSuccess, loginFailure } from '../redux/authSlice';
import { authAPI } from '../services/api';
import { FiShield, FiLock, FiArrowRight, FiEye, FiEyeOff } from 'react-icons/fi';

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
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f19] px-4 py-12">
      <div className="max-w-md w-full bg-[#111827] border border-gray-800 p-8 rounded-3xl shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="p-3 bg-red-500/10 rounded-full text-red-500 w-fit mx-auto border border-red-500/20">
            <FiShield className="text-3xl" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Admin Portal</h2>
          <p className="text-xs text-gray-400">Log in to moderate MITS Newspaper</p>
        </div>

        {(validationError || error) && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-2.5 rounded-xl">
            {validationError || error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-white">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Admin Username
            </label>
            <input
              type="text"
              placeholder="admin_id"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[#0b0f19] border border-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Security Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-4 pr-10 py-3 rounded-2xl bg-[#0b0f19] border border-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-gray-500 hover:text-white focus:outline-none"
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-600/25 hover:shadow-red-500/35 disabled:opacity-50 transition-all"
          >
            {isLoading ? 'Accessing System...' : <><span className="text-sm">Authenticate</span> <FiArrowRight /></>}
          </button>
        </form>

        <div className="text-center pt-2">
          <Link to="/" className="text-xs text-gray-400 hover:underline">
            Go back to Student Portal
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
