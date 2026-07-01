import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { authAPI } from '../services/api';
import { FiTrendingUp, FiUserPlus, FiBookOpen } from 'react-icons/fi';

const Sidebar = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (isAuthenticated) {
      // Fetch some user suggestions
      authAPI.searchUsers({ limit: 4 })
        .then((res) => {
          const filtered = res.data.filter(u => u.username !== user?.username).slice(0, 3);
          setSuggestions(filtered);
        })
        .catch((err) => console.error("Error loading suggestions:", err));
    }
  }, [isAuthenticated, user]);

  const trends = [
    { tag: 'MITS2026', count: 124 },
    { tag: 'CSE_Hackathon', count: 98 },
    { tag: 'CollegeFest', count: 72 },
    { tag: 'ExamVibes', count: 45 }
  ];

  return (
    <div className="space-y-6">
      {/* User Profile Card */}
      {isAuthenticated && user ? (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm p-4 text-center transition-colors">
          <div 
            className="h-16 w-full rounded-lg bg-cover bg-center"
            style={{ 
              backgroundImage: user.profile?.cover_photo 
                ? `url(${user.profile.cover_photo})`
                : 'linear-gradient(to right, var(--color-primary), var(--color-secondary))' 
            }}
          />
          <div className="-mt-8 flex justify-center">
            <img
              src={user.profile?.profile_pic || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23a0aec0"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'}
              alt={user.username}
              className="h-16 w-16 rounded-full border-4 border-card object-cover bg-card shadow"
            />
          </div>
          <h2 className="mt-2 font-bold text-lg text-text truncate">
            {user.profile?.name || user.username}
          </h2>
          <p className="text-xs text-gray-500 truncate">{user.email}</p>
          
          <div className="mt-1 flex justify-center gap-1.5 text-xs text-primary font-semibold">
            {user.profile?.department && <span>{user.profile.department}</span>}
            {user.profile?.year && <span>• {user.profile.year}</span>}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4">
            <div>
              <div className="text-sm font-extrabold text-text">{user.profile?.followers_count || 0}</div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Followers</div>
            </div>
            <div>
              <div className="text-sm font-extrabold text-text">{user.profile?.following_count || 0}</div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Following</div>
            </div>
          </div>

          <Link 
            to={`/profile/${user.username}`}
            className="mt-4 block w-full text-center py-2 bg-primary/10 text-primary rounded-xl text-sm font-medium hover:bg-primary/20 transition"
          >
            My Profile
          </Link>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm text-center">
          <FiBookOpen className="mx-auto text-4xl text-primary/80 mb-3" />
          <h2 className="font-bold text-lg text-text">Welcome Viewer!</h2>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Log in with your `@mits.ac.in` student email to interact with other students, publish articles, likes and saves.
          </p>
          <div className="flex flex-col gap-2">
            <Link to="/login" className="py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/95 shadow-sm transition">
              Log In
            </Link>
            <Link to="/register" className="py-2.5 border border-border text-text rounded-xl text-sm font-medium hover:bg-bg transition">
              Create Student Account
            </Link>
          </div>
        </div>
      )}

      {/* Suggested Follows */}
      {isAuthenticated && suggestions.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <h3 className="font-bold text-sm text-text mb-3 flex items-center gap-1.5">
            <FiUserPlus className="text-primary" /> Suggestions for You
          </h3>
          <div className="space-y-3">
            {suggestions.map((sug) => (
              <div key={sug.id} className="flex items-center justify-between">
                <div 
                  className="flex items-center gap-2 cursor-pointer truncate flex-1"
                  onClick={() => navigate(`/profile/${sug.username}`)}
                >
                  <img
                    src={sug.profile_pic || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23a0aec0"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'}
                    alt={sug.username}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                  <div className="truncate">
                    <div className="text-xs font-semibold text-text truncate">{sug.name}</div>
                    <div className="text-[10px] text-gray-500 truncate">@{sug.username}</div>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/profile/${sug.username}`)}
                  className="text-xs font-bold text-primary hover:text-primary/80 transition"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trending Hashtags */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
        <h3 className="font-bold text-sm text-text mb-3 flex items-center gap-1.5">
          <FiTrendingUp className="text-primary" /> College Trends
        </h3>
        <div className="space-y-3">
          {trends.map((item) => (
            <div 
              key={item.tag} 
              className="flex justify-between items-center cursor-pointer hover:bg-bg/50 p-1.5 rounded-lg transition"
              onClick={() => navigate(`/search?hashtag=${item.tag}`)}
            >
              <div>
                <div className="text-xs font-bold text-text">#{item.tag}</div>
                <div className="text-[10px] text-gray-500">{item.count} posts</div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">Trending</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
