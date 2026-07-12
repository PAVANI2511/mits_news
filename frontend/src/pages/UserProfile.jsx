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

  // Followers/Following Modal States
  const [showConnectionsModal, setShowConnectionsModal] = useState(null); // 'followers' | 'following' | null
  const [connectionsList, setConnectionsList] = useState([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);

  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    loadProfile();
  }, [username]);

  const handleOpenConnections = async (type) => {
    setShowConnectionsModal(type);
    setConnectionsLoading(true);
    try {
      let res;
      if (type === 'followers') {
        res = await authAPI.getFollowers(username);
      } else {
        res = await authAPI.getFollowing(username);
      }
      setConnectionsList(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setConnectionsLoading(false);
    }
  };

  useEffect(() => {
    const handleFollowToggle = (e) => {
      if (e.detail.username === username) {
        setIsFollowing(e.detail.isFollowing);
        setProfile(prev => {
          if (!prev) return prev;
          const diff = e.detail.isFollowing ? 1 : -1;
          const currentCount = prev.followers_count || 0;
          return {
            ...prev,
            followers_count: Math.max(0, currentCount + diff)
          };
        });
      }
    };
    window.addEventListener('user-follow-toggled', handleFollowToggle);
    return () => {
      window.removeEventListener('user-follow-toggled', handleFollowToggle);
    };
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
      const nextFollowing = !isFollowing;
      if (isFollowing) {
        await authAPI.unfollow(username);
        setProfile(prev => ({ ...prev, followers_count: Math.max(0, prev.followers_count - 1) }));
      } else {
        await authAPI.follow(username);
        setProfile(prev => ({ ...prev, followers_count: (prev.followers_count || 0) + 1 }));
      }
      setIsFollowing(nextFollowing);
      window.dispatchEvent(new CustomEvent('user-follow-toggled', { 
        detail: { username: username, isFollowing: nextFollowing } 
      }));
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
                <div className="text-xs text-gray-500 font-medium">@{profile.username} • {profile.email} {profile.mobile_number && `• Mobile: ${profile.mobile_number}`}</div>
                
                <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 text-xs text-primary font-semibold items-center">
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] uppercase font-bold tracking-wider">
                    {profile.role_type || 'student'}
                  </span>
                  {profile.department && <span>• {profile.department}</span>}
                  {profile.branch && <span>• {profile.branch}</span>}
                  {profile.role_type === 'teacher' ? (
                    <>
                      {profile.designation && <span>• {profile.designation}</span>}
                      {profile.teacher_role && <span>• {profile.teacher_role}</span>}
                    </>
                  ) : (
                    <>
                      {profile.year && <span>• {profile.year}</span>}
                      {profile.roll_number && <span>• Roll No: {profile.roll_number}</span>}
                    </>
                  )}
                </div>

                {profile.bio && (
                  <p className="mt-3 text-sm text-text/90 leading-relaxed font-normal whitespace-pre-wrap max-w-xl">
                    {profile.bio}
                  </p>
                )}
                
                {profile.joined_date && (
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-2.5">
                    Joined on {new Date(profile.joined_date).toLocaleDateString(undefined, { month: 'long', year: 'numeric', day: 'numeric' })}
                  </div>
                )}
              </div>
              {/* Counts */}
              <div className="mt-6 flex flex-wrap justify-center sm:justify-start gap-8 border-t border-border pt-4 text-center sm:text-left">
                <div>
                  <div className="text-lg font-black text-text">{profile.total_posts ?? userPosts.length}</div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Articles</div>
                </div>
                <div>
                  <div className="text-lg font-black text-text">{profile.total_likes ?? 0}</div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Total Likes</div>
                </div>
                <div 
                  onClick={() => handleOpenConnections('followers')}
                  className="cursor-pointer hover:opacity-80 transition"
                  title="View Followers"
                >
                  <div className="text-lg font-black text-text">{profile.followers_count || 0}</div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Followers</div>
                </div>
                <div 
                  onClick={() => handleOpenConnections('following')}
                  className="cursor-pointer hover:opacity-80 transition"
                  title="View Following"
                >
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
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      onPostDeleted={handlePostDeleted} 
                      onPostUnsaved={(unsavedId) => setSavedPosts(prev => prev.filter(p => p.id !== unsavedId))}
                    />
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

      {showConnectionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-sm w-full mx-4 shadow-xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4 shrink-0">
              <h3 className="text-sm font-black uppercase tracking-wider text-text">
                {showConnectionsModal === 'followers' ? 'Followers' : 'Following'}
              </h3>
              <button 
                onClick={() => {
                  setShowConnectionsModal(null);
                  setConnectionsList([]);
                }} 
                className="text-gray-400 hover:text-text font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {connectionsLoading ? (
                <div className="py-8 text-center text-gray-500 flex flex-col items-center">
                  <div className="h-6 w-6 rounded-full border-3 border-primary border-t-transparent animate-spin mb-2" />
                  <span className="text-xs">Loading list...</span>
                </div>
              ) : connectionsList.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-6">
                  {showConnectionsModal === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
                </p>
              ) : (
                connectionsList.map((c) => (
                  <div 
                    key={c.id} 
                    onClick={() => {
                      setShowConnectionsModal(null);
                      setConnectionsList([]);
                      navigate(`/profile/${c.username}`);
                    }}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-bg cursor-pointer transition"
                  >
                    <img
                      src={getMediaUrl(c.profile_pic) || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23a0aec0"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'}
                      alt={c.username}
                      className="h-9 w-9 rounded-full object-cover border border-border shrink-0 bg-card"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-text block truncate hover:underline">{c.name}</span>
                      <span className="text-[10px] text-gray-400 block truncate">@{c.username}</span>
                      {c.department && (
                        <span className="text-[9px] text-primary font-semibold block truncate">
                          {c.department} {c.year ? `• ${c.year}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-border/60 pt-3 mt-4 flex justify-end shrink-0">
              <button
                onClick={() => {
                  setShowConnectionsModal(null);
                  setConnectionsList([]);
                }}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold transition hover:bg-primary/90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default UserProfile;
