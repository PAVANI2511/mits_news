import React, { useEffect, useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { adminAPI, getMediaUrl } from '../services/api';
import { FiTrash2, FiUserCheck, FiUserX, FiLock, FiUnlock } from 'react-icons/fi';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getUsers();
      setUsers(res.data);
    } catch (err) {
      setError("Failed to load user directories.");
    } finally {
      setLoading(false);
    }
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
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || "Failed to delete user account.");
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

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-xs px-4 py-2.5 rounded-xl">
              {success}
            </div>
          )}

          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-12 text-center text-gray-500 flex flex-col items-center">
                <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-2" />
                <span className="text-xs">Loading student directories...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-bg/40">
                    <tr>
                      <th className="px-6 py-4.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-4.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-4.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Department & Year</th>
                      <th className="px-6 py-4.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border/60 text-xs text-text">
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td className="px-6 py-4 whitespace-nowrap flex items-center gap-3">
                          <img
                            src={getMediaUrl(u.profile_pic) || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23a0aec0"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'}
                            alt={u.username}
                            className="h-8 w-8 rounded-full object-cover border border-border"
                          />
                          <div>
                            <span className="font-bold block text-text">{u.name}</span>
                            <span className="text-[10px] text-gray-400">@{u.username}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-500">
                          {u.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-primary">
                          {u.department ? `${u.department} • ${u.year}` : 'N/A'}
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
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-6 text-gray-400 italic">No student profiles registered.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-card border border-border p-6 rounded-2xl max-w-sm w-full mx-4 shadow-xl space-y-4">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-extrabold text-text">Delete Account?</h3>
                <p className="text-xs text-gray-500">
                  Are you sure you want to permanently delete student account <span className="font-bold text-red-500">@{deleteTarget.username}</span>? This action is irreversible.
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
