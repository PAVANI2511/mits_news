import React, { useEffect, useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { adminAPI } from '../services/api';
import { 
  FiUsers, FiFileText, FiAlertTriangle, FiCheckCircle, 
  FiHeart, FiShare2, FiBookmark, FiMessageSquare, FiTrendingUp 
} from 'react-icons/fi';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();

    // Auto-refresh stats silently every 10 seconds to keep stats updated in real-time
    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async (showSilent = false) => {
    if (!showSilent) {
      setLoading(true);
    }
    setError('');
    try {
      const statsRes = await adminAPI.getStats();
      setStats(statsRes.data);

      const analyticsRes = await adminAPI.getAnalytics();
      setAnalytics(analyticsRes.data);
    } catch (err) {
      if (!showSilent) {
        setError("Failed to load admin dashboard statistics. Please ensure admin session is active.");
      }
    } finally {
      if (!showSilent) {
        setLoading(false);
      }
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2.5 rounded-xl">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center text-gray-500 flex flex-col items-center">
            <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-2" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Analyzing database statistics...</span>
          </div>
        ) : stats && analytics && (
          <div className="space-y-6">
            
            {/* 9 Analytics KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              
              {/* Total Users */}
              <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Users</span>
                  <h3 className="text-2xl font-black text-text mt-1">{stats.users.total}</h3>
                  <div className="text-[9px] text-gray-400 mt-1 font-bold">Blocked accounts: {stats.users.blocked}</div>
                </div>
                <div className="p-3.5 bg-primary/10 rounded-2xl text-primary text-lg">
                  <FiUsers />
                </div>
              </div>

              {/* Active Users */}
              <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Users</span>
                  <h3 className="text-2xl font-black text-text mt-1">{stats.users.active}</h3>
                  <div className="text-[9px] text-green-500 mt-1 font-bold">Authenticated students</div>
                </div>
                <div className="p-3.5 bg-green-500/10 rounded-2xl text-green-600 text-lg">
                  <FiCheckCircle />
                </div>
              </div>

              {/* Total Posts */}
              <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Articles</span>
                  <h3 className="text-2xl font-black text-text mt-1">{stats.posts.total}</h3>
                  <div className="text-[9px] text-gray-400 mt-1 font-bold">Blocked posts: {stats.posts.blocked}</div>
                </div>
                <div className="p-3.5 bg-blue-500/10 rounded-2xl text-blue-500 text-lg">
                  <FiFileText />
                </div>
              </div>

              {/* Total Comments */}
              <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Comments</span>
                  <h3 className="text-2xl font-black text-text mt-1">{stats.comments.total}</h3>
                  <div className="text-[9px] text-gray-400 mt-1 font-bold">Discussion threads</div>
                </div>
                <div className="p-3.5 bg-purple-500/10 rounded-2xl text-purple-600 text-lg">
                  <FiMessageSquare />
                </div>
              </div>

              {/* Total Likes */}
              <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Likes</span>
                  <h3 className="text-2xl font-black text-text mt-1">{stats.likes.total}</h3>
                  <div className="text-[9px] text-gray-400 mt-1 font-bold">Article appreciations</div>
                </div>
                <div className="p-3.5 bg-red-500/10 rounded-2xl text-red-500 text-lg">
                  <FiHeart />
                </div>
              </div>

              {/* Total Shares */}
              <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Shares</span>
                  <h3 className="text-2xl font-black text-text mt-1">{stats.shares.total}</h3>
                  <div className="text-[9px] text-gray-400 mt-1 font-bold">External platform forwards</div>
                </div>
                <div className="p-3.5 bg-orange-500/10 rounded-2xl text-orange-500 text-lg">
                  <FiShare2 />
                </div>
              </div>

              {/* Total Saved Posts */}
              <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Saved Posts</span>
                  <h3 className="text-2xl font-black text-text mt-1">{stats.saved_posts.total}</h3>
                  <div className="text-[9px] text-gray-400 mt-1 font-bold">Student bookmark logs</div>
                </div>
                <div className="p-3.5 bg-yellow-500/10 rounded-2xl text-yellow-600 text-lg">
                  <FiBookmark />
                </div>
              </div>

              {/* Total Reports */}
              <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Reports</span>
                  <h3 className="text-2xl font-black text-text mt-1">{stats.reports.total}</h3>
                  <div className="text-[9px] font-bold mt-1 text-gray-400">
                    <span className="text-red-500">Pending: {stats.reports.pending}</span>
                    <span> • Review: {stats.reports.under_review}</span>
                    <span className="text-green-500"> • Resolved: {stats.reports.resolved}</span>
                  </div>
                </div>
                <div className="p-3.5 bg-red-500/10 rounded-2xl text-red-500 text-lg">
                  <FiAlertTriangle className={stats.reports.pending > 0 ? 'animate-pulse' : ''} />
                </div>
              </div>

              {/* Daily Logins */}
              <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition col-span-1 sm:col-span-2 lg:col-span-1">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Daily Logins</span>
                  <h3 className="text-2xl font-black text-text mt-1">{stats.daily_logins.total}</h3>
                  <div className="text-[9px] text-gray-400 mt-1 font-bold">System authentication count today</div>
                </div>
                <div className="p-3.5 bg-teal-500/10 rounded-2xl text-teal-600 text-lg">
                  <FiTrendingUp />
                </div>
              </div>

            </div>

            {/* Demographics/Parity Grid (Creators, Follows, Departments) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Top Content Creators */}
              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-500">Top Content Creators</h4>
                <div className="divide-y divide-border text-xs">
                  {analytics.top_creators?.map((creator, i) => (
                    <div key={creator.username} className="flex justify-between items-center py-2.5">
                      <span className="font-bold text-text">
                        {i + 1}. {creator.name} <span className="text-[10px] text-gray-400 font-normal block">@{creator.username}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold whitespace-nowrap">
                        {creator.posts} articles
                      </span>
                    </div>
                  ))}
                  {(!analytics.top_creators || analytics.top_creators.length === 0) && (
                    <p className="text-xs text-gray-400 italic py-4 text-center">No creator data available.</p>
                  )}
                </div>
              </div>

              {/* Most Followed Profiles */}
              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-500">Most Followed Profiles</h4>
                <div className="divide-y divide-border text-xs">
                  {analytics.most_followed?.map((profile, i) => (
                    <div key={profile.username} className="flex justify-between items-center py-2.5">
                      <span className="font-bold text-text">
                        {i + 1}. {profile.name} <span className="text-[10px] text-gray-400 font-normal block">@{profile.username}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-[10px] font-bold whitespace-nowrap">
                        {profile.followers} followers
                      </span>
                    </div>
                  ))}
                  {(!analytics.most_followed || analytics.most_followed.length === 0) && (
                    <p className="text-xs text-gray-400 italic py-4 text-center">No followers data available.</p>
                  )}
                </div>
              </div>

              {/* Department Engagement */}
              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-500">Department Engagement</h4>
                <div className="space-y-4">
                  {analytics.departments.map((dept) => {
                    const pct = Math.min(100, Math.max(5, (dept.value * 25)));
                    return (
                      <div key={dept.name} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-text">
                          <span className="truncate pr-2">{dept.name}</span>
                          <span>{dept.value} users</span>
                        </div>
                        <div className="h-2 w-full bg-bg rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {analytics.departments.length === 0 && (
                    <p className="text-xs text-gray-400 italic text-center py-6">No departmental analytics records.</p>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
