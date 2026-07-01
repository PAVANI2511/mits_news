import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Sidebar from '../components/Sidebar';
import PostCard from '../components/PostCard';
import { PostSkeleton } from '../components/LoadingSkeleton';
import { postsAPI, adminAPI } from '../services/api';
import { FiVolume2, FiInfo, FiRefreshCw } from 'react-icons/fi';

const HomeFeed = () => {
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const hashtagParam = searchParams.get('hashtag') || '';

  const [posts, setPosts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Reset feed on filter change
    setPosts([]);
    setPage(1);
    loadFeed(1, true);
    loadAnnouncements();
  }, [queryParam, hashtagParam]);

  const loadFeed = async (pageNum, reset = false) => {
    setLoading(true);
    setError('');
    try {
      const res = await postsAPI.getFeed({
        page: pageNum,
        page_size: 5,
        q: queryParam,
        hashtag: hashtagParam
      });

      if (reset) {
        setPosts(res.data.results);
      } else {
        setPosts(prev => [...prev, ...res.data.results]);
      }
      setHasNext(res.data.has_next);
    } catch (err) {
      setError("Failed to load news feed. Make sure the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const res = await adminAPI.getAnnouncements();
      setAnnouncements(res.data.slice(0, 2)); // Get latest 2 announcements
    } catch (err) {
      console.error("Failed to load announcements:", err);
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
        {/* Sticky Announcements Banner */}
        {announcements.length > 0 && (
          <div className="bg-gradient-to-r from-red-500/10 to-primary/10 border border-primary/20 rounded-2xl p-4 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
              <FiVolume2 className="animate-bounce" />
              <span>Campus Announcement</span>
            </div>
            {announcements.map((ann) => (
              <div key={ann.id} className="text-xs text-text border-b border-border/40 pb-2 last:border-0 last:pb-0">
                <span className="font-bold text-text/90 block mb-0.5">{ann.title}</span>
                <p className="text-gray-500 leading-relaxed">{ann.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filter Title */}
        {(queryParam || hashtagParam) && (
          <div className="bg-card border border-border p-4 rounded-xl flex items-center justify-between">
            <div className="text-xs font-bold text-text">
              Showing results for:{' '}
              <span className="text-primary italic">
                {queryParam ? `Search: "${queryParam}"` : `Hashtag: #${hashtagParam}`}
              </span>
            </div>
            <button
              onClick={() => window.location.href = '/feed'}
              className="text-[10px] font-bold text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Posts Feed */}
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
              <h3 className="font-bold text-text text-sm">No campus posts found</h3>
              <p className="text-xs text-gray-500 mt-1">Be the first to create a post, or try a different search filter!</p>
            </div>
          )}

          {/* Load More Button */}
          {hasNext && !loading && (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleLoadMore}
                className="px-6 py-2.5 bg-card hover:bg-bg border border-border text-text rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition"
              >
                <FiRefreshCw /> Load More News
              </button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default HomeFeed;
