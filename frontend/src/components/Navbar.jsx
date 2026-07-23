import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/authSlice';
import { changeTheme } from '../redux/themeSlice';
import { themesAPI, notificationsAPI, getMediaUrl } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { 
  FiSearch, FiLogOut, FiSettings, FiBell, FiPlusSquare, 
  FiHome, FiUser, FiActivity, FiMenu, FiX, FiCheck, FiBookmark, FiUsers, FiTrendingUp
} from 'react-icons/fi';

const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { currentTheme, presets } = useSelector((state) => state.theme);

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const fetchNotificationsData = async () => {
    try {
      const res = await notificationsAPI.getUnreadCount();
      setUnreadCount(res.data.unread_count);

      const listRes = await notificationsAPI.getList();
      setRecentNotifications(listRes.data.slice(0, 5));
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  React.useEffect(() => {
    if (isAuthenticated) {
      fetchNotificationsData();
      const interval = setInterval(fetchNotificationsData, 8000);
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
      setRecentNotifications([]);
    }
  }, [isAuthenticated]);

  const handleNewWebSocketNotification = React.useCallback((data) => {
    console.log("WebSocket notification received in Navbar:", data);
    setUnreadCount(prev => prev + 1);
    setRecentNotifications(prev => [data, ...prev].slice(0, 5));
    window.dispatchEvent(new CustomEvent('new-websocket-notification', { detail: data }));
  }, []);

  useWebSocket(handleNewWebSocketNotification);

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setUnreadCount(0);
      setRecentNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleNotificationClick = async (n) => {
    setNotificationsOpen(false);
    if (!n.is_read) {
      try {
        await notificationsAPI.markRead(n.id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setRecentNotifications(prev => 
          prev.map(item => item.id === n.id ? { ...item, is_read: true } : item)
        );
      } catch (err) {
        console.error("Failed to mark notification read:", err);
      }
    }
    if (n.post_id) {
      navigate(`/posts/${n.post_id}`);
    } else {
      navigate('/notifications');
    }
  };

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
            <Link to="/" className="flex items-center gap-2.5 group focus:outline-none cursor-pointer">
              <div className="bg-[#800000] text-white px-2.5 py-1 rounded-md font-bold text-sm tracking-wider shadow-sm group-hover:bg-[#660000] transition">
                MITS
              </div>
              <span className="font-serif text-xl sm:text-2xl font-bold text-[#800000] tracking-tight">
                Newspaper
              </span>
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
          <div className="hidden lg:flex items-center space-x-1 xl:space-x-2.5">
            <Link to="/feed" className="flex flex-col items-center justify-center px-2 py-1 rounded-md hover:bg-bg transition text-center" title="Home">
              <FiHome className="text-lg" />
              <span className="text-[10px] font-medium mt-0.5">Home</span>
            </Link>
            <Link to="/following" className="flex flex-col items-center justify-center px-2 py-1 rounded-md hover:bg-bg transition text-center" title="Following">
              <FiUsers className="text-lg" />
              <span className="text-[10px] font-medium mt-0.5">Following</span>
            </Link>
            <Link to="/explore" className="flex flex-col items-center justify-center px-2 py-1 rounded-md hover:bg-bg transition text-center" title="Explore">
              <FiTrendingUp className="text-lg" />
              <span className="text-[10px] font-medium mt-0.5">Explore</span>
            </Link>

            {isAuthenticated ? (
              <>
                <Link to="/create-post" className="flex flex-col items-center justify-center px-2 py-1 rounded-md hover:bg-bg transition text-center" title="Post">
                  <FiPlusSquare className="text-lg" />
                  <span className="text-[10px] font-medium mt-0.5">Post</span>
                </Link>
                {/* Bell Dropdown */}
                <div className="relative flex flex-col items-center justify-center">
                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="flex flex-col items-center justify-center px-2 py-1 rounded-md hover:bg-bg transition text-center relative"
                    title="Alerts"
                  >
                    <FiBell className="text-lg" />
                    <span className="text-[10px] font-medium mt-0.5">Alerts</span>
                    {unreadCount > 0 && (
                      <span className="absolute top-0.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white leading-none shadow-sm animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {notificationsOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-80 rounded-2xl bg-card border border-border shadow-xl py-2 z-50 animate-fadeIn">
                      <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-text">Recent Alerts</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-[10px] font-bold text-primary hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {recentNotifications.length > 0 ? (
                          recentNotifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => handleNotificationClick(n)}
                              className={`px-4 py-3 hover:bg-bg/40 cursor-pointer flex gap-3 border-b border-border/40 transition-colors ${
                                !n.is_read ? 'bg-primary/5' : ''
                              }`}
                            >
                              {n.sender_profile_pic ? (
                                <img
                                  src={getMediaUrl(n.sender_profile_pic)}
                                  alt=""
                                  className="h-8 w-8 rounded-full object-cover border border-border/60"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold uppercase">
                                  {n.sender_username.substring(0, 2)}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-text leading-snug font-medium">
                                  {n.message}
                                </p>
                                <span className="text-[9px] text-gray-400 mt-1 block">
                                  {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              {!n.is_read && (
                                <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="py-8 text-center text-xs text-gray-500">
                            No recent alerts
                          </div>
                        )}
                      </div>
                      <div className="px-4 py-2 text-center border-t border-border/85 bg-bg/10">
                        <Link
                          to="/notifications"
                          onClick={() => setNotificationsOpen(false)}
                          className="text-xs font-bold text-primary hover:underline"
                        >
                          View All Notifications
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
                <Link to="/saved" className="flex flex-col items-center justify-center px-2 py-1 rounded-md hover:bg-bg transition text-center" title="Saved">
                  <FiBookmark className="text-lg" />
                  <span className="text-[10px] font-medium mt-0.5">Saved</span>
                </Link>
                <Link to={`/profile/${user?.username}`} className="flex flex-col items-center justify-center px-2 py-1 rounded-md hover:bg-bg transition text-center" title="Profile">
                  <FiUser className="text-lg" />
                  <span className="text-[10px] font-medium mt-0.5">Profile</span>
                </Link>

                {user?.is_staff && (
                  <Link to="/admin/dashboard" className="flex flex-col items-center justify-center px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition text-center" title="Admin">
                    <FiActivity className="text-lg" />
                    <span className="text-[10px] font-semibold mt-0.5">Admin</span>
                  </Link>
                )}

                <Link to="/settings" className="flex flex-col items-center justify-center px-2 py-1 rounded-md hover:bg-bg transition text-center" title="Settings">
                  <FiSettings className="text-lg" />
                  <span className="text-[10px] font-medium mt-0.5">Settings</span>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="px-5 py-2 font-serif text-sm font-medium text-[#800000] hover:underline transition">
                  Login
                </Link>
                <Link to="/register" className="px-6 py-2 bg-[#800000] hover:bg-[#660000] text-white rounded-full font-serif text-sm font-medium shadow transition cursor-pointer">
                  Register
                </Link>
              </>
            )}

            {/* Theme Dropdown */}
            <div className="relative flex flex-col items-center justify-center">
              <button
                onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                className="p-1 rounded-full hover:bg-bg text-base transition flex flex-col items-center justify-center"
                title="Change Theme"
              >
                <span>🎨</span>
                <span className="text-[10px] font-medium mt-0.5 text-text">Theme</span>
              </button>

              {themeDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 rounded-lg bg-card border border-border shadow-lg py-1 z-50">
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
                        navigate('/settings?tab=theme');
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
                className="flex flex-col items-center justify-center px-2 py-1 rounded-md text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition text-center"
                title="Logout"
              >
                <FiLogOut className="text-lg" />
                <span className="text-[10px] font-medium mt-0.5">Logout</span>
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
            <FiHome /> Home
          </Link>
          <Link
            to="/following"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-bg text-base font-medium transition"
          >
            <FiUsers /> Following
          </Link>
          <Link
            to="/explore"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-bg text-base font-medium transition"
          >
            <FiTrendingUp /> Explore
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
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-bg text-base font-medium transition relative"
              >
                <FiBell /> Notifications
                {unreadCount > 0 && (
                  <span className="absolute right-3 top-3.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white leading-none shadow-sm animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <Link
                to="/saved"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-bg text-base font-medium transition"
              >
                <FiBookmark /> Saved Posts
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
