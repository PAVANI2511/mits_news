import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authAPI } from '../services/api';
import { FiMail, FiLock, FiUser, FiArrowRight, FiBookOpen, FiPhone, FiEye, FiEyeOff } from 'react-icons/fi';
import campusBg from '../assets/mits_campus.png';

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    mobile_number: '',
    role_type: 'student',
    department: '',
    year: '',
    roll_number: '',
    designation: '',
    teacher_role: '',
    bio: '',
    password: '',
    confirm_password: '',
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [customBranch, setCustomBranch] = useState('');
  const [customDept, setCustomDept] = useState('');
  const [customTeacherRole, setCustomTeacherRole] = useState('');

  useEffect(() => {
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      const firstKey = errorKeys[0];
      const element = document.querySelector(`[name="${firstKey}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          element.focus();
        }, 300);
      }
    }
  }, [errors]);

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
    let { name, value } = e.target;
    if (name === 'mobile_number') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess('');

    const { username, name, email, mobile_number, role_type, department, year, roll_number, designation, teacher_role, password, confirm_password } = formData;
    
    const newErrors = {};

    // Check mandatory fields
    if (!username) newErrors.username = "Username is required.";
    if (!name) newErrors.name = "Full name is required.";
    if (!email) newErrors.email = "Email is required.";
    if (!mobile_number) newErrors.mobile_number = "Mobile number is required.";
    if (!department) newErrors.department = "Department selection is required.";
    if (!password) newErrors.password = "Password is required.";
    if (!confirm_password) newErrors.confirm_password = "Confirm password is required.";

    // If there are empty required fields, stop right away and prompt
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Username validation: alphabets, numbers, and a special character
    if (!/[a-zA-Z]/.test(username)) {
      newErrors.username = "Username must contain at least one letter.";
    } else if (!/[0-9]/.test(username)) {
      newErrors.username = "Username must contain at least one number.";
    } else if (!/[@.+-]/.test(username)) {
      newErrors.username = "Username must contain at least one allowed special character (@, ., +, -, _).";
    } else if (/[^a-zA-Z0-9@.+-]/.test(username)) {
      newErrors.username = "Username can only contain letters, numbers, and @, ., +, -, _ characters.";
    }

    // Mobile number validation
    if (!/^\d{10}$/.test(mobile_number)) {
      newErrors.mobile_number = "Mobile number must be exactly 10 digits.";
    }

    // Password validation: at least 8 characters, uppercase, lowercase, special character, and number
    if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long.";
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = "Password must contain at least one uppercase letter.";
    } else if (!/[a-z]/.test(password)) {
      newErrors.password = "Password must contain at least one lowercase letter.";
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = "Password must contain at least one number.";
    } else if (!/[^a-zA-Z0-9]/.test(password)) {
      newErrors.password = "Password must contain at least one special character.";
    }

    // Confirm password match
    if (password !== confirm_password) {
      newErrors.confirm_password = "Passwords do not match.";
    }

    // Client-side domain enforcement
    if (email && !email.toLowerCase().endsWith('@mits.ac.in')) {
      newErrors.email = "Registration is restricted to MITS. Must use @mits.ac.in email.";
    }

    let departmentValue = department;
    if (department === 'Other') {
      if (!customBranch.trim()) {
        newErrors.customBranch = "Custom course/branch is required.";
      }
      if (!customDept.trim()) {
        newErrors.customDept = "Custom department name is required.";
      }
      departmentValue = `${customBranch.trim()} - ${customDept.trim()}`;
    }

    let teacherRoleValue = teacher_role;
    if (role_type === 'student') {
      if (!year) {
        newErrors.year = "Year of study is required.";
      }
      if (!roll_number) {
        newErrors.roll_number = "Roll number is required.";
      } else {
        const cleanRoll = roll_number.trim();
        if (cleanRoll.length !== 10 || !/^[a-zA-Z0-9]+$/.test(cleanRoll)) {
          newErrors.roll_number = "Roll number must be exactly 10 alphanumeric characters.";
        } else {
          const emailPrefix = email.split('@')[0].toLowerCase().trim();
          const normalizedRoll = cleanRoll.toLowerCase();
          if (email && emailPrefix !== normalizedRoll) {
            newErrors.email = `Student email prefix must match the roll number (e.g. ${normalizedRoll}@mits.ac.in).`;
            newErrors.roll_number = `Roll number must match email prefix (e.g. ${normalizedRoll}).`;
          }
        }
      }
    } else if (role_type === 'teacher') {
      if (!designation) {
        newErrors.designation = "Designation is required.";
      }
      if (!teacher_role) {
        newErrors.teacher_role = "Teacher role selection is required.";
      } else if (teacher_role === 'Others') {
        if (!customTeacherRole.trim()) {
          newErrors.customTeacherRole = "Custom role name is required.";
        }
        teacherRoleValue = customTeacherRole.trim();
      }
    }

    // If there are errors, stop
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        username,
        name,
        email,
        mobile_number,
        role_type,
        department: departmentValue,
        bio: formData.bio,
        password,
        confirm_password,
        ...(role_type === 'student' ? { year, roll_number } : { designation, teacher_role: teacherRoleValue })
      };
      await authAPI.register(payload);
      setSuccess("Account created successfully! Redirecting to login page...");
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      if (err.response?.data && typeof err.response.data === 'object') {
        const backendErrors = {};
        Object.keys(err.response.data).forEach(key => {
          const val = err.response.data[key];
          backendErrors[key] = Array.isArray(val) ? val[0] : val;
        });
        setErrors(backendErrors);
      } else {
        setErrors({ general: err.response?.data?.detail || err.response?.data?.error || "Registration failed. Please try again." });
      }
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

      {/* Dark gradient overlay for optimal readability */}
      <div className="absolute inset-0 bg-black/35 pointer-events-none z-[1]" />

      {/* Top Navbar */}
      <header className="relative z-20 max-w-7xl mx-auto w-full px-6 sm:px-12 h-20 sm:h-24 flex items-center justify-between">
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
        <div className="flex items-center gap-4 sm:gap-6">
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

      {/* Main Content Area */}
      <div className="relative z-10 max-w-7xl mx-auto w-full flex-1 flex items-center justify-center px-4 sm:px-8 py-4">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center py-2">
          {/* Left Typography Overlay: MITS NEWS */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="hidden md:flex md:col-span-5 flex-col justify-center items-start pl-4 select-none"
          >
            <h2 className="font-serif text-5xl lg:text-6xl xl:text-7xl font-bold text-white tracking-wider leading-[0.95] drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] uppercase">
              MITS NEWS
            </h2>
            <p className="mt-4 font-serif text-base lg:text-lg text-white/90 drop-shadow-md leading-relaxed">
              Create your official student or faculty profile to share campus news, write articles, and engage with the community.
            </p>
          </motion.div>

          {/* Right Floating White Register Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="md:col-span-7 w-full max-w-2xl ml-auto bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 max-h-[82vh] overflow-y-auto"
          >
            <div className="mb-5">
              <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#800000] tracking-wider uppercase">
                CREATE PROFILE
              </h2>
              <p className="mt-1 font-serif text-xs sm:text-sm text-gray-600">
                Must register using your official <span className="font-bold text-[#800000]">@mits.ac.in</span> college email.
              </p>
            </div>

            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2.5 rounded-xl mb-4">
                {errors.general}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-xs px-4 py-2.5 rounded-xl mb-4">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Username */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Username *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="username"
                    placeholder="e.g. chinni@25"
                    value={formData.username}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl bg-gray-50 border text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white text-sm transition-all ${
                      errors.username ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'
                    }`}
                  />
                  <FiUser className="absolute left-3.5 top-3 sm:top-3.5 text-gray-400" />
                </div>
                {errors.username && (
                  <p className="mt-1 text-[11px] text-red-600 font-bold">{errors.username}</p>
                )}
              </div>

              {/* Full Name */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="name"
                    placeholder="Student / Teacher Name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl bg-gray-50 border text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white text-sm transition-all ${
                      errors.name ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'
                    }`}
                  />
                  <FiUser className="absolute left-3.5 top-3 sm:top-3.5 text-gray-400" />
                </div>
                {errors.name && (
                  <p className="mt-1 text-[11px] text-red-600 font-bold">{errors.name}</p>
                )}
              </div>

              {/* College Email */}
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
                    className={`w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl bg-gray-50 border text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white text-sm transition-all ${
                      errors.email ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'
                    }`}
                  />
                  <FiMail className="absolute left-3.5 top-3 sm:top-3.5 text-gray-400" />
                </div>
                {errors.email && (
                  <p className="mt-1 text-[11px] text-red-600 font-bold">{errors.email}</p>
                )}
              </div>

              {/* Mobile Number */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Mobile Number *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    name="mobile_number"
                    placeholder="e.g. 9876543210"
                    value={formData.mobile_number}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl bg-gray-50 border text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white text-sm transition-all ${
                      errors.mobile_number ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'
                    }`}
                  />
                  <FiPhone className="absolute left-3.5 top-3 sm:top-3.5 text-gray-400" />
                </div>
                {errors.mobile_number && (
                  <p className="mt-1 text-[11px] text-red-600 font-bold">{errors.mobile_number}</p>
                )}
              </div>

              {/* Student or Teacher Selector */}
              <div className="sm:col-span-2 border-t border-gray-100 pt-3 mt-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Select Role *
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      name="role_type"
                      value="student"
                      checked={formData.role_type === 'student'}
                      onChange={handleChange}
                      className="w-4 h-4 text-[#800000] focus:ring-[#800000] border-gray-300 accent-[#800000] cursor-pointer"
                    />
                    Student
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      name="role_type"
                      value="teacher"
                      checked={formData.role_type === 'teacher'}
                      onChange={handleChange}
                      className="w-4 h-4 text-[#800000] focus:ring-[#800000] border-gray-300 accent-[#800000] cursor-pointer"
                    />
                    Teacher
                  </label>
                </div>
              </div>

              {/* Department */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Department *
                </label>
                <div className="relative">
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl bg-gray-50 border text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white text-sm transition-all appearance-none cursor-pointer ${
                      errors.department ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'
                    }`}
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
                  <FiBookOpen className="absolute left-3.5 top-3 sm:top-3.5 text-gray-400 pointer-events-none" />
                </div>
                {errors.department && (
                  <p className="mt-1 text-[11px] text-red-600 font-bold">{errors.department}</p>
                )}
              </div>

              {/* Custom Department inputs if 'Other' selected */}
              {formData.department === 'Other' && (
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Custom Course / Branch *
                    </label>
                    <input
                      type="text"
                      name="customBranch"
                      placeholder="e.g. B.Tech"
                      value={customBranch}
                      onChange={(e) => setCustomBranch(e.target.value)}
                      className={`w-full px-4 py-2.5 sm:py-3 rounded-xl bg-gray-50 border text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white text-sm transition-all ${
                        errors.customBranch ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'
                      }`}
                    />
                    {errors.customBranch && (
                      <p className="mt-1 text-[11px] text-red-600 font-bold">{errors.customBranch}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Custom Department Name *
                    </label>
                    <input
                      type="text"
                      name="customDept"
                      placeholder="e.g. CSE"
                      value={customDept}
                      onChange={(e) => setCustomDept(e.target.value)}
                      className={`w-full px-4 py-2.5 sm:py-3 rounded-xl bg-gray-50 border text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white text-sm transition-all ${
                        errors.customDept ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'
                      }`}
                    />
                    {errors.customDept && (
                      <p className="mt-1 text-[11px] text-red-600 font-bold">{errors.customDept}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Student Fields */}
              {formData.role_type === 'student' && (
                <>
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Year of Study *
                    </label>
                    <div className="relative">
                      <select
                        name="year"
                        value={formData.year}
                        onChange={handleChange}
                        className={`w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl bg-gray-50 border text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white text-sm transition-all appearance-none cursor-pointer ${
                          errors.year ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'
                        }`}
                      >
                        <option value="">Select Year</option>
                        {years.map(yr => (
                          <option key={yr} value={yr}>{yr}</option>
                        ))}
                      </select>
                      <FiUser className="absolute left-3.5 top-3 sm:top-3.5 text-gray-400 pointer-events-none" />
                    </div>
                    {errors.year && (
                      <p className="mt-1 text-[11px] text-red-600 font-bold">{errors.year}</p>
                    )}
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Roll Number *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="roll_number"
                        placeholder="e.g. 21691A0501"
                        value={formData.roll_number}
                        onChange={handleChange}
                        className={`w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl bg-gray-50 border text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white text-sm transition-all ${
                          errors.roll_number ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'
                        }`}
                      />
                      <FiUser className="absolute left-3.5 top-3 sm:top-3.5 text-gray-400" />
                    </div>
                    {errors.roll_number && (
                      <p className="mt-1 text-[11px] text-red-600 font-bold">{errors.roll_number}</p>
                    )}
                  </div>
                </>
              )}

              {/* Teacher Fields */}
              {formData.role_type === 'teacher' && (
                <>
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Designation *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="designation"
                        placeholder="e.g. Associate Professor"
                        value={formData.designation}
                        onChange={handleChange}
                        className={`w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl bg-gray-50 border text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white text-sm transition-all ${
                          errors.designation ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'
                        }`}
                      />
                      <FiUser className="absolute left-3.5 top-3 sm:top-3.5 text-gray-400" />
                    </div>
                    {errors.designation && (
                      <p className="mt-1 text-[11px] text-red-600 font-bold">{errors.designation}</p>
                    )}
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Role in Department *
                    </label>
                    <div className="relative">
                      <select
                        name="teacher_role"
                        value={formData.teacher_role}
                        onChange={handleChange}
                        className={`w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl bg-gray-50 border text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white text-sm transition-all appearance-none cursor-pointer ${
                          errors.teacher_role ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'
                        }`}
                      >
                        <option value="">Select Role</option>
                        <option value="HOD">HOD</option>
                        <option value="Teacher">Teacher</option>
                        <option value="AO">AO</option>
                        <option value="Attender">Attender</option>
                        <option value="Others">Others</option>
                      </select>
                      <FiUser className="absolute left-3.5 top-3 sm:top-3.5 text-gray-400 pointer-events-none" />
                    </div>
                    {errors.teacher_role && (
                      <p className="mt-1 text-[11px] text-red-600 font-bold">{errors.teacher_role}</p>
                    )}
                  </div>

                  {formData.teacher_role === 'Others' && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Specify Custom Role Name *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="customTeacherRole"
                          placeholder="e.g. Lab Assistant"
                          value={customTeacherRole}
                          onChange={(e) => setCustomTeacherRole(e.target.value)}
                          className={`w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl bg-gray-50 border text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white text-sm transition-all ${
                            errors.customTeacherRole ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'
                          }`}
                        />
                        <FiUser className="absolute left-3.5 top-3 sm:top-3.5 text-gray-400" />
                      </div>
                      {errors.customTeacherRole && (
                        <p className="mt-1 text-[11px] text-red-600 font-bold">{errors.customTeacherRole}</p>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Short Bio */}
              <div className="sm:col-span-2 border-t border-gray-100 pt-3 mt-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Short Bio
                </label>
                <textarea
                  name="bio"
                  rows="2"
                  placeholder="Tell us about yourself..."
                  value={formData.bio}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white text-sm transition-all"
                />
              </div>

              {/* Password */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-10 py-2.5 sm:py-3 rounded-xl bg-gray-50 border text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white text-sm transition-all ${
                      errors.password ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'
                    }`}
                  />
                  <FiLock className="absolute left-3.5 top-3 sm:top-3.5 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 sm:top-3.5 text-gray-400 hover:text-gray-700 focus:outline-none"
                  >
                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-[11px] text-red-600 font-bold">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirm_password"
                    placeholder="••••••••"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-10 py-2.5 sm:py-3 rounded-xl bg-gray-50 border text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white text-sm transition-all ${
                      errors.confirm_password ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'
                    }`}
                  />
                  <FiLock className="absolute left-3.5 top-3 sm:top-3.5 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3 sm:top-3.5 text-gray-400 hover:text-gray-700 focus:outline-none"
                  >
                    {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
                {errors.confirm_password && (
                  <p className="mt-1 text-[11px] text-red-600 font-bold">{errors.confirm_password}</p>
                )}
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={isLoading}
                className="sm:col-span-2 mt-2 w-full py-3.5 bg-[#800000] hover:bg-[#660000] text-white rounded-xl font-bold text-base tracking-wider uppercase shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  'CREATING ACCOUNT...'
                ) : (
                  <>
                    <span>CREATE PROFILE</span>
                    <FiArrowRight className="text-lg" />
                  </>
                )}
              </motion.button>

              {/* Sign In Link */}
              <div className="text-center pt-3 border-t border-gray-100 sm:col-span-2">
                <span className="text-xs text-gray-500">
                  Already have an account?{' '}
                </span>
                <Link
                  to="/login"
                  className="text-xs font-semibold text-[#800000] hover:underline cursor-pointer"
                >
                  Login here
                </Link>
              </div>
            </form>
          </motion.div>
        </div>
      </div>

      {/* Bottom Spacer */}
      <footer className="relative z-20 h-6 w-full" />
    </div>
  );
};

export default Register;
