import React, { useEffect, useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { adminAPI } from '../services/api';
import { FiUsers, FiFileText, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const statsRes = await adminAPI.getStats();
      const analyticsRes = await adminAPI.getAnalytics();
      setStats(statsRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      setError("Failed to load admin analytics. Please make sure you are logged in as admin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2.5 rounded-xl mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center text-gray-500 flex flex-col items-center">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-2" />
          <span className="text-xs">Loading analytics database...</span>
        </div>
      ) : stats && (
        <div className="space-y-6">
          {/* Card stats widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card border border-border p-6 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Students</span>
                <h3 className="text-2xl font-black text-text mt-1">{stats.users.total}</h3>
                <div className="text-[10px] text-gray-400 mt-1 font-semibold">Active: {stats.users.active} • Blocked: {stats.users.blocked}</div>
              </div>
              <div className="p-4 bg-primary/10 rounded-2xl text-primary text-xl">
                <FiUsers />
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Published Articles</span>
                <h3 className="text-2xl font-black text-text mt-1">{stats.posts.total}</h3>
                <div className="text-[10px] text-gray-400 mt-1 font-semibold">Active: {stats.posts.active} • Blocked: {stats.posts.blocked}</div>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500 text-xl">
                <FiFileText />
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Pending Reports</span>
                <h3 className="text-2xl font-black text-text mt-1">{stats.reports.pending}</h3>
                <div className="text-[10px] text-gray-400 mt-1 font-semibold">Resolved cases: {stats.reports.resolved}</div>
              </div>
              <div className="p-4 bg-red-500/10 rounded-2xl text-red-500 text-xl">
                <FiAlertTriangle className={stats.reports.pending > 0 ? 'animate-pulse' : ''} />
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Discussion Comments</span>
                <h3 className="text-2xl font-black text-text mt-1">{stats.comments.total}</h3>
                <div className="text-[10px] text-gray-400 mt-1 font-semibold">
                  Active: {stats.comments.active} • Deleted: {stats.comments.deleted} • Likes: {stats.comments.likes}
                </div>
              </div>
              <div className="p-4 bg-green-500/10 rounded-2xl text-green-500 text-xl">
                <FiCheckCircle />
              </div>
            </div>
          </div>

          {/* Charts grid */}
          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Activity Trend Line graph (custom SVG rendering) */}
              <div className="lg:col-span-2 bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
                <h4 className="font-bold text-sm text-text">Student Registrations & Activity Trends</h4>
                
                {/* SVG trend display */}
                <div className="h-64 w-full flex items-end justify-between gap-2 border-b border-l border-border pb-2 pl-2">
                  {analytics.user_trends.map((item, idx) => {
                    const barHeight = Math.max(15, (item.registrations * 20)); // scale height
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="text-[10px] text-primary font-bold opacity-0 group-hover:opacity-100 transition">{item.registrations}</div>
                        <div 
                          className="w-full bg-gradient-to-t from-primary to-primary/80 rounded-t-lg transition-all"
                          style={{ height: `${barHeight}px` }}
                        />
                        <div className="text-[9px] text-gray-500 font-semibold rotate-45 md:rotate-0 mt-1">{item.date}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Department engagement progress lists */}
              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
                <h4 className="font-bold text-sm text-text">Department Engagement</h4>
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
          )}

          {/* Follow & Content Analytics Grid */}
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Top Content Creators */}
              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500">Top Content Creators</h4>
                <div className="divide-y divide-border text-xs">
                  {analytics.top_creators?.map((creator, i) => (
                    <div key={creator.username} className="flex justify-between items-center py-2.5">
                      <span className="font-bold text-text">
                        {i + 1}. {creator.name} <span className="text-[10px] text-gray-400 font-normal block sm:inline">@{creator.username}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold whitespace-nowrap">
                        {creator.posts} articles
                      </span>
                    </div>
                  ))}
                  {(!analytics.top_creators || analytics.top_creators.length === 0) && (
                    <p className="text-xs text-gray-400 italic py-4">No content creator analytics.</p>
                  )}
                </div>
              </div>

              {/* Most Followed Profiles */}
              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500">Most Followed Profiles</h4>
                <div className="divide-y divide-border text-xs">
                  {analytics.most_followed?.map((profile, i) => (
                    <div key={profile.username} className="flex justify-between items-center py-2.5">
                      <span className="font-bold text-text">
                        {i + 1}. {profile.name} <span className="text-[10px] text-gray-400 font-normal block sm:inline">@{profile.username}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-[10px] font-bold whitespace-nowrap">
                        {profile.followers} followers
                      </span>
                    </div>
                  ))}
                  {(!analytics.most_followed || analytics.most_followed.length === 0) && (
                    <p className="text-xs text-gray-400 italic py-4">No follow count analytics.</p>
                  )}
                </div>
              </div>

              {/* Fastest Growing Profiles */}
              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500">Fastest Growing Profiles</h4>
                <div className="divide-y divide-border text-xs">
                  {analytics.fastest_growing?.map((profile, i) => (
                    <div key={profile.username} className="flex justify-between items-center py-2.5">
                      <span className="font-bold text-text">
                        {i + 1}. {profile.name} <span className="text-[10px] text-gray-400 font-normal block sm:inline">@{profile.username}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 text-[10px] font-bold whitespace-nowrap">
                        {profile.followers} followers
                      </span>
                    </div>
                  ))}
                  {(!analytics.fastest_growing || analytics.fastest_growing.length === 0) && (
                    <p className="text-xs text-gray-400 italic py-4">No growth statistics available.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
