import React, { useEffect, useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { adminAPI, commentsAPI } from '../services/api';
import { 
  FiTrash2, FiSearch, FiCalendar, FiFilter, FiActivity, 
  FiCheckCircle, FiXCircle, FiRefreshCw, FiEdit3, FiEye, 
  FiCornerDownRight, FiHeart, FiAlertTriangle 
} from 'react-icons/fi';

const CommentManagement = () => {
  const [comments, setComments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters state
  const [searchUser, setSearchUser] = useState('');
  const [searchPost, setSearchPost] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterReported, setFilterReported] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  // Modals state
  const [viewingComment, setViewingComment] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, permanent: boolean }

  useEffect(() => {
    loadData();
  }, [searchUser, searchPost, filterStatus, filterReported, filterDate]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch Comments
      const params = {};
      if (searchUser.trim()) params.user = searchUser.trim();
      if (searchPost.trim()) params.post = searchPost.trim();
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterReported === 'reported') params.reported = 'true';
      if (filterDate) params.date = filterDate;

      const commentsRes = await adminAPI.getComments(params);
      setComments(commentsRes.data);

      // 2. Fetch Stats
      const statsRes = await adminAPI.getStats();
      setStats(statsRes.data.comments);
    } catch (err) {
      setError("Failed to fetch comment list or statistics.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditComment = async () => {
    if (!editContent.trim() || !editingComment) return;
    setError('');
    setSuccess('');
    try {
      const res = await commentsAPI.update(editingComment.id, editContent);
      setComments(prev => 
        prev.map(c => c.id === editingComment.id ? { ...c, content: res.data.content, is_edited: true, updated_at: res.data.updated_at } : c)
      );
      setSuccess("Comment updated successfully.");
      setEditingComment(null);
      setEditContent('');
    } catch (err) {
      setError("Failed to update comment.");
    }
  };

  const handleSoftDelete = async (id) => {
    setError('');
    setSuccess('');
    try {
      const res = await commentsAPI.delete(id);
      setComments(prev => 
        prev.map(c => c.id === id ? { ...c, is_deleted: true, content: "This comment was deleted.", deleted_at: res.data.comment.deleted_at } : c)
      );
      setSuccess("Comment soft-deleted successfully.");
    } catch (err) {
      setError("Failed to soft-delete comment.");
    }
  };

  const handleRestore = async (id) => {
    setError('');
    setSuccess('');
    try {
      const res = await commentsAPI.restore(id);
      setComments(prev => 
        prev.map(c => c.id === id ? { ...c, is_deleted: false, content: res.data.content, deleted_at: null } : c)
      );
      setSuccess("Comment restored successfully.");
    } catch (err) {
      setError("Failed to restore comment.");
    }
  };

  const handlePermanentDelete = async (id) => {
    setError('');
    setSuccess('');
    try {
      await commentsAPI.permanentDelete(id);
      setComments(prev => prev.filter(c => c.id !== id));
      setSuccess("Comment permanently deleted.");
      setDeleteTarget(null);
    } catch (err) {
      setError("Failed to permanently delete comment.");
    }
  };

  const handleResetFilters = () => {
    setSearchUser('');
    setSearchPost('');
    setFilterStatus('all');
    setFilterReported('all');
    setFilterDate('');
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

        {/* Statistics grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-card border border-border p-4 rounded-xl shadow-sm text-center">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Total Comments</span>
              <h3 className="text-lg font-black text-text mt-1">{stats.total}</h3>
            </div>
            <div className="bg-card border border-border p-4 rounded-xl shadow-sm text-center">
              <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider block">Active Comments</span>
              <h3 className="text-lg font-black text-green-600 mt-1">{stats.active}</h3>
            </div>
            <div className="bg-card border border-border p-4 rounded-xl shadow-sm text-center">
              <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider block">Deleted (Soft)</span>
              <h3 className="text-lg font-black text-red-600 mt-1">{stats.deleted}</h3>
            </div>
            <div className="bg-card border border-border p-4 rounded-xl shadow-sm text-center">
              <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider block">Edited Comments</span>
              <h3 className="text-lg font-black text-blue-600 mt-1">{stats.edited}</h3>
            </div>
            <div className="bg-card border border-border p-4 rounded-xl shadow-sm text-center">
              <span className="text-[10px] text-purple-500 font-bold uppercase tracking-wider block">Replies</span>
              <h3 className="text-lg font-black text-purple-600 mt-1">{stats.replies}</h3>
            </div>
            <div className="bg-card border border-border p-4 rounded-xl shadow-sm text-center">
              <span className="text-[10px] text-pink-500 font-bold uppercase tracking-wider block">Total Likes</span>
              <h3 className="text-lg font-black text-pink-600 mt-1">{stats.likes}</h3>
            </div>
          </div>
        )}

        {/* Searching and Filtering panel */}
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <FiFilter /> Filters & Searches
            </h3>
            <button 
              onClick={handleResetFilters}
              className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
            >
              Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Search by User */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-3.5 text-gray-400 text-xs" />
              <input
                type="text"
                placeholder="Search user..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2.5 text-xs rounded-xl bg-bg border border-border focus:outline-none focus:ring-1 focus:ring-primary text-text"
              />
            </div>

            {/* Search by Post ID */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-3.5 text-gray-400 text-xs" />
              <input
                type="text"
                placeholder="Search Post ID..."
                value={searchPost}
                onChange={(e) => setSearchPost(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2.5 text-xs rounded-xl bg-bg border border-border focus:outline-none focus:ring-1 focus:ring-primary text-text"
              />
            </div>

            {/* Select Status */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-bg border border-border focus:outline-none focus:ring-1 focus:ring-primary text-text font-semibold"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Comments</option>
                <option value="deleted">Deleted (Soft)</option>
                <option value="edited">Edited Only</option>
                <option value="hidden">Hidden Only</option>
                <option value="pinned">Pinned Only</option>
              </select>
            </div>

            {/* Select Reported status */}
            <div>
              <select
                value={filterReported}
                onChange={(e) => setFilterReported(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-bg border border-border focus:outline-none focus:ring-1 focus:ring-primary text-text font-semibold"
              >
                <option value="all">All Comments</option>
                <option value="reported">Reported Comments Only</option>
              </select>
            </div>

            {/* Select Date */}
            <div className="relative">
              <FiCalendar className="absolute left-3 top-3.5 text-gray-400 text-xs" />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2 text-xs rounded-xl bg-bg border border-border focus:outline-none focus:ring-1 focus:ring-primary text-text font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Comments Table */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-24 text-center text-gray-500 flex flex-col items-center">
              <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-2" />
              <span className="text-xs">Loading comment archives...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-bg/40">
                  <tr>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Comment ID</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Post</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Comment text</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Parent ID</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Created / Updated</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Likes</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-4 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border/60 text-xs text-text">
                  {comments.map((c) => (
                    <tr key={c.id} className={c.reports_count > 0 ? 'bg-red-500/5' : ''}>
                      <td className="px-5 py-4 whitespace-nowrap font-bold text-gray-400">
                        #{c.id}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap max-w-[120px] truncate font-semibold text-primary">
                        ID: {c.post_id} <span className="text-[10px] text-gray-400 block font-normal truncate">{c.post_caption}</span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap font-bold text-text">
                        {c.user_name}
                        <span className="text-[10px] text-gray-400 block font-normal">@{c.username}</span>
                      </td>
                      <td className="px-5 py-4 max-w-[200px] truncate font-medium">
                        {c.content}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-gray-400 font-semibold">
                        {c.parent_comment_id ? (
                          <span className="flex items-center gap-0.5">
                            <FiCornerDownRight className="text-[10px]" /> #{c.parent_comment_id}
                          </span>
                        ) : 'None'}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-[10px] text-gray-400 font-medium leading-normal">
                        C: {new Date(c.created_at).toLocaleDateString()}
                        {c.updated_at && <span className="block">U: {new Date(c.updated_at).toLocaleDateString()}</span>}
                        {c.is_deleted && c.deleted_at && <span className="block text-red-500 font-bold">D: {new Date(c.deleted_at).toLocaleDateString()}</span>}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap font-bold text-pink-500">
                        <span className="flex items-center gap-1"><FiHeart className="fill-current" /> {c.likes_count}</span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {c.is_deleted ? (
                          <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-extrabold text-[9px] uppercase tracking-wider flex items-center gap-0.5 w-fit">
                            <FiXCircle /> Soft Deleted
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 font-extrabold text-[9px] uppercase tracking-wider flex items-center gap-0.5 w-fit">
                            <FiCheckCircle /> Active
                          </span>
                        )}
                        {c.is_pinned && (
                          <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 font-extrabold text-[9px] uppercase tracking-wider flex items-center gap-0.5 w-fit mt-1">
                            📌 Pinned
                          </span>
                        )}
                        {c.is_hidden && (
                          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-extrabold text-[9px] uppercase tracking-wider flex items-center gap-0.5 w-fit mt-1">
                            🔒 Hidden
                          </span>
                        )}
                        {c.reports_count > 0 && (
                          <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 font-extrabold text-[9px] uppercase tracking-wider flex items-center gap-0.5 w-fit mt-1">
                            <FiAlertTriangle /> {c.reports_count} Reports
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right space-x-1.5">
                        <button
                          onClick={() => setViewingComment(c)}
                          className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-text rounded-lg transition inline-flex"
                          title="View Details"
                        >
                          <FiEye className="text-xs" />
                        </button>

                        <button
                          onClick={() => {
                            setEditingComment(c);
                            setEditContent(c.content);
                          }}
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition inline-flex"
                          title="Edit Content"
                        >
                          <FiEdit3 className="text-xs" />
                        </button>

                        {c.is_deleted ? (
                          <button
                            onClick={() => handleRestore(c.id)}
                            className="p-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition inline-flex"
                            title="Restore Comment"
                          >
                            <FiRefreshCw className="text-xs animate-spin-reverse" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSoftDelete(c.id)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition inline-flex"
                            title="Soft Delete"
                          >
                            <FiTrash2 className="text-xs" />
                          </button>
                        )}

                        <button
                          onClick={() => setDeleteTarget(c.id)}
                          className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition inline-flex"
                          title="Permanent Delete"
                        >
                          <FiTrash2 className="text-xs font-bold" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {comments.length === 0 && (
                    <tr>
                      <td colSpan="9" className="text-center py-10 text-gray-400 italic">No comment records matched the query.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* View Comment Modal */}
      {viewingComment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-lg w-full mx-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h3 className="text-sm font-extrabold text-text">Comment Detail Details</h3>
              <button onClick={() => setViewingComment(null)} className="text-gray-400 hover:text-text"><FiXCircle /></button>
            </div>
            <div className="space-y-2 text-xs text-text">
              <div className="grid grid-cols-3 gap-1">
                <span className="font-bold text-gray-400">Comment ID:</span>
                <span className="col-span-2">#{viewingComment.id}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="font-bold text-gray-400">Post Link ID:</span>
                <span className="col-span-2">#{viewingComment.post_id} ({viewingComment.post_caption})</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="font-bold text-gray-400">User:</span>
                <span className="col-span-2">@{viewingComment.username} ({viewingComment.user_name})</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="font-bold text-gray-400">Parent Comment ID:</span>
                <span className="col-span-2">{viewingComment.parent_comment_id ? `#${viewingComment.parent_comment_id}` : 'None'}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="font-bold text-gray-400">Created Time:</span>
                <span className="col-span-2">{new Date(viewingComment.created_at).toLocaleString()}</span>
              </div>
              {viewingComment.updated_at && (
                <div className="grid grid-cols-3 gap-1">
                  <span className="font-bold text-gray-400">Updated Time:</span>
                  <span className="col-span-2">{new Date(viewingComment.updated_at).toLocaleString()}</span>
                </div>
              )}
              {viewingComment.is_deleted && viewingComment.deleted_at && (
                <div className="grid grid-cols-3 gap-1 text-red-500">
                  <span className="font-bold">Deleted Time:</span>
                  <span className="col-span-2">{new Date(viewingComment.deleted_at).toLocaleString()}</span>
                </div>
              )}
              <div className="grid grid-cols-3 gap-1">
                <span className="font-bold text-gray-400">Status:</span>
                <span className="col-span-2">{viewingComment.is_deleted ? 'Soft Deleted' : 'Active'}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="font-bold text-gray-400">Likes Counter:</span>
                <span className="col-span-2 font-bold text-pink-500">{viewingComment.likes_count} likes</span>
              </div>
              <div className="border-t border-border/60 pt-3 mt-2">
                <span className="font-bold text-gray-400 block mb-1">Comment Content:</span>
                <p className="bg-bg/60 p-3 rounded-lg border border-border font-medium whitespace-pre-wrap">{viewingComment.content}</p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingComment(null)}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold transition hover:bg-primary/90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Comment Modal */}
      {editingComment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full mx-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h3 className="text-sm font-extrabold text-text">Edit Comment #{editingComment.id}</h3>
              <button onClick={() => setEditingComment(null)} className="text-gray-400 hover:text-text"><FiXCircle /></button>
            </div>
            <div className="space-y-2">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Comment Content</span>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows="4"
                className="w-full p-3 text-xs rounded-xl bg-bg border border-border focus:outline-none focus:ring-1 focus:ring-primary text-text"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditingComment(null)}
                className="flex-1 py-2.5 bg-bg border border-border rounded-xl text-xs font-bold text-gray-500 hover:bg-border/40 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleEditComment}
                className="flex-1 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-sm w-full mx-4 shadow-xl space-y-4">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-extrabold text-text">Permanently Delete Comment?</h3>
              <p className="text-xs text-gray-500">
                Are you sure you want to <span className="font-bold text-red-500">permanently delete</span> Comment #{deleteTarget}? This will delete the comment record and all recursive replies. This is irreversible.
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
                onClick={() => handlePermanentDelete(deleteTarget)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/20 transition"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default CommentManagement;
