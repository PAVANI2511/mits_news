import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHeart, FiMessageSquare, FiUserCheck, FiBell, FiAlertCircle, FiAtSign, FiFileText, FiTag } from 'react-icons/fi';
import { notificationsAPI, getMediaUrl } from '../services/api';

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23a0aec0"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';

const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return date.toLocaleDateString();
};

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
    // Direct navigation to post or profile
    if (notification.post_id) {
      navigate(`/posts/${notification.post_id}`);
    } else if (notification.type === 'follow' && notification.sender_username) {
      navigate(`/profile/${notification.sender_username}`);
    }
    
    if (!notification.is_read) {
      handleMarkRead({ stopPropagation: () => {} });
    }
  };

  const icons = {
    like: <FiHeart className="text-red-500 fill-current" />,
    comment: <FiMessageSquare className="text-blue-500" />,
    reply: <FiMessageSquare className="text-emerald-500" />,
    follow: <FiUserCheck className="text-purple-500" />,
    new_post: <FiFileText className="text-indigo-500" />,
    announcement: <FiBell className="text-amber-500" />,
    admin: <FiAlertCircle className="text-red-500 font-bold" />,
    mention: <FiAtSign className="text-pink-500 font-bold" />
  };

  const icon = icons[notification.type] || <FiBell className="text-primary" />;

  const senderName = notification.sender_name || notification.sender_username || 'System';
  const profilePicUrl = notification.sender_profile_pic ? getMediaUrl(notification.sender_profile_pic) : defaultAvatar;

  return (
    <div
      onClick={handleContainerClick}
      className={`p-4 rounded-2xl border flex gap-3.5 cursor-pointer items-start transition-all hover:shadow-md ${
        notification.is_read 
          ? 'bg-card border-border hover:bg-bg/40' 
          : 'bg-primary/5 border-primary/25 hover:bg-primary/10 shadow-sm ring-1 ring-primary/10'
      }`}
    >
      {/* Sender Profile Picture */}
      <div className="relative shrink-0 mt-0.5">
        <img
          src={profilePicUrl}
          alt={senderName}
          className="w-10 h-10 rounded-full object-cover border border-border shadow-sm bg-card"
          onError={(e) => { e.target.src = defaultAvatar; }}
        />
        <div className="absolute -bottom-1 -right-1 p-1 bg-card rounded-full border border-border shadow-xs text-xs">
          {icon}
        </div>
      </div>

      {/* Main Alert Message & Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-text truncate">
            👤 {senderName}
          </h4>
          <span className="text-[10px] font-medium text-gray-400 shrink-0">
            {formatTimeAgo(notification.created_at)}
          </span>
        </div>

        <p className="text-xs text-text/90 mt-1 leading-relaxed font-normal">
          {notification.message}
        </p>

        {/* Post category badge if applicable */}
        {notification.category_name && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold">
              <FiTag className="text-[9px]" /> {notification.category_name}
            </span>
          </div>
        )}
      </div>

      {/* Read Indicator / Button */}
      {!notification.is_read && (
        <button
          onClick={handleMarkRead}
          className="text-[10px] font-bold text-primary hover:underline shrink-0 self-center px-2 py-1 rounded-lg hover:bg-primary/10 transition"
        >
          Mark Read
        </button>
      )}
    </div>
  );
};

export default NotificationItem;
