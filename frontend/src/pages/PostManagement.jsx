import React, { useEffect, useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { adminAPI } from '../services/api';
import { 
  FiTrash2, FiEye, FiEyeOff, FiSearch, FiFilter, 
  FiDownload, FiFileText, FiChevronLeft, FiChevronRight, FiGrid 
} from 'react-icons/fi';

const PostManagement = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search, Filters, Sorting, Pagination
  const [searchVal, setSearchVal] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('-created_at');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadPosts();
  }, [page, statusFilter, sortBy]);

  const loadPosts = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        page_size: 15,
        sort_by: sortBy
      };
      if (searchVal.trim()) params.q = searchVal.trim();
      if (statusFilter) params.status = statusFilter;

      const res = await adminAPI.getPosts(params);
      setPosts(res.data.results);
      setTotalCount(res.data.total_count);
      setTotalPages(Math.ceil(res.data.total_count / 15) || 1);
    } catch (err) {
      setError("Failed to load posts database.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadPosts();
  };

  const handleToggleBlock = async (id) => {
    setError('');
    setSuccess('');
    try {
      const res = await adminAPI.toggleBlockPost(id);
      setPosts(prev => 
        prev.map(p => p.id === String(id) ? { ...p, is_blocked: res.data.is_blocked } : p)
      );
      setSuccess(res.data.message);
    } catch (err) {
      setError("Failed to toggle block status.");
    }
  };

  const handleDeletePost = async (id) => {
    if (window.confirm("Are you sure you want to permanently delete this post?")) {
      setError('');
      setSuccess('');
      try {
        const res = await adminAPI.deletePost(id);
        setPosts(prev => prev.filter(p => p.id !== String(id)));
        setSuccess(res.data.message);
        setPage(1);
        loadPosts();
      } catch (err) {
        setError("Failed to delete post.");
      }
    }
  };

  const handleExportCSV = () => {
    const headers = ["Post ID", "Author", "Author Email", "Caption", "Published Date", "Likes", "Comments", "Shares", "Status"];
    const rows = posts.map(p => [
      p.id,
      p.username,
      p.email,
      (p.caption || '').replace(/"/g, '""'),
      p.created_at ? new Date(p.created_at).toLocaleDateString() : '',
      p.likes_count,
      p.comments_count,
      p.share_count || 0,
      p.is_blocked ? 'Blocked' : 'Active'
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "mits_posts_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>MITS News - Articles Directory Export</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; }
            h1 { font-size: 20px; font-weight: 800; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.05em; color: #4f46e5; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
            th { background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-weight: bold; color: #475569; text-align: left; padding: 12px 10px; text-transform: uppercase; }
            td { border-bottom: 1px solid #f1f5f9; padding: 10px; color: #334155; }
            .badge { display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 9px; font-weight: bold; text-transform: uppercase; }
            .badge-active { background: #dcfce7; color: #15803d; }
            .badge-blocked { background: #fee2e2; color: #b91c1c; }
            .footer { margin-top: 30px; font-size: 9px; text-align: center; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 15px; }
          </style>
        </head>
        <body>
          <h1>Articles Directories Summary (${new Date().toLocaleDateString()})</h1>
          <table>
            <thead>
              <tr>
                <th>Author</th>
                <th>Caption</th>
                <th>Likes</th>
                <th>Comments</th>
                <th>Shares</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${posts.map(p => `
                <tr>
                  <td>@${p.username}</td>
                  <td>${p.caption || 'No Caption'}</td>
                  <td>${p.likes_count}</td>
                  <td>${p.comments_count}</td>
                  <td>${p.share_count || 0}</td>
                  <td>
                    <span class="badge badge-${p.is_blocked ? 'blocked' : 'active'}">
                      ${p.is_blocked ? 'blocked' : 'active'}
                    </span>
                  </td>
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Filters and search box */}
        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-grow">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Search by author, caption, content text..."
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
                  setStatusFilter('');
                  setSortBy('-created_at');
                  setPage(1);
                  setTimeout(() => loadPosts(), 100);
                }}
                className="px-3.5 py-2 border border-border text-gray-500 hover:bg-bg rounded-xl text-xs font-bold transition"
              >
                Reset
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-border/60 pt-3">
            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1"><FiFilter /> Moderation Status</span>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full bg-bg border border-border px-3 py-2 rounded-xl text-xs text-text focus:outline-none focus:border-primary font-semibold"
              >
                <option value="">All Articles</option>
                <option value="active">Active/Visible Articles</option>
                <option value="blocked">Blocked/Hidden Articles</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1"><FiGrid /> Sort By</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-bg border border-border px-3 py-2 rounded-xl text-xs text-text focus:outline-none focus:border-primary font-semibold"
              >
                <option value="-created_at">Publish Date: Newest</option>
                <option value="created_at">Publish Date: Oldest</option>
                <option value="-likes_count">Most Liked</option>
                <option value="-comments_count">Most Commented</option>
                <option value="-share_count">Most Shared</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-border/60 pt-3">
            <span className="text-[10px] text-gray-400 font-bold">Total: {totalCount} articles published</span>
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

        {/* Directory Table */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-gray-500 flex flex-col items-center">
              <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-2" />
              <span className="text-xs">Loading campus articles...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-bg/40">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Author</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Caption/Text</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Created Date</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Engagements</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border/60 text-xs text-text">
                  {posts.map((p) => (
                    <tr key={p.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold block">@{p.username}</span>
                        <span className="text-[10px] text-gray-400">{p.email}</span>
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate">
                        <span className="font-semibold block truncate">{p.caption || 'No Caption'}</span>
                        <span className="text-[10px] text-gray-500 truncate block">{p.text}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-400 font-semibold">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-500">
                        {p.likes_count} likes • {p.comments_count} comments • {p.share_count || 0} shares
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {p.is_blocked ? (
                          <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 w-fit">
                            <FiEyeOff /> Blocked
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 w-fit">
                            <FiEye /> Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <button
                          onClick={() => handleToggleBlock(p.id)}
                          className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 inline-flex ${
                            p.is_blocked 
                              ? 'bg-green-100 hover:bg-green-200 text-green-700' 
                              : 'bg-red-50 hover:bg-red-100 text-red-600'
                          }`}
                        >
                          {p.is_blocked ? <><FiEye /> Unblock</> : <><FiEyeOff /> Block</>}
                        </button>
                        <button
                          onClick={() => handleDeletePost(p.id)}
                          className="p-2 bg-gray-50 hover:bg-red-500 hover:text-white text-gray-500 rounded-xl transition inline-flex"
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {posts.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-6 text-gray-400 italic">No articles found matching filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination controls */}
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
    </AdminLayout>
  );
};

export default PostManagement;
