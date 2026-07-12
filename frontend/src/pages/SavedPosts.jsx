import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import MainLayout from '../layouts/MainLayout';
import Sidebar from '../components/Sidebar';
import PostCard from '../components/PostCard';
import { PostSkeleton } from '../components/LoadingSkeleton';
import { postsAPI } from '../services/api';
import { FiBookmark, FiInfo } from 'react-icons/fi';

const SavedPosts = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      loadSavedPosts();
    }
  }, [isAuthenticated, navigate]);

  const loadSavedPosts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await postsAPI.getSaved();
      setPosts(res.data);
    } catch (err) {
      setError("Failed to load saved posts.");
    } finally {
      setLoading(false);
    }
  };

  const handlePostDeleted = (deletedId) => {
    setPosts(prev => prev.filter(p => p.id !== deletedId));
  };

  const handlePostUnsaved = (unsavedId) => {
    setPosts(prev => prev.filter(p => p.id !== unsavedId));
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <MainLayout sidebar={<Sidebar />}>
      <div className="space-y-6">
        {/* Header Block */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm flex items-center justify-between transition-colors duration-300">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-2xl">
              <FiBookmark className="text-2xl fill-current" />
            </div>
            <div>
              <h1 className="text-xl font-black text-text">Saved Articles</h1>
              <p className="text-xs text-gray-500 mt-0.5">Your bookmarked college updates and articles</p>
            </div>
          </div>
          <div className="text-xs font-bold text-gray-400 bg-bg px-3 py-1.5 rounded-full border border-border">
            {posts.length} {posts.length === 1 ? 'Article' : 'Articles'}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-4 rounded-xl">
            {error}
          </div>
        )}

        {/* Saved Posts Feed */}
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              onPostDeleted={handlePostDeleted} 
              onPostUnsaved={handlePostUnsaved}
            />
          ))}

          {loading && (
            <div className="space-y-6">
              <PostSkeleton />
              <PostSkeleton />
            </div>
          )}

          {!loading && posts.length === 0 && (
            <div className="bg-card rounded-2xl border border-border p-12 text-center text-gray-500 flex flex-col items-center justify-center">
              <FiInfo className="text-4xl text-gray-400 mb-2" />
              <h3 className="font-bold text-text text-sm">No saved posts</h3>
              <p className="text-xs text-gray-500 mt-1">Bookmarked posts will appear here. Try saving posts from your feed!</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default SavedPosts;
