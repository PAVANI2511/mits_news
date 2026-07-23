import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { authAPI, postsAPI, getMediaUrl } from '../services/api';
import { FiTrendingUp, FiUserPlus, FiBookOpen } from 'react-icons/fi';

const Sidebar = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [suggestions, setSuggestions] = useState([]);

  const [trends, setTrends] = useState([]);

  useEffect(() => {
    if (isAuthenticated) {
      authAPI.getSuggestions()
        .then((res) => {
          setSuggestions(res.data.slice(0, 3));
        })
        .catch((err) => console.error("Failed to load suggestions:", err));
    }

    // Fetch live trending hashtags
    postsAPI.getTrends()
      .then((res) => {
        setTrends(res.data);
      })
      .catch((err) => console.error("Error loading trends:", err));
  }, [isAuthenticated, user]);

  return (
    <div className="space-y-6">
      {/* User Profile Card */}
      {isAuthenticated && user ? (
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xl p-5 text-center transition-colors">
          <div 
            className="h-20 w-full rounded-2xl bg-cover bg-center"
            style={{ 
              backgroundImage: user.profile?.cover_photo 
                ? `url(${getMediaUrl(user.profile.cover_photo)})`
                : 'linear-gradient(to right, #800000, #660000)' 
            }}
          />
          <div className="-mt-10 flex justify-center">
            <img
              src={getMediaUrl(user.profile?.profile_pic) || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23a0aec0"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'}
              alt={user.username}
              className="h-16 w-16 rounded-full border-4 border-white object-cover bg-white shadow-md"
            />
          </div>
          <h2 className="mt-2 font-serif font-bold text-lg text-gray-900 truncate">
            {user.profile?.name || user.username}
          </h2>
          <p className="text-xs text-gray-500 truncate">{user.email}</p>
          
          <div className="mt-1.5 flex justify-center flex-wrap gap-1.5 text-xs text-[#800000] font-semibold">
            {user.profile?.department && <span>{user.profile.department}</span>}
            {user.profile?.year && <span>• {user.profile.year}</span>}
          </div>
 
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-gray-100 pt-4">
            <div>
              <div className="text-sm font-extrabold text-gray-900">{user.profile?.followers_count || 0}</div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Followers</div>
            </div>
            <div>
              <div className="text-sm font-extrabold text-gray-900">{user.profile?.following_count || 0}</div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Following</div>
            </div>
          </div>
 
          <Link 
            to={`/profile/${user.username}`}
            className="mt-4 block w-full text-center py-2.5 bg-[#800000] text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#660000] shadow-sm transition"
          >
            My Profile
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xl text-center space-y-3">
          <FiBookOpen className="mx-auto text-4xl text-[#800000]" />
          <h2 className="font-serif font-bold text-xl text-gray-900">Welcome Viewer!</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            Log in with your <span className="font-bold text-[#800000]">@mits.ac.in</span> student email to publish articles, react to news, and interact with the campus community.
          </p>
          <div className="flex flex-col gap-2.5 pt-2">
            <Link to="/login" className="py-2.5 bg-[#800000] text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#660000] shadow transition">
              Log In
            </Link>
            <Link to="/register" className="py-2.5 border border-[#800000] text-[#800000] bg-white/70 hover:bg-white rounded-full text-xs font-bold transition">
              Create Student Account
            </Link>
          </div>
        </div>
      )}
 
      {/* Suggested Follows */}
      {isAuthenticated && suggestions.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xl">
          <h3 className="font-serif font-bold text-sm text-[#800000] mb-3 flex items-center gap-1.5 uppercase tracking-wider">
            <FiUserPlus className="text-[#800000]" /> Suggestions for You
          </h3>
          <div className="space-y-3">
            {suggestions.map((sug) => (
              <div key={sug.id} className="flex items-center justify-between">
                <div 
                  className="flex items-center gap-2.5 cursor-pointer truncate flex-1"
                  onClick={() => navigate(`/profile/${sug.username}`)}
                >
                  <img
                    src={getMediaUrl(sug.profile_pic) || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23a0aec0"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'}
                    alt={sug.username}
                    className="h-8 w-8 rounded-full object-cover border border-gray-100"
                  />
                  <div className="truncate">
                    <div className="text-xs font-bold text-gray-900 truncate">{sug.name}</div>
                    <div className="text-[10px] text-gray-500 truncate">@{sug.username}</div>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/profile/${sug.username}`)}
                  className="text-xs font-bold text-[#800000] hover:underline"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
 
      {/* Trending Hashtags */}
      {trends.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xl">
          <h3 className="font-serif font-bold text-sm text-[#800000] mb-3 flex items-center gap-1.5 uppercase tracking-wider">
            <FiTrendingUp className="text-[#800000]" /> Campus Trends
          </h3>
          <div className="space-y-2.5">
            {trends.map((item) => (
              <div 
                key={item.tag} 
                className="flex justify-between items-center cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition"
                onClick={() => navigate(`/search?hashtag=${item.tag}`)}
              >
                <div>
                  <div className="text-xs font-bold text-gray-900">#{item.tag}</div>
                  <div className="text-[10px] text-gray-500">{item.count} articles</div>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#800000]/10 text-[#800000] font-bold uppercase tracking-wider">Trending</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
