import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHeart, FiMessageSquare, FiUserCheck, FiBell, FiAlertCircle } from 'react-icons/fi';
import { notificationsAPI } from '../services/api';

const NotificationItem = ({ notification, onMarkRead }) => {
  const navigate = useNavigate();

  const handleMarkRead = async (e) => {
    e.stopPropagation();
    if (notification.is_read) return;
    try {
      await notificationsAPI.markRead(notification.id);
      if (onMarkRead) onMarkRead(notification.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleContainerClick = () => {
    // Navigate based on notification type
    if (notification.type === 'follow') {
      navigate(`/profile/${notification.sender_username}`);
    } else if (notification.post_id) {
      navigate(`/posts/${notification.post_id}`);
    }
    // Also mark as read
    if (!notification.is_read) {
      handleMarkRead({ stopPropagation: () => {} });
    }
  };

  const icons = {
    like: <FiHeart className="text-red-500 fill-current" />,
    comment: <FiMessageSquare className="text-blue-500" />,
    reply: <FiMessageSquare className="text-green-500" />,
    follow: <FiUserCheck className="text-purple-500" />,
    announcement: <FiBell className="text-yellow-500" />,
    admin: <FiAlertCircle className="text-red-500 font-bold" />
  };

  const icon = icons[notification.type] || <FiBell className="text-primary" />;

  return (
    <div
      onClick={handleContainerClick}
      className={`p-4 rounded-xl border flex gap-3 cursor-pointer items-start transition-all ${
        notification.is_read 
          ? 'bg-card border-border hover:bg-bg/50' 
          : 'bg-primary/5 border-primary/20 hover:bg-primary/10 shadow-sm'
      }`}
    >
      <div className="p-2 bg-card rounded-full border border-border shadow-sm shrink-0">
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs text-text leading-relaxed">
          {notification.message}
        </p>
        <span className="text-[10px] text-gray-400 mt-1 block">
          {notification.created_at ? new Date(notification.created_at).toLocaleString() : ''}
        </span>
      </div>

      {!notification.is_read && (
        <button
          onClick={handleMarkRead}
          className="text-[10px] font-bold text-primary hover:underline shrink-0"
        >
          Mark Read
        </button>
      )}
    </div>
  );
};

export default NotificationItem;
