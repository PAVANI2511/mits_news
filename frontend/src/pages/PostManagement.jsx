import React, { useEffect, useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { adminAPI } from '../services/api';
import { FiTrash2, FiEye, FiEyeOff } from 'react-icons/fi';

const PostManagement = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getPosts();
      setPosts(res.data);
    } catch (err) {
      setError("Failed to load posts database.");
    } finally {
      setLoading(false);
    }
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
      } catch (err) {
        setError("Failed to delete post.");
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

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-xs px-4 py-2.5 rounded-xl">
            {success}
          </div>
        )}

        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-gray-500 flex flex-col items-center">
              <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-2" />
              <span className="text-xs">Loading campus articles...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-bg/40">
                  <tr>
                    <th className="px-6 py-4.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Author</th>
                    <th className="px-6 py-4.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Caption/Text</th>
                    <th className="px-6 py-4.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Created Date</th>
                    <th className="px-6 py-4.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Stats</th>
                    <th className="px-6 py-4.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border/60 text-xs text-text">
                  {posts.map((p) => (
                    <tr key={p.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold block">{p.username}</span>
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
                        {p.likes_count} likes • {p.comments_count} comments
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {p.is_blocked ? (
                          <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-bold text-[9px] uppercase tracking-wider">Blocked</span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-bold text-[9px] uppercase tracking-wider">Active</span>
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
                      <td colSpan="6" className="text-center py-6 text-gray-400 italic">No posts published.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default PostManagement;
