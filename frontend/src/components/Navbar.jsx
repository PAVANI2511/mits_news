import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/authSlice';
import { changeTheme } from '../redux/themeSlice';
import { themesAPI } from '../services/api';
import { 
  FiSearch, FiLogOut, FiSettings, FiBell, FiPlusSquare, 
  FiHome, FiUser, FiActivity, FiMenu, FiX, FiCheck 
} from 'react-icons/fi';

const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { currentTheme, presets } = useSelector((state) => state.theme);

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const handleThemeChange = async (themeName) => {
    dispatch(changeTheme(themeName));
    if (isAuthenticated) {
      try {
        await themesAPI.savePreference(themeName);
      } catch (err) {
        console.error("Failed to save theme preference:", err);
      }
    }
    setThemeDropdownOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border shadow-sm transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="text-xl sm:text-2xl font-extrabold tracking-tight text-primary flex items-center gap-2">
              <span className="bg-primary text-white px-2 py-0.5 rounded-md font-mono">MITS</span>
              <span className="hidden sm:inline">Newspaper</span>
            </Link>
          </div>

          {/* Search bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="w-full relative">
              <input
                type="text"
                placeholder="Search students, emails, hashtags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-full bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
              />
              <FiSearch className="absolute left-3.5 top-3 text-gray-400 text-sm" />
            </form>
          </div>

          {/* Navigation Links */}
          <div className="hidden lg:flex items-center space-x-4">
            <Link to="/feed" className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:bg-bg text-sm font-medium transition">
              <FiHome /> Feed
            </Link>

            {isAuthenticated ? (
              <>
                <Link to="/create-post" className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:bg-bg text-sm font-medium transition">
                  <FiPlusSquare /> Post
                </Link>
                <Link to="/notifications" className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:bg-bg text-sm font-medium transition relative">
                  <FiBell /> Alerts
                </Link>
                <Link to={`/profile/${user?.username}`} className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:bg-bg text-sm font-medium transition">
                  <FiUser /> Profile
                </Link>

                {user?.is_staff && (
                  <Link to="/admin/dashboard" className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20 text-sm font-semibold transition">
                    <FiActivity /> Admin
                  </Link>
                )}

                <Link to="/settings" className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:bg-bg text-sm font-medium transition">
                  <FiSettings /> Settings
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 transition">
                  Login
                </Link>
                <Link to="/register" className="px-4 py-2 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary/95 shadow-sm transition">
                  Register
                </Link>
              </>
            )}

            {/* Theme Dropdown */}
            <div className="relative">
              <button
                onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                className="p-2 rounded-full hover:bg-bg text-lg transition"
                title="Change Theme"
              >
                🎨
              </button>

              {themeDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg bg-card border border-border shadow-lg py-1 z-50">
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 border-b border-border">Select Theme</div>
                  {Object.keys(presets).map((name) => (
                    <button
                      key={name}
                      onClick={() => handleThemeChange(name)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-bg flex items-center justify-between transition"
                    >
                      <span className="capitalize">{name}</span>
                      {currentTheme.name === name && <FiCheck className="text-primary" />}
                    </button>
                  ))}
                  {isAuthenticated && (
                    <button
                      onClick={() => {
                        setThemeDropdownOpen(false);
                        navigate('/settings');
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-bg text-primary font-medium flex items-center justify-between border-t border-border transition"
                    >
                      <span>Custom Theme</span>
                      {currentTheme.name === 'custom' && <FiCheck className="text-primary" />}
                    </button>
                  )}
                </div>
              )}
            </div>

            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="p-2 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition"
                title="Logout"
              >
                <FiLogOut className="text-lg" />
              </button>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="flex lg:hidden items-center space-x-3">
            <button
              onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
              className="p-2 rounded-full hover:bg-bg text-lg"
            >
              🎨
            </button>
            {themeDropdownOpen && (
              <div className="absolute right-12 top-14 w-40 rounded-lg bg-card border border-border shadow-lg py-1 z-50">
                {Object.keys(presets).map((name) => (
                  <button
                    key={name}
                    onClick={() => handleThemeChange(name)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-bg flex items-center justify-between capitalize transition"
                  >
                    {name}
                    {currentTheme.name === name && <FiCheck className="text-primary" />}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md hover:bg-bg text-xl focus:outline-none transition"
            >
              {mobileMenuOpen ? <FiX /> : <FiMenu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-card px-4 pt-2 pb-4 space-y-1.5 shadow-inner">
          <form onSubmit={handleSearch} className="relative py-2">
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full bg-bg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <FiSearch className="absolute left-3.5 top-5 text-gray-400 text-sm" />
          </form>

          <Link
            to="/feed"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-bg text-base font-medium transition"
          >
            <FiHome /> Feed
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to="/create-post"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-bg text-base font-medium transition"
              >
                <FiPlusSquare /> Create Post
              </Link>
              <Link
                to="/notifications"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-bg text-base font-medium transition"
              >
                <FiBell /> Notifications
              </Link>
              <Link
                to={`/profile/${user?.username}`}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-bg text-base font-medium transition"
              >
                <FiUser /> Profile
              </Link>
              {user?.is_staff && (
                <Link
                  to="/admin/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-primary/10 text-primary text-base font-semibold transition"
                >
                  <FiActivity /> Admin Dashboard
                </Link>
              )}
              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-bg text-base font-medium transition"
              >
                <FiSettings /> Settings
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-red-500 hover:bg-red-500/10 text-base font-medium text-left transition"
              >
                <FiLogOut /> Logout
              </button>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-bg transition"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/95 transition"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
