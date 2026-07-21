import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import { adminAPI } from '../services/api';
import { 
  FiCheck, FiAlertCircle, FiSearch, FiFilter, FiDownload, 
  FiChevronLeft, FiChevronRight, FiEye, FiActivity, FiUserX, 
  FiTrash2, FiFileText, FiAlertOctagon, FiClock
} from 'react-icons/fi';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Detailed view states
  const [activeReportId, setActiveReportId] = useState(null);
  const [detailedReport, setDetailedReport] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  // Modal note/status edits
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [submittingChanges, setSubmittingChanges] = useState(false);

  // Filters, search, sort, pagination
  const [searchVal, setSearchVal] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('-created_at');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        page_size: 10,
        sort_by: sortBy,
      };
      if (searchVal.trim()) params.q = searchVal.trim();
      if (typeFilter) params.type = typeFilter;
      if (reasonFilter) params.reason = reasonFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await adminAPI.getReports(params);
      setReports(res.data.results);
      setTotalCount(res.data.total_count);
      setTotalPages(Math.ceil(res.data.total_count / 10) || 1);
      if (res.data.summary) {
        setSummary(res.data.summary);
      }
    } catch (_err) {
      setError("Failed to load moderation reports database.");
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, searchVal, typeFilter, reasonFilter, statusFilter]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadReports();
  };

  const handleOpenDetails = async (id) => {
    setActiveReportId(id);
    setDetailsLoading(true);
    setError('');
    try {
      const res = await adminAPI.getReportDetail(id);
      setDetailedReport(res.data);
      setNewStatus(res.data.status);
      setAdminNotes(res.data.admin_notes || '');
    } catch (err) {
      setError("Failed to load details for report #" + id);
      setActiveReportId(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSaveChanges = async (actionType = '') => {
    setSubmittingChanges(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        status: newStatus,
        admin_notes: adminNotes,
      };
      if (actionType) {
        payload.action = actionType;
      }

      const res = await adminAPI.updateReport(activeReportId, payload);
      setSuccess(res.data.message);
      
      const updatedStatus = res.data.report?.status || newStatus;
      setNewStatus(updatedStatus);

      // Refresh detailed report view
      try {
        const freshRes = await adminAPI.getReportDetail(activeReportId);
        setDetailedReport(freshRes.data);
      } catch (_err) {
        // If report target detail is gone or deleted, clear it safely
        setActiveReportId(null);
        setDetailedReport(null);
      }

      // Reload list, counts, pagination, and summaries
      await loadReports();

      if (actionType) {
        // Close modal if post deletion/user deletion happened since targets might no longer exist
        if (['delete_post', 'delete_user'].includes(actionType)) {
          setActiveReportId(null);
          setDetailedReport(null);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update report changes.");
    } finally {
      setSubmittingChanges(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = ["Report ID", "Reporter", "Reported Target", "Type", "Reason", "Details", "Status", "Date", "Admin Notes"];
    const rows = reports.map(r => [
      r.id,
      r.reporter_username,
      r.reported_username || '',
      r.reported_post_id ? 'Post' : 'Profile',
      r.reason,
      (r.details || '').replace(/"/g, '""'),
      r.status,
      r.created_at ? new Date(r.created_at).toLocaleDateString() : '',
      (r.admin_notes || '').replace(/"/g, '""')
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "mits_reports_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF print export
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>MITS News - Moderation Reports Export</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; }
            h1 { font-size: 20px; font-weight: 800; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.05em; color: #4f46e5; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
            th { background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-weight: bold; color: #475569; text-align: left; padding: 12px 10px; text-transform: uppercase; }
            td { border-bottom: 1px solid #f1f5f9; padding: 10px; color: #334155; }
            .badge { display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 9px; font-weight: bold; text-transform: uppercase; }
            .badge-pending { background: #fef3c7; color: #d97706; }
            .badge-resolved { background: #dcfce7; color: #15803d; }
            .badge-rejected { background: #fee2e2; color: #b91c1c; }
            .badge-review { background: #e0f2fe; color: #0369a1; }
            .footer { margin-top: 30px; font-size: 9px; text-align: center; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 15px; }
          </style>
        </head>
        <body>
          <h1>Moderation Reports Summary (${new Date().toLocaleDateString()})</h1>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Reporter</th>
                <th>Target</th>
                <th>Type</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${reports.map(r => `
                <tr>
                  <td>${r.id}</td>
                  <td>@${r.reporter_username}</td>
                  <td>${r.reported_username ? '@' + r.reported_username : (r.reported_post_id ? 'Post #' + r.reported_post_id : 'N/A')}</td>
                  <td>${r.reported_post_id ? 'Post' : 'Profile'}</td>
                  <td>${r.reason}</td>
                  <td>
                    <span class="badge badge-${r.status === 'pending' ? 'pending' : r.status === 'under_review' ? 'review' : r.status === 'resolved' ? 'resolved' : 'rejected'}">
                      ${r.status}
                    </span>
                  </td>
                  <td>${r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            Generated by MITS Newspaper Admin Console. Private and Confidential.
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusBadge = (statusVal) => {
    switch (statusVal) {
      case 'pending':
        return <span className="px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 w-fit"><FiAlertCircle /> Pending</span>;
      case 'under_review':
        return <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 w-fit"><FiClock /> Under Review</span>;
      case 'resolved':
        return <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 w-fit"><FiCheck /> Resolved</span>;
      case 'rejected':
        return <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 w-fit"><FiAlertOctagon /> Rejected</span>;
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        
        {/* KPI Metrics Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Reports</span>
                <h3 className="text-2xl font-black text-text mt-1">{summary.total}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-2xl text-primary text-lg">
                <FiAlertOctagon />
              </div>
            </div>

            <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Pending Investigations</span>
                <h3 className="text-2xl font-black text-text mt-1">{summary.pending}</h3>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-2xl text-yellow-600 text-lg">
                <FiAlertCircle className={summary.pending > 0 ? 'animate-pulse' : ''} />
              </div>
            </div>

            <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Resolved Cases</span>
                <h3 className="text-2xl font-black text-text mt-1">{summary.resolved}</h3>
              </div>
              <div className="p-3 bg-green-500/10 rounded-2xl text-green-600 text-lg">
                <FiCheck />
              </div>
            </div>

            <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Rejected Reports</span>
                <h3 className="text-2xl font-black text-text mt-1">{summary.rejected}</h3>
              </div>
              <div className="p-3 bg-red-500/10 rounded-2xl text-red-500 text-lg">
                <FiAlertOctagon />
              </div>
            </div>
          </div>
        )}

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

        {/* Filters and List view */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          
          {/* Main Reports Table Block */}
          <div className="xl:col-span-3 space-y-4">
            
            {/* Filter controls */}
            <div className="bg-card border border-border p-4 rounded-2xl shadow-sm space-y-4">
              <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                    placeholder="Search by reporter, reason, details..."
                    className="w-full bg-bg border border-border pl-10 pr-4 py-2 rounded-xl text-xs text-text focus:outline-none focus:border-primary font-semibold"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition flex items-center gap-1.5"
                  >
                    <FiSearch /> Search
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchVal('');
                      setTypeFilter('');
                      setReasonFilter('');
                      setStatusFilter('');
                      setSortBy('-created_at');
                      setPage(1);
                      setTimeout(() => loadReports(), 100);
                    }}
                    className="px-3.5 py-2 border border-border text-gray-500 hover:bg-bg rounded-xl text-xs font-bold transition"
                  >
                    Reset
                  </button>
                </div>
              </form>

              {/* Advanced Filter select boxes */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1"><FiFilter /> Report Type</span>
                  <select
                    value={typeFilter}
                    onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                    className="w-full bg-bg border border-border px-3 py-2 rounded-xl text-xs text-text focus:outline-none focus:border-primary font-semibold"
                  >
                    <option value="">All Types</option>
                    <option value="post">Post Only</option>
                    <option value="profile">Profile Only</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1"><FiFilter /> Reason</span>
                  <select
                    value={reasonFilter}
                    onChange={(e) => { setReasonFilter(e.target.value); setPage(1); }}
                    className="w-full bg-bg border border-border px-3 py-2 rounded-xl text-xs text-text focus:outline-none focus:border-primary font-semibold"
                  >
                    <option value="">All Reasons</option>
                    <option value="Spam">Spam</option>
                    <option value="Fake News">Fake News</option>
                    <option value="Harassment">Harassment</option>
                    <option value="Hate Speech">Hate Speech</option>
                    <option value="Inappropriate Profile">Inappropriate Profile</option>
                    <option value="Offensive Content">Offensive Content</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1"><FiFilter /> Status</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="w-full bg-bg border border-border px-3 py-2 rounded-xl text-xs text-text focus:outline-none focus:border-primary font-semibold"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="under_review">Under Review</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1"><FiActivity /> Sort By</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-bg border border-border px-3 py-2 rounded-xl text-xs text-text focus:outline-none focus:border-primary font-semibold"
                  >
                    <option value="-created_at">Date: Newest</option>
                    <option value="created_at">Date: Oldest</option>
                    <option value="status">Status: Ascending</option>
                    <option value="-status">Status: Descending</option>
                    <option value="reason">Reason</option>
                  </select>
                </div>
              </div>

              {/* Exports */}
              <div className="flex justify-between items-center border-t border-border/60 pt-3">
                <span className="text-[10px] text-gray-400 font-bold">Total: {totalCount} records found</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportCSV}
                    className="px-3 py-1.5 border border-border rounded-xl text-xs font-bold hover:bg-bg flex items-center gap-1 transition"
                  >
                    <FiDownload /> CSV
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="px-3 py-1.5 border border-border rounded-xl text-xs font-bold hover:bg-bg flex items-center gap-1 transition"
                  >
                    <FiFileText /> PDF
                  </button>
                </div>
              </div>
            </div>

            {/* Reports List Table */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              {loading ? (
                <div className="py-20 text-center text-gray-500 flex flex-col items-center">
                  <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-2" />
                  <span className="text-xs">Loading case data...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-bg/40">
                      <tr>
                        <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Reporter</th>
                        <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Reported target</th>
                        <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Reason & Details</th>
                        <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border/60 text-xs text-text">
                      {reports.map((r) => (
                        <tr key={r.id} className="hover:bg-bg/10 transition">
                          <td className="px-6 py-4 whitespace-nowrap font-bold">
                            @{r.reporter_username}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {r.target_type === 'post' ? (
                              <span className="text-primary hover:underline font-semibold block cursor-pointer" onClick={() => handleOpenDetails(r.id)}>
                                {r.reported_post_id ? `Post #${r.reported_post_id}` : 'Post [DELETED]'}
                              </span>
                            ) : r.target_type === 'comment' ? (
                              <span className="text-primary hover:underline font-semibold block cursor-pointer" onClick={() => handleOpenDetails(r.id)}>
                                {r.reported_comment_id ? `Comment #${r.reported_comment_id}` : 'Comment [DELETED]'}
                              </span>
                            ) : (
                              <span className="text-primary hover:underline font-semibold block cursor-pointer" onClick={() => handleOpenDetails(r.id)}>
                                User: @{r.reported_username} {!r.reported_user_id ? '[DELETED]' : ''}
                              </span>
                            )}
                            <span className="text-[9px] text-gray-400 font-semibold block uppercase">
                              {r.target_type === 'post' ? 'Post Content' : r.target_type === 'comment' ? 'Comment Content' : 'Profile Page'}
                            </span>
                          </td>
                          <td className="px-6 py-4 max-w-xs">
                            <span className="font-bold block text-text">{r.reason}</span>
                            <span className="text-[10px] text-gray-500 block truncate">{r.details || 'No details provided.'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(r.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-400 font-semibold">
                            {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => handleOpenDetails(r.id)}
                              className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold transition flex items-center gap-1 inline-flex"
                            >
                              <FiEye /> View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                      {reports.length === 0 && (
                        <tr>
                          <td colSpan="6" className="text-center py-10 text-gray-400 italic">No reports filed matching the filter query.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center bg-card border border-border p-4 rounded-2xl shadow-sm">
                <button
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="px-3.5 py-1.5 border border-border rounded-xl text-xs font-bold hover:bg-bg disabled:opacity-50 transition flex items-center gap-1 text-gray-500"
                >
                  <FiChevronLeft /> Previous
                </button>
                <span className="text-xs font-bold text-gray-500">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="px-3.5 py-1.5 border border-border rounded-xl text-xs font-bold hover:bg-bg disabled:opacity-50 transition flex items-center gap-1 text-gray-500"
                >
                  Next <FiChevronRight />
                </button>
              </div>
            )}

          </div>

          {/* Right Summary Columns (Most Reported targets) */}
          <div className="space-y-6">
            
            {/* Most Reported Posts */}
            <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1"><FiFileText /> Most Reported Posts</h3>
              <div className="divide-y divide-border text-xs">
                {summary?.most_reported_posts?.map((post) => (
                  <div key={post.reported_post_id} className="py-2.5 flex justify-between items-center">
                    <div className="min-w-0">
                      <Link to={`/posts/${post.reported_post_id}`} className="hover:text-primary transition">
                        <span className="font-bold text-text truncate block hover:text-primary transition">Post #{post.reported_post_id}</span>
                      </Link>
                      <span className="text-[10px] text-gray-400 block truncate">Author: @{post.username}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-red-500/10 text-red-500 font-bold rounded-full text-[9px] tracking-wider whitespace-nowrap">
                      {post.count} reports
                    </span>
                  </div>
                ))}
                {(!summary?.most_reported_posts || summary.most_reported_posts.length === 0) && (
                  <p className="text-xs text-gray-400 italic py-4 text-center">No posts reported.</p>
                )}
              </div>
            </div>

            {/* Most Reported Users */}
            <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1"><FiUserX /> Most Reported Profiles</h3>
              <div className="divide-y divide-border text-xs">
                {summary?.most_reported_users?.map((user) => (
                  <div key={user.reported_user_id} className="py-2.5 flex justify-between items-center">
                    <div className="min-w-0">
                      <Link to={`/profile/${user.reported_user__username}`} className="hover:text-primary transition">
                        <span className="font-bold text-text truncate block hover:text-primary transition">{user.name}</span>
                        <span className="text-[10px] text-gray-400 block truncate">@{user.reported_user__username}</span>
                      </Link>
                    </div>
                    <span className="px-2 py-0.5 bg-red-500/10 text-red-500 font-bold rounded-full text-[9px] tracking-wider whitespace-nowrap">
                      {user.count} reports
                    </span>
                  </div>
                ))}
                {(!summary?.most_reported_users || summary.most_reported_users.length === 0) && (
                  <p className="text-xs text-gray-400 italic py-4 text-center">No profiles reported.</p>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Report Detailed Drawer/Modal */}
      {activeReportId && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-card border-l border-border h-full max-w-lg w-full p-6 shadow-2xl overflow-y-auto flex flex-col justify-between animate-slideIn">
            
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-text">Report Details</h3>
                  <span className="text-[10px] text-gray-400 font-bold font-mono">ID: {activeReportId}</span>
                </div>
                <button 
                  onClick={() => { setActiveReportId(null); setDetailedReport(null); }}
                  className="text-gray-400 hover:text-text font-bold text-xl"
                >
                  &times;
                </button>
              </div>

              {detailsLoading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center">
                  <div className="h-6 w-6 rounded-full border-3 border-primary border-t-transparent animate-spin mb-2" />
                  <span className="text-xs font-semibold text-gray-400">Loading case details...</span>
                </div>
              ) : detailedReport && (
                <div className="space-y-5 text-xs text-text">
                  
                  {/* Case status badge */}
                  <div className="flex items-center justify-between bg-bg/40 border border-border p-3 rounded-2xl">
                    <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Case Status</span>
                    {getStatusBadge(detailedReport.status)}
                  </div>

                  {/* Reporter details */}
                  <div className="space-y-1 bg-bg/20 p-3 rounded-2xl border border-border/60">
                    <h4 className="font-extrabold uppercase tracking-wider text-gray-500 text-[10px]">Reporter</h4>
                    <div className="font-bold text-text">{detailedReport.reporter.name}</div>
                    <div className="text-gray-400">@{detailedReport.reporter.username} • {detailedReport.reporter.email}</div>
                  </div>

                  {/* Reason & Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-bg/20 p-3 rounded-2xl border border-border/60">
                      <h4 className="font-extrabold uppercase tracking-wider text-gray-500 text-[10px]">Reason Category</h4>
                      <div className="font-bold text-text mt-1">{detailedReport.reason}</div>
                    </div>
                    <div className="bg-bg/20 p-3 rounded-2xl border border-border/60">
                      <h4 className="font-extrabold uppercase tracking-wider text-gray-500 text-[10px]">Date Submitted</h4>
                      <div className="font-bold text-text mt-1">
                        {detailedReport.created_at ? new Date(detailedReport.created_at).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Description / details */}
                  <div className="space-y-1 bg-bg/20 p-3 rounded-2xl border border-border/60">
                    <h4 className="font-extrabold uppercase tracking-wider text-gray-500 text-[10px]">Reporter Notes</h4>
                    <p className="leading-relaxed whitespace-pre-wrap">{detailedReport.details || 'No additional notes provided.'}</p>
                  </div>

                  {/* Reported Target card */}
                  <div className="space-y-2 bg-bg/20 p-3 rounded-2xl border border-border/60">
                    <h4 className="font-extrabold uppercase tracking-wider text-gray-500 text-[10px]">Reported Target</h4>
                    
                    {detailedReport.reported_post ? (
                      <div className="space-y-2">
                        <div className="font-bold text-primary">
                          {detailedReport.reported_post.id 
                            ? `Post #${detailedReport.reported_post.id} (by @${detailedReport.reported_post.author_username})`
                            : `Post (by @${detailedReport.reported_post.author_username}) [DELETED]`}
                        </div>
                        {detailedReport.reported_post.caption && (
                          <div className="bg-bg/40 p-2.5 rounded-xl border border-border/60 font-semibold truncate italic">
                            "{detailedReport.reported_post.caption}"
                          </div>
                        )}
                        <div className="flex gap-2">
                          {detailedReport.reported_post.id ? (
                            <>
                              <Link 
                                to={`/posts/${detailedReport.reported_post.id}`} 
                                target="_blank"
                                className="px-3 py-1 bg-primary text-white rounded-lg font-bold text-[10px] hover:bg-primary/90 transition inline-flex items-center gap-1"
                              >
                                Visit Post
                              </Link>
                              {detailedReport.reported_post.is_blocked ? (
                                <span className="text-[10px] font-bold text-red-600 self-center">(Post Currently Blocked/Hidden)</span>
                              ) : (
                                <span className="text-[10px] font-bold text-green-600 self-center">(Post Currently Active)</span>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] font-bold text-red-600 self-center">(Post has been permanently deleted)</span>
                          )}
                        </div>
                      </div>
                    ) : detailedReport.reported_user ? (
                      <div className="space-y-2">
                        <div className="font-bold text-primary">
                          {detailedReport.reported_user.id 
                            ? `${detailedReport.reported_user.name} (@${detailedReport.reported_user.username})`
                            : `@${detailedReport.reported_user.username} [DELETED]`}
                        </div>
                        {detailedReport.reported_user.email && (
                          <div className="text-[10px] text-gray-400 font-semibold">{detailedReport.reported_user.email}</div>
                        )}
                        <div className="flex gap-2">
                          {detailedReport.reported_user.id ? (
                            <>
                              <Link 
                                to={`/profile/${detailedReport.reported_user.username}`} 
                                target="_blank"
                                className="px-3 py-1 bg-primary text-white rounded-lg font-bold text-[10px] hover:bg-primary/90 transition inline-flex items-center gap-1"
                              >
                                Visit Profile
                              </Link>
                              {detailedReport.reported_user.is_blocked ? (
                                <span className="text-[10px] font-bold text-red-600 self-center">(User Currently Suspended)</span>
                              ) : (
                                <span className="text-[10px] font-bold text-green-600 self-center">(User Currently Active)</span>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] font-bold text-red-600 self-center">(User account has been permanently deleted)</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-400 italic">No target metadata loaded.</div>
                    )}
                  </div>

                  {/* Moderation Edit fields */}
                  <div className="border-t border-border pt-4 space-y-4">
                    <h4 className="font-extrabold uppercase tracking-wider text-text text-[10px]">Moderation Decision Case Review</h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Set Case Status</span>
                        <select
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                          className="w-full bg-bg border border-border px-3 py-2 rounded-xl text-xs text-text focus:outline-none focus:border-primary font-bold"
                        >
                          <option value="pending">Pending</option>
                          <option value="under_review">Under Review</option>
                          <option value="resolved">Resolved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Internal Admin Notes</span>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Type internal moderation notes for other admins..."
                        rows="3"
                        className="w-full bg-bg border border-border px-3.5 py-2.5 rounded-xl text-xs text-text focus:outline-none focus:border-primary font-semibold"
                      />
                    </div>

                    <button
                      onClick={() => handleSaveChanges('')}
                      disabled={submittingChanges}
                      className="w-full py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md shadow-green-600/10"
                    >
                      {submittingChanges ? 'Saving Case...' : 'Save Decision & Notes'}
                    </button>
                  </div>

                  {/* Direct Moderation Actions List */}
                  {detailedReport && (
                    <div className="border-t border-border pt-4 space-y-3">
                      <h4 className="font-extrabold uppercase tracking-wider text-red-500 text-[10px]">Moderation Actions (SQLite & MongoDB)</h4>
                      
                      <div className="grid grid-cols-2 gap-2.5">
                        
                        {/* Post Actions */}
                        {detailedReport.reported_post && detailedReport.reported_post.id && (
                          <>
                            {detailedReport.reported_post.is_blocked ? (
                              <button
                                onClick={() => handleSaveChanges('restore_post')}
                                disabled={submittingChanges}
                                className="py-2.5 border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 rounded-xl font-bold transition"
                              >
                                Restore Post
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSaveChanges('hide_post')}
                                disabled={submittingChanges}
                                className="py-2.5 border border-yellow-200 text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded-xl font-bold transition"
                              >
                                Block/Hide Post
                              </button>
                            )}

                            <button
                              onClick={() => {
                                if (window.confirm("Permanently delete post #" + detailedReport.reported_post.id + "? This is irreversible.")) {
                                  handleSaveChanges('delete_post');
                                }
                              }}
                              disabled={submittingChanges}
                              className="py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold transition flex items-center justify-center gap-1.5 border border-red-200"
                            >
                              <FiTrash2 /> Delete Post
                            </button>
                          </>
                        )}

                        {/* User Actions */}
                        {detailedReport.reported_user && detailedReport.reported_user.id && (
                          <>
                            {detailedReport.reported_user.is_blocked ? (
                              <button
                                onClick={() => handleSaveChanges('unsuspend_user')}
                                disabled={submittingChanges}
                                className="py-2.5 border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 rounded-xl font-bold transition col-span-1"
                              >
                                Unsuspend User
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSaveChanges('suspend_user')}
                                disabled={submittingChanges}
                                className="py-2.5 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-xl font-bold transition col-span-1"
                              >
                                Suspend/Ban User
                              </button>
                            )}

                            <button
                              onClick={() => {
                                if (window.confirm("Permanently delete student account @" + detailedReport.reported_user.username + "? This is irreversible.")) {
                                  handleSaveChanges('delete_user');
                                }
                              }}
                              disabled={submittingChanges}
                              className="py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold transition flex items-center justify-center gap-1.5 border border-red-200"
                            >
                              <FiTrash2 /> Delete User
                            </button>
                          </>
                        )}

                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>

            <div className="border-t border-border pt-4 mt-6 flex justify-end">
              <button
                onClick={() => { setActiveReportId(null); setDetailedReport(null); }}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition shadow"
              >
                Close Drawer
              </button>
            </div>

          </div>
        </div>
      )}

    </AdminLayout>
  );
};

export default Reports;
