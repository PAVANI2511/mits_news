import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import MainLayout from '../layouts/MainLayout';
import Sidebar from '../components/Sidebar';
import PostCard from '../components/PostCard';
import { ProfileSkeleton } from '../components/LoadingSkeleton';
import { authAPI, postsAPI, getMediaUrl } from '../services/api';
import { FiBook, FiBookmark, FiMapPin, FiAward, FiSettings } from 'react-icons/fi';

const UserProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user: currentUser } = useSelector((state) => state.auth);

  const [profile, setProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts'); // posts, saved
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      // Get user profile
      const profileRes = await authAPI.getProfile(username);
      setProfile(profileRes.data);
      setIsFollowing(profileRes.data.is_following);

      // Get user's published posts
      const postsRes = await postsAPI.getFeed({ username: username });
      setUserPosts(postsRes.data.results);

      // If own profile, load saved posts too
      if (currentUser?.username === username) {
        const savedRes = await postsAPI.getSaved();
        setSavedPosts(savedRes.data);
      }
    } catch (err) {
      setError("User profile not found or blocked.");
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      if (isFollowing) {
        await authAPI.unfollow(username);
        setIsFollowing(false);
        setProfile(prev => ({ ...prev, followers_count: Math.max(0, prev.followers_count - 1) }));
      } else {
        await authAPI.follow(username);
        setIsFollowing(true);
        setProfile(prev => ({ ...prev, followers_count: prev.followers_count + 1 }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostDeleted = (deletedId) => {
    setUserPosts(prev => prev.filter(p => p.id !== deletedId));
  };

  return (
    <MainLayout sidebar={<Sidebar />}>
      {loading ? (
        <ProfileSkeleton />
      ) : error ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center text-gray-500">
          <p className="font-bold">{error}</p>
          <button onClick={() => navigate('/feed')} className="mt-4 text-xs font-semibold text-primary underline">Back to Home Feed</button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Profile Header Card */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm transition-colors duration-300">
            {/* Cover photo */}
            <div 
              className="h-44 w-full bg-cover bg-center"
              style={{ 
                backgroundImage: profile.cover_photo 
                  ? `url(${getMediaUrl(profile.cover_photo)})`
                  : 'linear-gradient(to right, var(--color-primary), var(--color-secondary))' 
              }}
            />
            
            <div className="px-6 pb-6 pt-0">
              <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end -mt-16 sm:space-x-6">
                <img
                  src={getMediaUrl(profile.profile_pic) || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23a0aec0"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'}
                  alt={profile.username}
                  className="h-28 w-28 rounded-full border-4 border-card object-cover bg-card shadow-md"
                />
                
                <div className="flex gap-2 mt-4 sm:mt-0">
                  {isOwnProfile ? (
                    <button
                      onClick={() => navigate('/settings')}
                      className="px-4 py-2 border border-border rounded-xl text-xs font-bold hover:bg-bg flex items-center gap-1.5 transition"
                    >
                      <FiSettings /> Edit Profile
                    </button>
                  ) : (
                    <button
                      onClick={handleFollow}
                      className={`px-6 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                        isFollowing 
                          ? 'bg-border text-gray-500 hover:bg-border/80' 
                          : 'bg-primary text-white hover:bg-primary/95'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              </div>

              {/* Bio Details */}
              <div className="mt-4 space-y-1.5 text-center sm:text-left">
                <h2 className="text-xl font-extrabold text-text">{profile.name}</h2>
                <div className="text-xs text-gray-500 font-medium">@{profile.username} • {profile.email}</div>
                
                <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 text-xs text-primary font-semibold">
                  {profile.department && <span>{profile.department}</span>}
                  {profile.year && <span>• {profile.year}</span>}
                </div>

                {profile.bio && (
                  <p className="mt-3 text-sm text-text/90 leading-relaxed font-normal whitespace-pre-wrap max-w-xl">
                    {profile.bio}
                  </p>
                )}
              </div>

              {/* Counts */}
              <div className="mt-6 flex justify-center sm:justify-start gap-8 border-t border-border pt-4 text-center sm:text-left">
                <div>
                  <div className="text-lg font-black text-text">{userPosts.length}</div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Articles</div>
                </div>
                <div>
                  <div className="text-lg font-black text-text">{profile.followers_count || 0}</div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Followers</div>
                </div>
                <div>
                  <div className="text-lg font-black text-text">{profile.following_count || 0}</div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Following</div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Tabs */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab('posts')}
                className={`flex-1 py-4 text-center text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition ${
                  activeTab === 'posts' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-gray-500 hover:text-text'
                }`}
              >
                <FiBook /> Published Articles
              </button>
              {isOwnProfile && (
                <button
                  onClick={() => setActiveTab('saved')}
                  className={`flex-1 py-4 text-center text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition ${
                    activeTab === 'saved' 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-gray-500 hover:text-text'
                  }`}
                >
                  <FiBookmark /> Saved Articles
                </button>
              )}
            </div>

            <div className="p-4 space-y-6">
              {activeTab === 'posts' && (
                <div className="space-y-6">
                  {userPosts.map(post => (
                    <PostCard key={post.id} post={post} onPostDeleted={handlePostDeleted} />
                  ))}
                  {userPosts.length === 0 && (
                    <p className="text-xs text-gray-400 italic text-center py-6">No articles published by this student.</p>
                  )}
                </div>
              )}

              {activeTab === 'saved' && isOwnProfile && (
                <div className="space-y-6">
                  {savedPosts.map(post => (
                    <PostCard key={post.id} post={post} onPostDeleted={handlePostDeleted} />
                  ))}
                  {savedPosts.length === 0 && (
                    <p className="text-xs text-gray-400 italic text-center py-6">You haven't saved any articles yet.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default UserProfile;
