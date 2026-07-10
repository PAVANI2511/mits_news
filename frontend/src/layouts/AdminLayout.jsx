import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/authSlice';
import { getMediaUrl } from '../services/api';
import { 
  FiPieChart, FiUsers, FiFileText, FiAlertOctagon, 
  FiVolume2, FiArrowLeft, FiLogOut, FiActivity, FiMessageSquare 
} from 'react-icons/fi';

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <FiPieChart /> },
    { name: 'User Management', path: '/admin/users', icon: <FiUsers /> },
    { name: 'Post Management', path: '/admin/posts', icon: <FiFileText /> },
    { name: 'Comment Management', path: '/admin/comments', icon: <FiMessageSquare /> },
    { name: 'Reports', path: '/admin/reports', icon: <FiAlertOctagon /> },
    { name: 'Announcements', path: '/admin/announcements', icon: <FiVolume2 /> },
  ];

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row transition-colors duration-300">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-card border-r border-border flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link to="/" className="text-lg font-black tracking-wider text-primary flex items-center gap-1.5">
            <FiActivity /> MITS ADMIN
          </Link>
        </div>

        <div className="p-4 flex-1 flex flex-col justify-between">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                    active 
                      ? 'bg-primary text-white shadow-md shadow-primary/20' 
                      : 'text-text hover:bg-bg'
                  }`}
                >
                  {item.icon}
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-1 border-t border-border pt-4">
            <Link
              to="/feed"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-gray-500 hover:bg-bg transition"
            >
              <FiArrowLeft /> Back to Site
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-500/10 text-left transition"
            >
              <FiLogOut /> Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
          <h1 className="text-lg font-bold text-text capitalize">
            {navItems.find(item => item.path === location.pathname)?.name || 'Admin Console'}
          </h1>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-text">{user?.profile?.name || user?.username}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">System Administrator</div>
            </div>
            <img
              src={getMediaUrl(user?.profile?.profile_pic) || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23a0aec0"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'}
              alt="Admin avatar"
              className="h-9 w-9 rounded-full border border-border object-cover bg-card shadow-sm"
            />
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
