import React, { useEffect, useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { adminAPI } from '../services/api';
import { 
  FiUsers, FiFileText, FiAlertTriangle, FiCheckCircle, 
  FiHeart, FiShare2, FiBookmark, FiMessageSquare, FiTrendingUp 
} from 'react-icons/fi';
import DateRangePicker from '../components/DateRangePicker';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters State
  const [period, setPeriod] = useState('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDept, setSelectedDept] = useState('');

  // Refresh data when filters change
  useEffect(() => {
    loadDashboardData();
  }, [period, startDate, endDate, selectedDept]);

  // Periodic Auto-refresh (keeps selected filters)
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [period, startDate, endDate, selectedDept]);

  const loadDashboardData = async (showSilent = false) => {
    if (!showSilent) {
      setLoading(true);
    }
    setError('');
    try {
      const statsRes = await adminAPI.getStats();
      setStats(statsRes.data);

      const params = {};
      if (startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      } else {
        params.period = period;
      }
      if (selectedDept) {
        params.department = selectedDept;
      }

      const analyticsRes = await adminAPI.getAnalytics(params);
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

  const handleExportCSV = async () => {
    try {
      const params = {};
      if (startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      } else {
        params.period = period;
      }
      if (selectedDept) {
        params.department = selectedDept;
      }

      const response = await adminAPI.exportAnalyticsCSV(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics_report_${startDate || period}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to export CSV:", err);
      alert("Failed to export CSV report.");
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const formatTime = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
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

        {/* Filters Header Panel */}
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4 print:hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border/60 pb-3 gap-3">
            <div className="flex items-center gap-3">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-500">Report Filter Controls</h4>
              {analytics?.last_updated && (
                <span className="text-[10px] text-gray-400 bg-bg border border-border px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Last updated: {formatTime(analytics.last_updated)}
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="bg-primary text-white text-[10px] font-black px-2.5 py-1.5 rounded-xl uppercase tracking-wide hover:bg-primary/95 transition-colors shadow-sm"
              >
                📥 Export CSV
              </button>
              <button
                onClick={handlePrintPDF}
                className="bg-purple-600 text-white text-[10px] font-black px-2.5 py-1.5 rounded-xl uppercase tracking-wide hover:bg-purple-750 transition-colors shadow-sm"
              >
                📄 Export PDF / Print
              </button>
              {(startDate || endDate || selectedDept || period !== 'daily') && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setSelectedDept('');
                    setPeriod('daily');
                  }}
                  className="text-[10px] font-black text-red-500 hover:text-red-600 uppercase tracking-wide transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            {/* Period Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Time Range Period</label>
              <select
                value={period}
                onChange={(e) => {
                  setPeriod(e.target.value);
                  setStartDate('');
                  setEndDate('');
                }}
                className="bg-bg border border-border px-3 py-2 rounded-xl text-xs text-text font-semibold focus:outline-none focus:border-primary cursor-pointer transition-colors"
              >
                <option value="daily">Daily Report (Today)</option>
                <option value="weekly">Weekly Report (Past 7 Days)</option>
                <option value="monthly">Monthly Report (Past 30 Days)</option>
                <option value="semester">Semester-wise Report (Select dates)</option>
              </select>
            </div>

            {/* Custom Calendar Date Range Picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Custom Date Filter</label>
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onApply={(start, end) => {
                  setStartDate(start);
                  setEndDate(end);
                }}
                onClear={() => {
                  setStartDate('');
                  setEndDate('');
                }}
              />
            </div>

            {/* Department Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Limit Department</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-bg border border-border px-3 py-2 rounded-xl text-xs text-text font-semibold focus:outline-none focus:border-primary cursor-pointer transition-colors"
              >
                <option value="">All Departments</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
                <option value="Electrical Engineering">Electrical Engineering</option>
                <option value="Civil Engineering">Civil Engineering</option>
                <option value="Electronics & Communication">Electronics & Communication</option>
                <option value="Information Technology">Information Technology</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center text-gray-500 flex flex-col items-center">
            <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-2" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Analyzing database statistics...</span>
          </div>
        ) : stats && analytics && (
          <div className="space-y-6">
            
            {/* Time-Based Report Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Total Posts in Range */}
              <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Articles Count</span>
                  <h3 className="text-2xl font-black text-text mt-1">{analytics.total_posts}</h3>
                  <div className="text-[9px] text-gray-400 mt-1 font-bold">Posts in range</div>
                </div>
                <div className="p-3.5 bg-blue-500/10 rounded-2xl text-blue-500 text-lg">
                  <FiFileText />
                </div>
              </div>

              {/* Peak Day */}
              <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Peak Post Activity</span>
                  <h3 className="text-sm font-black text-text mt-1 truncate max-w-[150px]">{analytics.peak_day.date}</h3>
                  <div className="text-[9px] text-green-500 mt-1 font-bold">{analytics.peak_day.count} posts published</div>
                </div>
                <div className="p-3.5 bg-green-500/10 rounded-2xl text-green-600 text-lg">
                  <FiTrendingUp />
                </div>
              </div>

              {/* Top 3 Departments */}
              <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition">
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Top Departments</span>
                  <div className="mt-1 space-y-0.5">
                    {analytics.top_departments && analytics.top_departments.length > 0 ? (
                      analytics.top_departments.map((dept, i) => (
                        <div key={dept.department} className="text-[11px] font-black text-text truncate">
                          {i + 1}. {dept.department} <span className="text-[9px] font-semibold text-gray-400">({dept.count})</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs font-black text-text mt-1">None</div>
                    )}
                  </div>
                </div>
                <div className="p-3.5 bg-purple-500/10 rounded-2xl text-purple-600 text-lg">
                  <FiUsers />
                </div>
              </div>

              {/* Growth Rate */}
              <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Post Growth Rate</span>
                  <h3 className={`text-2xl font-black mt-1 ${analytics.growth_rate >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {analytics.growth_rate >= 0 ? '🔼 +' : '🔽 '}{analytics.growth_rate}%
                  </h3>
                  <div className="text-[9px] text-gray-450 mt-0.5 font-bold uppercase tracking-wide">
                    Trend: <span className={analytics.trend === 'Increasing' ? 'text-green-500' : analytics.trend === 'Decreasing' ? 'text-red-500' : 'text-yellow-600'}>
                      {analytics.trend}
                    </span>
                  </div>
                </div>
                <div className="p-3.5 bg-yellow-500/10 rounded-2xl text-yellow-600 text-lg">
                  <FiTrendingUp className={analytics.growth_rate >= 0 ? 'text-green-500' : 'text-red-500'} />
                </div>
              </div>
            </div>

            {/* Time reports chart and department breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Post Activity Over Time CSS Bar Chart */}
              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4 col-span-1 lg:col-span-2">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-500">Post Activity Over Time</h4>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {analytics.total_posts === 0 ? (
                    <div className="py-16 text-center text-xs font-bold text-gray-400 uppercase tracking-wider italic flex flex-col items-center gap-1.5">
                      <span>No activity in selected range</span>
                      <span className="text-[10px] font-normal text-gray-400 normal-case">Try changing filters or selecting a wider date range.</span>
                    </div>
                  ) : (
                    analytics.chart_data?.map((item) => {
                      const maxVal = Math.max(...analytics.chart_data.map(i => i.posts), 1);
                      const pct = Math.min(100, Math.max(5, (item.posts / maxVal) * 100));
                      return (
                        <div key={item.label} className="flex items-center gap-3 text-xs">
                          <span className="w-24 text-gray-500 font-bold truncate text-right">{item.label}</span>
                          <div className="h-5 flex-1 bg-bg rounded-lg overflow-hidden relative border border-border/40">
                            <div 
                              className="h-full bg-primary/80 rounded-lg transition-all duration-500 hover:bg-primary"
                              style={{ width: `${pct}%` }}
                            />
                            <span className="absolute left-2.5 top-0.5 text-[10px] font-black text-text">{item.posts} posts</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Department Posts Breakdown list */}
              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-500">Department Report Breakdown</h4>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {analytics.total_posts === 0 ? (
                    <div className="py-16 text-center text-xs font-bold text-gray-400 uppercase tracking-wider italic flex flex-col items-center gap-1.5">
                      <span>No activity in selected range</span>
                      <span className="text-[10px] font-normal text-gray-400 normal-case">Try changing filters or selecting a wider date range.</span>
                    </div>
                  ) : (
                    analytics.department_breakdown?.map((dept) => {
                      const maxVal = Math.max(...analytics.department_breakdown.map(i => i.count), 1);
                      const pct = Math.min(100, Math.max(5, (dept.count / maxVal) * 100));
                      return (
                        <div key={dept.department} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-text">
                            <span className="truncate pr-2">{dept.department}</span>
                            <span>{dept.count} posts</span>
                          </div>
                          <div className="h-2 w-full bg-bg rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

            {/* General Site Lifetime Demographics Grid */}
            <div className="pt-4 border-t border-border/80 print:hidden">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Lifetime Site Statistics</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                {/* Total Users */}
                <div className="bg-card border border-border p-4 rounded-2xl flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Total Registrations</span>
                    <h3 className="text-xl font-black text-text mt-0.5">{stats.users.total}</h3>
                  </div>
                  <div className="p-2.5 bg-primary/10 rounded-xl text-primary text-sm">
                    <FiUsers />
                  </div>
                </div>

                {/* Active Users */}
                <div className="bg-card border border-border p-4 rounded-2xl flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Authenticated Users</span>
                    <h3 className="text-xl font-black text-text mt-0.5">{stats.users.active}</h3>
                  </div>
                  <div className="p-2.5 bg-green-500/10 rounded-xl text-green-600 text-sm">
                    <FiCheckCircle />
                  </div>
                </div>

                {/* Lifetime Comments */}
                <div className="bg-card border border-border p-4 rounded-2xl flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Comments Posted</span>
                    <h3 className="text-xl font-black text-text mt-0.5">{stats.comments.total}</h3>
                  </div>
                  <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-600 text-sm">
                    <FiMessageSquare />
                  </div>
                </div>

                {/* Lifetime Likes */}
                <div className="bg-card border border-border p-4 rounded-2xl flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Likes Count</span>
                    <h3 className="text-xl font-black text-text mt-0.5">{stats.likes.total}</h3>
                  </div>
                  <div className="p-2.5 bg-red-500/10 rounded-xl text-red-500 text-sm">
                    <FiHeart />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Creators */}
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
                  </div>
                </div>

                {/* Most Followed */}
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
                  </div>
                </div>

                {/* Department Demographics */}
                <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-500">Department Registered Demographics</h4>
                  <div className="space-y-4">
                    {analytics.departments?.map((dept) => {
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
                  </div>
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
