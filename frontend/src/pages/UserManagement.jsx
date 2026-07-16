import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import { adminAPI, getMediaUrl } from '../services/api';
import { 
  FiTrash2, FiUserCheck, FiUserX, FiLock, FiUnlock, 
  FiSearch, FiFilter, FiDownload, FiFileText, 
  FiChevronLeft, FiChevronRight, FiGrid 
} from 'react-icons/fi';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Search, Filters, Sorting, Pagination
  const [searchVal, setSearchVal] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortBy, setSortBy] = useState('-date_joined');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadUsers();
  }, [page, statusFilter, roleFilter, sortBy]);

  const loadUsers = async () => {
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
      if (roleFilter) params.role = roleFilter;

      const res = await adminAPI.getUsers(params);
      setUsers(res.data.results);
      setTotalCount(res.data.total_count);
      setTotalPages(Math.ceil(res.data.total_count / 15) || 1);
    } catch (err) {
      setError("Failed to load user directories.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleToggleBlock = async (id) => {
    setError('');
    setSuccess('');
    try {
      const res = await adminAPI.toggleBlockUser(id);
      setUsers(prev => 
        prev.map(u => u.id === String(id) ? { ...u, is_blocked: res.data.is_blocked } : u)
      );
      setSuccess(res.data.message);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to toggle user block status.");
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setDeleteTarget(null);
    setError('');
    setSuccess('');
    try {
      const res = await adminAPI.deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== String(id)));
      setSuccess(res.data?.message || "User deleted successfully.");
      setPage(1);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || "Failed to delete user account.");
    }
  };

  const handleExportCSV = () => {
    const headers = ["User ID", "Username", "Name", "Email", "Date Joined", "Role", "Status", "Department", "Year / Role"];
    const rows = users.map(u => [
      u.id,
      u.username,
      u.name,
      u.email,
      u.date_joined ? new Date(u.date_joined).toLocaleDateString() : '',
      u.is_staff ? 'Admin' : (u.role_type === 'teacher' ? 'Teacher' : 'Student'),
      u.is_blocked ? 'Blocked' : 'Active',
      u.department || '',
      u.role_type === 'teacher' ? (u.teacher_role || 'Teacher') : (u.year || '')
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "mits_users_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>MITS News - User Directory Export</title>
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
          <h1>User Directories Summary (${new Date().toLocaleDateString()})</h1>
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Year / Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td>@${u.username}</td>
                  <td>${u.name}</td>
                  <td>${u.email}</td>
                  <td>${u.department || 'N/A'}</td>
                  <td>${u.role_type === 'teacher' ? (u.teacher_role || 'Teacher') : (u.year || 'N/A')}</td>
                  <td>
                    <span class="badge badge-${u.is_blocked ? 'blocked' : 'active'}">
                      ${u.is_blocked ? 'blocked' : 'active'}
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
        {/* Filter controls */}
        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-grow">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Search username, name, email, department..."
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
                  setRoleFilter('');
                  setSortBy('-date_joined');
                  setPage(1);
                  setTimeout(() => loadUsers(), 100);
                }}
                className="px-3.5 py-2 border border-border text-gray-500 hover:bg-bg rounded-xl text-xs font-bold transition"
              >
                Reset
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-border/60 pt-3">
            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1"><FiFilter /> Account Status</span>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full bg-bg border border-border px-3 py-2 rounded-xl text-xs text-text focus:outline-none focus:border-primary font-semibold"
              >
                <option value="">All Accounts</option>
                <option value="active">Active Accounts</option>
                <option value="blocked">Suspended Accounts</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1"><FiFilter /> Role Type</span>
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                className="w-full bg-bg border border-border px-3 py-2 rounded-xl text-xs text-text focus:outline-none focus:border-primary font-semibold"
              >
                <option value="">All Roles</option>
                <option value="student">Student Profile</option>
                <option value="teacher">Teacher Profile</option>
                <option value="admin">Administrator Profile</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1"><FiGrid /> Sort By</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-bg border border-border px-3 py-2 rounded-xl text-xs text-text focus:outline-none focus:border-primary font-semibold"
              >
                <option value="-date_joined">Registration Date: Newest</option>
                <option value="date_joined">Registration Date: Oldest</option>
                <option value="username">Username</option>
                <option value="first_name">First Name</option>
                <option value="email">Email</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-border/60 pt-3">
            <span className="text-[10px] text-gray-400 font-bold">Total: {totalCount} users registered</span>
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
              <span className="text-xs">Loading user directories...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-bg/40">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Department & Year/Role</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border/60 text-xs text-text">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link to={`/profile/${u.username}`} className="flex items-center gap-3 hover:opacity-80 transition">
                          <img
                            src={getMediaUrl(u.profile_pic) || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23a0aec0"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'}
                            alt={u.username}
                            className="h-8 w-8 rounded-full object-cover border border-border"
                          />
                          <div>
                            <span className="font-bold block text-text hover:text-primary transition">{u.name}</span>
                            <span className="text-[10px] text-gray-400 block">@{u.username}</span>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-500">
                        {u.email}
                      </td>
                      <td className="px-6 py-4 font-semibold text-primary max-w-[250px] whitespace-normal">
                        {u.department ? (
                          <div className="flex flex-col">
                            <span className="block leading-tight text-xs font-semibold">{u.department}</span>
                            <span className="block text-[10px] text-gray-400 font-bold tracking-wide uppercase mt-1">
                              {u.role_type === 'teacher' ? (u.teacher_role || 'Teacher') : u.year}
                            </span>
                          </div>
                        ) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-500 uppercase tracking-wide text-[10px]">
                        {u.is_staff ? 'Admin' : (u.role_type === 'teacher' ? 'Teacher' : 'Student')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.is_blocked ? (
                          <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 w-fit">
                            <FiLock /> Blocked
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 w-fit">
                            <FiUnlock /> Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        {!u.is_staff && (
                          <>
                            <button
                               onClick={() => handleToggleBlock(u.id)}
                              className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 inline-flex ${
                                u.is_blocked 
                                  ? 'bg-green-100 hover:bg-green-200 text-green-700' 
                                  : 'bg-red-50 hover:bg-red-100 text-red-600'
                              }`}
                            >
                              {u.is_blocked ? <><FiUnlock /> Unblock</> : <><FiLock /> Block</>}
                            </button>

                            <button
                              onClick={() => setDeleteTarget(u)}
                              className="p-2 bg-gray-50 hover:bg-red-500 hover:text-white text-gray-500 rounded-xl transition inline-flex"
                            >
                              <FiTrash2 />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-6 text-gray-400 italic">No user profiles found matching filters.</td>
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

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-sm w-full mx-4 shadow-xl space-y-4">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-extrabold text-text">Delete Account?</h3>
              <p className="text-xs text-gray-500">
                Are you sure you want to permanently delete user account <span className="font-bold text-red-500">@{deleteTarget.username}</span>? This action is irreversible.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-bg border border-border rounded-xl text-xs font-bold text-gray-500 hover:bg-border/40 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/20 transition"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default UserManagement;
