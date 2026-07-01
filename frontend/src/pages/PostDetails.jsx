import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Sidebar from '../components/Sidebar';
import PostCard from '../components/PostCard';
import { PostSkeleton } from '../components/LoadingSkeleton';
import { postsAPI } from '../services/api';

const PostDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPost();
  }, [id]);

  const loadPost = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await postsAPI.getDetail(id);
      setPost(res.data);
    } catch (err) {
      setError("Article not found or blocked.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout sidebar={<Sidebar />}>
      {loading ? (
        <PostSkeleton />
      ) : error ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center text-gray-500">
          <p className="font-bold">{error}</p>
          <button onClick={() => navigate('/feed')} className="mt-4 text-xs font-semibold text-primary underline">Back to feed</button>
        </div>
      ) : post && (
        <PostCard post={post} onPostDeleted={() => navigate('/feed')} />
      )}
    </MainLayout>
  );
};

export default PostDetails;
