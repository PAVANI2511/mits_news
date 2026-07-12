import React, { useEffect, useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { adminAPI } from '../services/api';
import { FiSearch, FiTrash2, FiUsers, FiInfo } from 'react-icons/fi';

const FollowManagement = () => {
  const [follows, setFollows] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadFollows();
  }, []);

  const loadFollows = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getFollows();
      setFollows(res.data);
    } catch (err) {
      setError("Failed to load follow relationships list.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFollow = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to remove this follow relationship?");
    if (!confirmDelete) return;

    setError('');
    setSuccess('');
    try {
      await adminAPI.deleteFollow(id);
      setFollows(prev => prev.filter(f => f.id !== id));
      setSuccess("Follow relationship removed successfully.");
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError("Failed to delete follow relationship.");
    }
  };

  const filteredFollows = follows.filter(f => {
    const query = searchQuery.toLowerCase();
    return (
      f.follower_username.toLowerCase().includes(query) ||
      f.follower_name.toLowerCase().includes(query) ||
      f.following_username.toLowerCase().includes(query) ||
      f.following_name.toLowerCase().includes(query)
    );
  });

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

        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary text-xl">
              <FiUsers />
            </div>
            <div>
              <h2 className="font-extrabold text-sm uppercase tracking-wider text-text">Follow Relationships</h2>
              <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Manage followers, follow links, and statistics</p>
            </div>
          </div>

          <div className="relative max-w-sm w-full">
            <input
              type="text"
              placeholder="Search by follower or following..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <FiSearch className="absolute left-3.5 top-3.5 text-gray-400 text-sm" />
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center text-gray-500 flex flex-col items-center">
            <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-2" />
            <span className="text-xs">Loading follow records...</span>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg/50 border-b border-border text-[10px] font-black text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Follower User</th>
                    <th className="px-6 py-4">Following User</th>
                    <th className="px-6 py-4">Created Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs text-text font-semibold">
                  {filteredFollows.map((row) => (
                    <tr key={row.id} className="hover:bg-bg/25 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-text">{row.follower_name}</div>
                        <div className="text-[10px] text-gray-400">@{row.follower_username}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-text">{row.following_name}</div>
                        <div className="text-[10px] text-gray-400">@{row.following_username}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-normal">
                        {row.created_at ? new Date(row.created_at).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRemoveFollow(row.id)}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition"
                          title="Remove follow relationship"
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredFollows.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-gray-500 italic">
                        <FiInfo className="mx-auto text-3xl text-gray-400 mb-2" />
                        No follow relationships found matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default FollowManagement;
