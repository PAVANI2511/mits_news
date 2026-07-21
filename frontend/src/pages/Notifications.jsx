import React, { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import MainLayout from '../layouts/MainLayout';
import Sidebar from '../components/Sidebar';
import NotificationItem from '../components/NotificationItem';
import { notificationsAPI } from '../services/api';
import { FiBell, FiCheckSquare } from 'react-icons/fi';

const Notifications = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await notificationsAPI.getList();
      setNotifications(res.data);
    } catch (_err) {
      setError("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/login';
    } else {
      loadNotifications();
    }
  }, [isAuthenticated, loadNotifications]);

  useEffect(() => {
    const handleWebSocketAlert = (e) => {
      const newNotif = e.detail;
      if (!newNotif) return;
      setNotifications(prev => prev.some(item => item.id === newNotif.id) ? prev : [newNotif, ...prev]);
    };
    window.addEventListener('new-websocket-notification', handleWebSocketAlert);
    return () => {
      window.removeEventListener('new-websocket-notification', handleWebSocketAlert);
    };
  }, []);

  if (!isAuthenticated) {
    return null;
  }



  const handleMarkRead = (id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  return (
    <MainLayout sidebar={<Sidebar />}>
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-text">Notifications</h2>
            <p className="text-xs text-gray-500 mt-1">Stay updated with activities on your college posts</p>
          </div>
          {notifications.some(n => !n.is_read) && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
            >
              <FiCheckSquare /> Mark all read
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2.5 rounded-xl mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-gray-500 flex flex-col items-center">
            <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-2" />
            <span className="text-xs">Loading alerts...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <NotificationItem 
                key={n.id} 
                notification={n} 
                onMarkRead={handleMarkRead} 
              />
            ))}
            {notifications.length === 0 && (
              <div className="py-12 text-center text-gray-500 flex flex-col items-center justify-center">
                <FiBell className="text-4xl text-gray-400 mb-2" />
                <h3 className="font-bold text-text text-sm">All quiet here!</h3>
                <p className="text-xs text-gray-500 mt-1">You will receive notifications here for likes, comments, and followers.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Notifications;
