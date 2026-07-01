import React, { useEffect, useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { adminAPI } from '../services/api';
import { FiVolume2, FiSend } from 'react-icons/fi';

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getAnnouncements();
      setAnnouncements(res.data);
    } catch (err) {
      setError("Failed to load announcements.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim() || !content.trim()) {
      setError("Title and content are required.");
      return;
    }

    setSubmitLoading(true);
    try {
      const res = await adminAPI.createAnnouncement({ title, content });
      setAnnouncements(prev => [res.data.announcement, ...prev]);
      setSuccess("Announcement created successfully! Students will be notified.");
      setTitle('');
      setContent('');
    } catch (err) {
      setError("Failed to post announcement.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form panel */}
        <div className="lg:col-span-1 bg-card border border-border p-6 rounded-2xl shadow-sm h-fit">
          <h3 className="font-bold text-sm text-text mb-4 flex items-center gap-1.5">
            <FiVolume2 className="text-primary" /> Publish Announcement
          </h3>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-xl mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-2 rounded-xl mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Announcement Title
              </label>
              <input
                type="text"
                placeholder="Important Exam Update..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Content Details
              </label>
              <textarea
                rows="4"
                placeholder="Write the full announcement announcement..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={submitLoading}
              className="w-full py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              <FiSend /> {submitLoading ? 'Sending...' : 'Send Bulletin'}
            </button>
          </form>
        </div>

        {/* List panel */}
        <div className="lg:col-span-2 bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h3 className="font-bold text-sm text-text mb-4">Announcement Archive</h3>
          
          {loading ? (
            <div className="py-12 text-center text-gray-500 flex flex-col items-center">
              <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-2" />
              <span className="text-xs">Loading archives...</span>
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {announcements.map((ann) => (
                <div key={ann.id} className="p-4 bg-bg/40 rounded-2xl border border-border space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-text">{ann.title}</span>
                    <span className="text-[10px] text-gray-400">
                      {ann.created_at ? new Date(ann.created_at).toLocaleString() : ''}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                </div>
              ))}
              {announcements.length === 0 && (
                <p className="text-xs text-gray-400 italic text-center py-6">No announcements posted yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Announcements;
