import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { FiMail, FiLock, FiUser, FiArrowRight, FiBookOpen } from 'react-icons/fi';

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    department: '',
    year: '',
    bio: '',
    password: '',
    confirm_password: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [customBranch, setCustomBranch] = useState('');
  const [customDept, setCustomDept] = useState('');

  const departmentGroups = {
    'B.Tech Programs': [
      'B.Tech - Computer Science & Engineering (CSE)',
      'B.Tech - Computer Science & Technology (CST)',
      'B.Tech - Cyber Security (CS)',
      'B.Tech - Electronics & Communication Engineering (ECE)',
      'B.Tech - Electrical & Electronics Engineering (EEE)',
      'B.Tech - Mechanical Engineering (ME)',
      'B.Tech - Civil Engineering (CE)',
      'B.Tech - Artificial Intelligence (AI)',
      'B.Tech - Artificial Intelligence & Machine Learning (AI&ML)',
      'B.Tech - Computer Networks (CN)',
      'B.Tech - Data Science (DS)'
    ],
    'M.Tech Programs': [
      'M.Tech - Computer Science & Engineering (CSE)',
      'M.Tech - VLSI Design',
      'M.Tech - Electrical Power Systems (EPS)',
      'M.Tech - Machine Design',
      'M.Tech - Structural Engineering'
    ],
    'MBA': [
      'Master of Business Administration (MBA)'
    ],
    'MCA': [
      'Master of Computer Applications (MCA)'
    ],
    'Bio Informatics': [
      'Bio Informatics'
    ],
    'Other': [
      'Other'
    ]
  };

  const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Field check
    const { username, name, email, department, year, password, confirm_password } = formData;
    if (!username || !name || !email || !department || !year || !password || !confirm_password) {
      setError("Please fill in all required fields (*).");
      return;
    }

    if (password !== confirm_password) {
      setError("Passwords do not match.");
      return;
    }

    // Client-side domain enforcement
    if (!email.toLowerCase().endsWith('@mits.ac.in')) {
      setError("Registration is restricted to college students. You must use an @mits.ac.in email address.");
      return;
    }

    let departmentValue = formData.department;
    if (departmentValue === 'Other') {
      if (!customBranch.trim() || !customDept.trim()) {
        setError("Please enter your custom course/branch and department.");
        return;
      }
      departmentValue = `${customBranch.trim()} - ${customDept.trim()}`;
    }

    setIsLoading(true);
    try {
      await authAPI.register({
        ...formData,
        department: departmentValue
      });
      setSuccess("Account created successfully! Redirecting to login page...");
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      const errMsg = err.response?.data?.email?.[0] || 
                     err.response?.data?.username?.[0] || 
                     err.response?.data?.detail || 
                     "Registration failed. Please check your credentials and try again.";
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-12 transition-colors duration-300">
      <div className="max-w-xl w-full bg-card border border-border p-8 rounded-3xl shadow-lg space-y-6">
        <div className="text-center">
          <Link to="/" className="text-xl font-black text-primary font-mono tracking-wider">
            MITS NEWSPAPER
          </Link>
          <h2 className="mt-2 text-2xl font-extrabold text-text">Create Student Account</h2>
          <p className="mt-1.5 text-xs text-gray-500">Must register using your official @mits.ac.in college email</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2.5 rounded-xl">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-xs px-4 py-2.5 rounded-xl">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-1">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Username *
            </label>
            <div className="relative">
              <input
                type="text"
                name="username"
                placeholder="21691a05xx"
                value={formData.username}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
              />
              <FiUser className="absolute left-3.5 top-3.5 text-gray-400" />
            </div>
          </div>

          <div className="sm:col-span-1">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <div className="relative">
              <input
                type="text"
                name="name"
                placeholder="Student Name"
                value={formData.name}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
              />
              <FiUser className="absolute left-3.5 top-3.5 text-gray-400" />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              College Email (@mits.ac.in) *
            </label>
            <div className="relative">
              <input
                type="email"
                name="email"
                placeholder="yourname@mits.ac.in"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
              />
              <FiMail className="absolute left-3.5 top-3.5 text-gray-400" />
            </div>
          </div>

          <div className="sm:col-span-1">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Department *
            </label>
            <div className="relative">
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm appearance-none transition-all"
              >
                <option value="">Select Department</option>
                {Object.keys(departmentGroups).map(groupName => (
                  <optgroup key={groupName} label={groupName}>
                    {departmentGroups[groupName].map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <FiBookOpen className="absolute left-3.5 top-3.5 text-gray-400" />
            </div>
          </div>

          {formData.department === 'Other' && (
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Custom Course / Branch *
                </label>
                <input
                  type="text"
                  placeholder="e.g. B.Tech"
                  value={customBranch}
                  onChange={(e) => setCustomBranch(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Custom Department Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. CSE"
                  value={customDept}
                  onChange={(e) => setCustomDept(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
                />
              </div>
            </div>
          )}

          <div className="sm:col-span-1">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Year of Study *
            </label>
            <div className="relative">
              <select
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm appearance-none transition-all"
              >
                <option value="">Select Year</option>
                {years.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
              <FiUser className="absolute left-3.5 top-3.5 text-gray-400" />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Short Bio
            </label>
            <textarea
              name="bio"
              rows="2"
              placeholder="Tell us about yourself..."
              value={formData.bio}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-2xl bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
            />
          </div>

          <div className="sm:col-span-1">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Password *
            </label>
            <div className="relative">
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
              />
              <FiLock className="absolute left-3.5 top-3.5 text-gray-400" />
            </div>
          </div>

          <div className="sm:col-span-1">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Confirm Password *
            </label>
            <div className="relative">
              <input
                type="password"
                name="confirm_password"
                placeholder="••••••••"
                value={formData.confirm_password}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
              />
              <FiLock className="absolute left-3.5 top-3.5 text-gray-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="sm:col-span-2 mt-2 w-full py-3.5 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/95 shadow-lg shadow-primary/25 hover:shadow-primary/35 disabled:opacity-50 transition-all"
          >
            {isLoading ? 'Creating Account...' : <><span className="text-sm">Create Account</span> <FiArrowRight /></>}
          </button>
        </form>

        <div className="text-center text-xs text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-primary hover:underline">
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
