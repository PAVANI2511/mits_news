import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import { adminAPI } from '../services/api';
import { FiCheck, FiAlertCircle } from 'react-icons/fi';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getReports();
      setReports(res.data);
    } catch (err) {
      setError("Failed to load reports database.");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id) => {
    setError('');
    setSuccess('');
    try {
      const res = await adminAPI.resolveReport(id);
      setReports(prev => 
        prev.map(r => r.id === String(id) ? { ...r, status: 'resolved' } : r)
      );
      setSuccess(res.data.message);
    } catch (err) {
      setError("Failed to resolve report.");
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
              <span className="text-xs">Loading campus reports...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-bg/40">
                  <tr>
                    <th className="px-6 py-4.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Reporter</th>
                    <th className="px-6 py-4.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Reported target</th>
                    <th className="px-6 py-4.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Reason & Details</th>
                    <th className="px-6 py-4.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border/60 text-xs text-text">
                  {reports.map((r) => (
                    <tr key={r.id}>
                      <td className="px-6 py-4 whitespace-nowrap font-bold">
                        {r.reporter_username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {r.reported_post_id ? (
                          <Link to={`/posts/${r.reported_post_id}`} className="text-primary hover:underline font-semibold">
                            Post: {r.reported_post_id}
                          </Link>
                        ) : (
                          <Link to={`/profile/${r.reported_username}`} className="text-primary hover:underline font-semibold">
                            User: @{r.reported_username}
                          </Link>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <span className="font-bold block text-text">{r.reason}</span>
                        <span className="text-[10px] text-gray-500 block truncate">{r.details}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {r.status === 'pending' ? (
                          <span className="px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 w-fit">
                            <FiAlertCircle /> Pending
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 w-fit">
                            <FiCheck /> Resolved
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {r.status === 'pending' && (
                          <button
                            onClick={() => handleResolve(r.id)}
                            className="p-2.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl text-xs font-bold transition flex items-center gap-1 inline-flex"
                          >
                            <FiCheck /> Mark Resolved
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-6 text-gray-400 italic">No reports filed.</td>
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

export default Reports;
