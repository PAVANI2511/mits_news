import React, { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import Sidebar from '../components/Sidebar';
import PostCard from '../components/PostCard';
import { PostSkeleton } from '../components/LoadingSkeleton';
import { postsAPI } from '../services/api';
import { FiTrendingUp, FiInfo, FiRefreshCw } from 'react-icons/fi';

const ExploreFeed = () => {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFeed(1, true);
  }, []);

  const loadFeed = async (pageNum, reset = false) => {
    setLoading(true);
    setError('');
    try {
      const res = await postsAPI.getExplore({
        page: pageNum,
        page_size: 5
      });

      if (reset) {
        setPosts(res.data.results);
      } else {
        setPosts(prev => [...prev, ...res.data.results]);
      }
      setHasNext(res.data.has_next);
    } catch (err) {
      setError("Failed to load trending feed.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasNext) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadFeed(nextPage);
    }
  };

  const handlePostDeleted = (deletedId) => {
    setPosts(prev => prev.filter(p => p.id !== deletedId));
  };

  return (
    <MainLayout sidebar={<Sidebar />}>
      <div className="space-y-6">
        <div className="bg-card border border-border p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <FiTrendingUp className="text-primary text-lg" />
            <div>
              <h2 className="font-black text-sm uppercase tracking-wider text-text">Explore Feed</h2>
              <p className="text-[10px] text-gray-500 font-semibold">Recommended and trending posts across MITS campus</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2.5 rounded-xl">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              onPostDeleted={handlePostDeleted} 
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
              <h3 className="font-bold text-text text-sm">No recommended posts</h3>
              <p className="text-xs text-gray-500 mt-1">There are no trending articles available right now.</p>
            </div>
          )}

          {hasNext && !loading && (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleLoadMore}
                className="px-6 py-2.5 bg-card hover:bg-bg border border-border text-text rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition"
              >
                <FiRefreshCw /> Load More
              </button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default ExploreFeed;
