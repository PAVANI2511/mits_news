import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Sidebar from '../components/Sidebar';
import { authAPI, themesAPI } from '../services/api';
import { updateProfile, setThemePreference, logout } from '../redux/authSlice';
import { changeTheme, setCustomTheme } from '../redux/themeSlice';
import { FiUser, FiCheck, FiPlus, FiGrid, FiPhone } from 'react-icons/fi';

const avatarPresets = [
  { name: 'Default Silhouette', url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23a0aec0"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>' },
  { name: 'Student Blue', url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%233b82f6"/><circle cx="50" cy="35" r="20" fill="%23ffdbb5"/><path d="M20 85c0-15 15-25 30-25s30 10 30 25z" fill="%231e3a8a"/><circle cx="43" cy="35" r="6" fill="none" stroke="%23111827" stroke-width="2"/><circle cx="57" cy="35" r="6" fill="none" stroke="%23111827" stroke-width="2"/><line x1="49" y1="35" x2="51" y2="35" stroke="%23111827" stroke-width="2"/></svg>' },
  { name: 'Student Purple', url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%238b5cf6"/><circle cx="50" cy="35" r="20" fill="%23ffd3b6"/><path d="M20 85c0-12 10-20 30-20s30 8 30 20z" fill="%234c1d95"/><path d="M30 35c0-10 10-18 20-18s20 8 20 18H30z" fill="%23fbbf24"/></svg>' },
  { name: 'Graduate Green', url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2310b981"/><circle cx="50" cy="40" r="18" fill="%23ffdbb5"/><path d="M25 85c0-12 10-20 25-20s25 8 25 20z" fill="%23064e3b"/><path d="M50 15 L75 25 L50 35 L25 25 Z" fill="%23111827"/><rect x="47" y="25" width="6" height="10" fill="%23111827"/><circle cx="50" cy="35" r="3" fill="%23fbbf24"/></svg>' },
  { name: 'Developer Orange', url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f97316"/><circle cx="50" cy="38" r="18" fill="%23ffd3b6"/><path d="M25 85c0-12 10-20 25-20s25 8 25 20z" fill="%237c2d12"/><path d="M30 38c0-5 2-8 2-8" stroke="%23111827" stroke-width="4" fill="none"/><path d="M68 38c0-5-2-8-2-8" stroke="%23111827" stroke-width="4" fill="none"/><rect x="26" y="32" width="6" height="12" rx="3" fill="%23111827"/><rect x="68" y="32" width="6" height="12" rx="3" fill="%23111827"/><path d="M30 32 A20 20 0 0 1 70 32" fill="none" stroke="%23111827" stroke-width="3"/></svg>' }
];

const Settings = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { currentTheme, presets } = useSelector((state) => state.theme);
  const isAdmin = user?.is_staff || user?.is_superuser;

  const [name, setName] = useState(user?.profile?.name || '');
  const [bio, setBio] = useState(user?.profile?.bio || '');
  const [roleType, setRoleType] = useState(user?.profile?.role_type || 'student');
  const [department, setDepartment] = useState(user?.profile?.department || '');
  const [year, setYear] = useState(user?.profile?.year || '');
  const [rollNumber, setRollNumber] = useState(user?.profile?.roll_number || '');
  const [designation, setDesignation] = useState(user?.profile?.designation || '');
  const isPresetRole = ['HOD', 'Teacher', 'AO', 'Attender'].includes(user?.profile?.teacher_role);
  const [teacherRole, setTeacherRole] = useState(user?.profile?.teacher_role ? (isPresetRole ? user.profile.teacher_role : 'Others') : '');
  const [customTeacherRole, setCustomTeacherRole] = useState(user?.profile?.teacher_role ? (isPresetRole ? '' : user.profile.teacher_role) : '');
  const [mobileNumber, setMobileNumber] = useState(user?.profile?.mobile_number || '');
  const [followedNotificationsEnabled, setFollowedNotificationsEnabled] = useState(user?.profile?.followed_notifications_enabled ?? true);
  const [inAppNotificationsEnabled, setInAppNotificationsEnabled] = useState(user?.profile?.in_app_notifications_enabled ?? true);
  
  const [profilePic, setProfilePic] = useState(null);
  const [coverPhoto, setCoverPhoto] = useState(null);

  // Custom theme editor colors
  const [customColors, setCustomColors] = useState({
    name: 'My Custom Theme',
    primary_color: '#3b82f6',
    secondary_color: '#1d4ed8',
    bg_color: '#f9fafb',
    text_color: '#111827',
    card_bg: '#ffffff',
    border_color: '#e5e7eb',
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSettingsTab, setActiveSettingsTab] = useState('profile'); // profile, theme

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'theme') {
      setActiveSettingsTab('theme');
    } else {
      setActiveSettingsTab('profile');
    }
  }, [searchParams]);

  const handleTabChange = (tabName) => {
    setSearchParams({ tab: tabName });
  };
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [customBranch, setCustomBranch] = useState('');
  const [customDept, setCustomDept] = useState('');
  const [selectedPresetAvatar, setSelectedPresetAvatar] = useState('');
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(user?.profile?.email_notifications_enabled ?? true);

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

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!mobileNumber) {
      setError("Mobile number is required.");
      setLoading(false);
      return;
    }
    if (!/^\d{10}$/.test(mobileNumber)) {
      setError("Mobile number must be exactly 10 digits.");
      setLoading(false);
      return;
    }

    let departmentValue = department;
    if (departmentValue === 'Other') {
      if (!customBranch.trim() || !customDept.trim()) {
        setError("Please enter your custom course/branch and department.");
        setLoading(false);
        return;
      }
      departmentValue = `${customBranch.trim()} - ${customDept.trim()}`;
    }

    let teacherRoleValue = teacherRole;
    if (roleType === 'teacher' && teacherRoleValue === 'Others') {
      if (!customTeacherRole.trim()) {
        setError("Please specify your custom role name.");
        setLoading(false);
        return;
      }
      teacherRoleValue = customTeacherRole.trim();
    }

    try {
      const submitData = new FormData();
      submitData.append('name', name);
      submitData.append('bio', bio);
      submitData.append('role_type', roleType);
      submitData.append('department', departmentValue);
      submitData.append('year', roleType === 'student' ? year : '');
      submitData.append('roll_number', roleType === 'student' ? rollNumber : '');
      submitData.append('designation', roleType === 'teacher' ? designation : '');
      submitData.append('teacher_role', roleType === 'teacher' ? teacherRoleValue : '');
      submitData.append('mobile_number', mobileNumber);

      submitData.append('followed_notifications_enabled', followedNotificationsEnabled);
      submitData.append('in_app_notifications_enabled', inAppNotificationsEnabled);
      submitData.append('email_notifications_enabled', emailNotificationsEnabled);

      if (profilePic) {
        submitData.append('profile_pic', profilePic);
      } else if (selectedPresetAvatar) {
        const svgContent = decodeURIComponent(selectedPresetAvatar.split(',')[1]);
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const file = new File([blob], 'avatar.svg', { type: 'image/svg+xml' });
        submitData.append('profile_pic', file);
      }
      if (coverPhoto) submitData.append('cover_photo', coverPhoto);

      const res = await authAPI.updateProfile(submitData);
      dispatch(updateProfile(res.data));
      setSuccess("Profile updated successfully!");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update profile settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm("All the content you shared will be deleted (including your posts, articles, comments, and replies). Do you really want to permanently delete your account?");
    if (!confirmDelete) return;

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await authAPI.deleteAccount();
      setSuccess("Your account and all associated content have been permanently deleted. Redirecting...");
      setTimeout(() => {
        dispatch(logout());
        navigate('/');
      }, 2500);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || "Failed to delete account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleThemeSelect = async (themeName) => {
    setError('');
    setSuccess('');
    try {
      dispatch(changeTheme(themeName));
      dispatch(setThemePreference(themeName));
      await themesAPI.savePreference(themeName);
      setSuccess(`Applied ${themeName} theme preference!`);
    } catch (_err) {
      setError("Failed to save theme selection.");
    }
  };

  const handleCustomThemeSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await themesAPI.createCustom(customColors);
      const appliedTheme = res.data.theme;
      dispatch(setCustomTheme({
        primary: appliedTheme.primary_color,
        secondary: appliedTheme.secondary_color,
        bg: appliedTheme.bg_color,
        text: appliedTheme.text_color,
        card: appliedTheme.card_bg,
        border: appliedTheme.border_color,
      }));
      dispatch(setThemePreference(`custom_${appliedTheme.id}`));
      setSuccess("Custom theme saved and applied successfully!");
    } catch (_err) {
      setError("Failed to save custom theme settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout sidebar={<Sidebar />}>
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm transition-colors duration-300">
        <div className="flex border-b border-border">
          <button
            onClick={() => handleTabChange('profile')}
            className={`flex-1 py-4 text-center text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeSettingsTab === 'profile' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-text'
            }`}
          >
            <FiUser /> Edit Profile
          </button>
          <button
            onClick={() => handleTabChange('theme')}
            className={`flex-1 py-4 text-center text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeSettingsTab === 'theme' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-text'
            }`}
          >
            <FiGrid /> Layout Theme
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2.5 rounded-xl mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-xs px-4 py-2.5 rounded-xl mb-4">
              {success}
            </div>
          )}

          {/* Profile form */}
          {activeSettingsTab === 'profile' && (
            <>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={isAdmin ? "sm:col-span-2" : "sm:col-span-1"}>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-bg border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className={isAdmin ? "sm:col-span-2" : "sm:col-span-1"}>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Mobile Number *
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <FiPhone className="absolute left-3.5 top-3.5 text-gray-400" />
                  </div>
                </div>

                {!isAdmin && (
                  <>
                    <div className="sm:col-span-2 border-t border-border pt-4 mt-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Profile Role
                      </label>
                      <div className="flex gap-6">
                        <label className="flex items-center gap-2 text-sm font-semibold text-text cursor-pointer">
                          <input
                            type="radio"
                            name="role_type"
                            value="student"
                            checked={roleType === 'student'}
                            onChange={(e) => setRoleType(e.target.value)}
                            className="w-4 h-4 text-primary focus:ring-primary border-border"
                          />
                          Student
                        </label>
                        <label className="flex items-center gap-2 text-sm font-semibold text-text cursor-pointer">
                          <input
                            type="radio"
                            name="role_type"
                            value="teacher"
                            checked={roleType === 'teacher'}
                            onChange={(e) => setRoleType(e.target.value)}
                            className="w-4 h-4 text-primary focus:ring-primary border-border"
                          />
                          Teacher / Staff
                        </label>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Department
                      </label>
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-bg border border-border text-sm focus:outline-none"
                      >
                        <option value="">Select Department</option>
                        {Object.keys(departmentGroups).map(groupName => (
                          <optgroup key={groupName} label={groupName}>
                            {departmentGroups[groupName].map(d => (
                              <option key={d} value={d}>{d}</option>
                        ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    {department === 'Other' && (
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
                            className="w-full px-4 py-2.5 rounded-xl bg-bg border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
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
                            className="w-full px-4 py-2.5 rounded-xl bg-bg border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                    )}

                    {roleType === 'student' ? (
                      <>

                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            Year of Study
                          </label>
                          <select
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl bg-bg border border-border text-sm focus:outline-none"
                          >
                            <option value="">Select Year</option>
                            {years.map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            Roll Number
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 21691A0501"
                            value={rollNumber}
                            onChange={(e) => setRollNumber(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-bg border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            Designation
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Associate Professor"
                            value={designation}
                            onChange={(e) => setDesignation(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-bg border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            Role in Department
                          </label>
                          <select
                            value={teacherRole}
                            onChange={(e) => setTeacherRole(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl bg-bg border border-border text-sm focus:outline-none"
                          >
                            <option value="">Select Role</option>
                            <option value="HOD">HOD</option>
                            <option value="Teacher">Teacher</option>
                            <option value="AO">AO</option>
                            <option value="Attender">Attender</option>
                            <option value="Others">Others</option>
                          </select>
                        </div>
                        {teacherRole === 'Others' && (
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                              Specify Custom Role Name
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Lab Assistant"
                              value={customTeacherRole}
                              onChange={(e) => setCustomTeacherRole(e.target.value)}
                              className="w-full px-4 py-2.5 rounded-xl bg-bg border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Bio
                </label>
                <textarea
                  rows="3"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-bg border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Profile Avatar
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      setProfilePic(e.target.files[0]);
                      setSelectedPresetAvatar('');
                    }}
                    className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary file:cursor-pointer hover:file:bg-primary/20 mb-3"
                  />
                  
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Or Choose a Preset:</div>
                  <div className="flex gap-2 flex-wrap">
                    {avatarPresets.map((preset, idx) => {
                      const isSelected = selectedPresetAvatar === preset.url;
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setSelectedPresetAvatar(preset.url);
                            setProfilePic(null);
                          }}
                          className={`h-9 w-9 rounded-full cursor-pointer overflow-hidden border-2 transition-all p-0.5 bg-card flex items-center justify-center ${
                            isSelected 
                              ? 'border-primary scale-110 shadow-sm' 
                              : 'border-border hover:border-gray-400'
                          }`}
                          title={preset.name}
                        >
                          <img src={preset.url} alt={preset.name} className="h-full w-full rounded-full object-cover" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Profile Cover Photo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCoverPhoto(e.target.files[0])}
                    className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary file:cursor-pointer hover:file:bg-primary/20"
                  />
                </div>
              </div>

              {/* Notifications Subscription Toggles */}
              <div className="space-y-4 p-4 rounded-2xl bg-bg/50 border border-border/80">
                <span className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Notification Preferences</span>
                
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="in_app_notifications_enabled"
                    checked={inAppNotificationsEnabled}
                    onChange={(e) => setInAppNotificationsEnabled(e.target.checked)}
                    className="h-4.5 w-4.5 rounded-lg text-primary focus:ring-primary border-border bg-bg cursor-pointer"
                  />
                  <label 
                    htmlFor="in_app_notifications_enabled" 
                    className="text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer select-none animate-fade-in"
                  >
                    Receive in-app alerts (live notification dropdown menu)
                  </label>
                </div>

                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="email_notifications_enabled"
                    checked={emailNotificationsEnabled}
                    onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
                    className="h-4.5 w-4.5 rounded-lg text-primary focus:ring-primary border-border bg-bg cursor-pointer"
                  />
                  <label 
                    htmlFor="email_notifications_enabled" 
                    className="text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer select-none animate-fade-in"
                  >
                    Receive email notifications for new posts & countdown reminders
                  </label>
                </div>

                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="followed_notifications_enabled"
                    checked={followedNotificationsEnabled}
                    onChange={(e) => setFollowedNotificationsEnabled(e.target.checked)}
                    className="h-4.5 w-4.5 rounded-lg text-primary focus:ring-primary border-border bg-bg cursor-pointer"
                  />
                  <label 
                    htmlFor="followed_notifications_enabled" 
                    className="text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer select-none animate-fade-in"
                  >
                    Receive alerts when users you follow publish new posts
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center disabled:opacity-50 transition"
              >
                {loading ? 'Saving Profile...' : 'Save Profile Settings'}
              </button>
            </form>

            {/* Danger Zone: Permanent Account Deletion */}
            <div className="border-t border-red-500/20 pt-6 mt-8">
              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 space-y-3">
                <div>
                  <h4 className="text-sm font-extrabold text-red-500 uppercase tracking-wider">Danger Zone</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Permanently delete your user profile and all shared content (posts, comments, etc.). This action is irreversible.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 uppercase tracking-wider"
                >
                  Delete Account Permanently
                </button>
              </div>
            </div>
          </>
          )}

          {/* Theme selector */}
          {activeSettingsTab === 'theme' && (
            <div className="space-y-6">
              {/* Preset selection grid */}
              <div>
                <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Select Preset Theme</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.keys(presets).map((name) => {
                    const preset = presets[name];
                    const active = currentTheme.name === name;
                    return (
                      <button
                        key={name}
                        onClick={() => handleThemeSelect(name)}
                        className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 cursor-pointer relative transition-all ${
                          active 
                            ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                            : 'border-border bg-card hover:bg-bg'
                        }`}
                      >
                        <div className="flex gap-1">
                          <span className="h-4 w-4 rounded-full border shadow-sm" style={{ backgroundColor: preset.primary }} />
                          <span className="h-4 w-4 rounded-full border shadow-sm" style={{ backgroundColor: preset.bg }} />
                        </div>
                        <span className="text-xs font-bold capitalize text-text">{name}</span>
                        {active && <FiCheck className="absolute top-2 right-2 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom theme creator form */}
              <form onSubmit={handleCustomThemeSubmit} className="border-t border-border pt-6 space-y-4">
                <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <FiPlus className="text-primary" /> Create Custom Theme
                </span>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Theme Name</label>
                    <input
                      type="text"
                      value={customColors.name}
                      onChange={(e) => setCustomColors(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-lg border border-border text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Primary Color</label>
                    <input
                      type="color"
                      value={customColors.primary_color}
                      onChange={(e) => setCustomColors(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="w-full h-8 rounded border border-border cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Secondary Color</label>
                    <input
                      type="color"
                      value={customColors.secondary_color}
                      onChange={(e) => setCustomColors(prev => ({ ...prev, secondary_color: e.target.value }))}
                      className="w-full h-8 rounded border border-border cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Background</label>
                    <input
                      type="color"
                      value={customColors.bg_color}
                      onChange={(e) => setCustomColors(prev => ({ ...prev, bg_color: e.target.value }))}
                      className="w-full h-8 rounded border border-border cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Text Color</label>
                    <input
                      type="color"
                      value={customColors.text_color}
                      onChange={(e) => setCustomColors(prev => ({ ...prev, text_color: e.target.value }))}
                      className="w-full h-8 rounded border border-border cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Card Color</label>
                    <input
                      type="color"
                      value={customColors.card_bg}
                      onChange={(e) => setCustomColors(prev => ({ ...prev, card_bg: e.target.value }))}
                      className="w-full h-8 rounded border border-border cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Border Color</label>
                    <input
                      type="color"
                      value={customColors.border_color}
                      onChange={(e) => setCustomColors(prev => ({ ...prev, border_color: e.target.value }))}
                      className="w-full h-8 rounded border border-border cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 disabled:opacity-50 transition"
                >
                  {loading ? 'Creating Layout...' : 'Save & Apply Custom Theme'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
