import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  FiHeart, FiMessageSquare, FiBookmark, FiDownload, 
  FiShare2, FiMapPin, FiMusic, FiFileText, FiUserCheck, FiUserPlus 
} from 'react-icons/fi';
import { postsAPI, authAPI } from '../services/api';
import CommentSection from './CommentSection';

const PostCard = ({ post, onPostDeleted }) => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [liked, setLiked] = useState(post.is_liked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [saved, setSaved] = useState(post.is_saved || false);
  const [following, setFollowing] = useState(post.is_following || false);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [errorMessage, setErrorMessage] = useState('');
  const [shareSuccess, setShareSuccess] = useState(false);

  const handleLike = async () => {
    if (!isAuthenticated) {
      setErrorMessage("Please log in to like posts.");
      return;
    }
    try {
      if (liked) {
        await postsAPI.unlike(post.id);
        setLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        await postsAPI.like(post.id);
        setLiked(true);
        setLikesCount(prev => prev + 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated) {
      setErrorMessage("Please log in to save posts.");
      return;
    }
    try {
      if (saved) {
        await postsAPI.unsave(post.id);
        setSaved(false);
      } else {
        await postsAPI.save(post.id);
        setSaved(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFollow = async () => {
    if (!isAuthenticated) {
      setErrorMessage("Please log in to follow students.");
      return;
    }
    try {
      if (following) {
        await authAPI.unfollow(post.username);
        setFollowing(false);
      } else {
        await authAPI.follow(post.username);
        setFollowing(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/posts/${post.id}`;
    navigator.clipboard.writeText(shareUrl);
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 2000);
  };

  const handleDownload = async (mediaType, mediaUrl) => {
    if (!mediaUrl) return;
    
    // Viewer restrictions: Video, Audio, Posters, and PDFs are restricted media.
    const isRestricted = ['video', 'audio', 'poster', 'pdf'].includes(mediaType);
    
    if (isRestricted && !isAuthenticated) {
      setErrorMessage("Viewers are restricted from downloading PDFs, audio, videos, or posters. Please register/login.");
      return;
    }

    try {
      // Direct file downloading stream or anchor opening
      const fullUrl = mediaUrl.startsWith('http') ? mediaUrl : `http://127.0.0.1:8000${mediaUrl}`;
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const filename = mediaUrl.split('/').pop() || `download.${mediaType}`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      // Fallback
      window.open(mediaUrl, '_blank');
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        await postsAPI.delete(post.id);
        if (onPostDeleted) onPostDeleted(post.id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const isOwner = user?.username === post.username;
  const isAdmin = user?.is_staff || user?.is_superuser;
  const formattedDate = post.created_at ? new Date(post.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) : '';

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden transition-colors duration-300">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/profile/${post.username}`}>
            <img
              src={post.profile_pic || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23a0aec0"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'}
              alt={post.username}
              className="h-10 w-10 rounded-full object-cover border border-border"
            />
          </Link>
          <div>
            <div className="flex items-center gap-1.5">
              <Link to={`/profile/${post.username}`} className="text-sm font-bold text-text hover:underline">
                {post.name || post.username}
              </Link>
              {post.location && (
                <span className="text-xs text-gray-400 flex items-center gap-0.5">
                  • <FiMapPin className="inline text-[10px]" /> {post.location}
                </span>
              )}
            </div>
            <div className="text-[10px] text-gray-500 font-semibold">{post.email}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{formattedDate}</span>
          {!isOwner && isAuthenticated && (
            <button
              onClick={handleFollow}
              className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1 ${
                following 
                  ? 'bg-border text-gray-500 hover:bg-border/80' 
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
              }`}
            >
              {following ? <><FiUserCheck /> Following</> : <><FiUserPlus /> Follow</>}
            </button>
          )}
          {(isOwner || isAdmin) && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate(`/posts/${post.id}/edit`)}
                className="text-xs px-2.5 py-1 text-primary hover:bg-primary/10 rounded transition"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="text-xs px-2.5 py-1 text-red-500 hover:bg-red-500/10 rounded transition"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pb-3">
        {post.caption && (
          <p className="text-sm text-text whitespace-pre-wrap leading-relaxed">
            {post.caption}
          </p>
        )}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {post.hashtags.map((tag) => (
              <span 
                key={tag} 
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                onClick={() => navigate(`/search?hashtag=${tag}`)}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {post.text && (
        <div className="px-4 pb-4 pt-1">
          <div className="bg-bg/40 p-4 rounded-xl border border-border text-sm leading-relaxed text-text font-serif italic whitespace-pre-wrap">
            "{post.text}"
          </div>
        </div>
      )}

      {/* Media Attachments */}
      {post.image && (
        <div className="border-t border-b border-border bg-bg/20 flex justify-center max-h-[500px] overflow-hidden">
          <img
            src={post.image.startsWith('http') ? post.image : `http://127.0.0.1:8000${post.image}`}
            alt="Post content"
            className="w-full object-contain max-h-[500px]"
          />
        </div>
      )}

      {post.video && (
        <div className="border-t border-b border-border bg-black flex justify-center max-h-[500px]">
          <video
            src={post.video.startsWith('http') ? post.video : `http://127.0.0.1:8000${post.video}`}
            controls
            className="w-full max-h-[500px]"
          />
        </div>
      )}

      {/* Audio attachment */}
      {post.audio && (
        <div className="px-4 py-3 border-t border-b border-border bg-bg/30">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-full text-primary">
              <FiMusic className="text-xl" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-text">Audio Article</div>
              <audio
                src={post.audio.startsWith('http') ? post.audio : `http://127.0.0.1:8000${post.audio}`}
                controls
                className="w-full mt-1.5 h-8 bg-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {/* Poster Attachment */}
      {post.poster && (
        <div className="border-t border-b border-border bg-bg/20 p-4 flex flex-col items-center">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Attached College Poster</div>
          <img
            src={post.poster.startsWith('http') ? post.poster : `http://127.0.0.1:8000${post.poster}`}
            alt="College Poster"
            className="rounded-lg max-h-[350px] shadow border border-border object-contain"
          />
        </div>
      )}

      {/* PDF Attachment */}
      {post.pdf && (
        <div className="px-4 py-3.5 border-t border-b border-border bg-bg/40 flex items-center justify-between">
          <div className="flex items-center gap-3 truncate">
            <div className="p-2.5 bg-red-500/10 rounded-xl text-red-500">
              <FiFileText className="text-2xl" />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-text truncate">College Document (PDF)</div>
              <div className="text-[10px] text-gray-500 truncate">Click download to read full document</div>
            </div>
          </div>
          <button
            onClick={() => handleDownload('pdf', post.pdf)}
            className="px-3.5 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/95 flex items-center gap-1 shadow-sm transition"
          >
            <FiDownload /> Download
          </button>
        </div>
      )}

      {/* Background Music Banner */}
      {post.music_url && (
        <div className="px-4 py-2 bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-border flex items-center justify-between text-xs text-primary font-medium">
          <span className="flex items-center gap-1.5">
            <FiMusic className="animate-spin text-sm" style={{ animationDuration: '6s' }} />
            Background Music: <span className="italic">{post.music_url}</span>
          </span>
          <audio
            src={post.music_url.startsWith('http') ? post.music_url : `http://127.0.0.1:8000${post.music_url}`}
            autoPlay
            loop
            muted
            controls
            className="h-6 w-32 scale-90"
          />
        </div>
      )}

      {/* Alerts / Error messages */}
      {errorMessage && (
        <div className="mx-4 mt-3 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} className="font-bold ml-2">×</button>
        </div>
      )}

      {shareSuccess && (
        <div className="mx-4 mt-3 bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-2 rounded-lg">
          Post link copied to clipboard!
        </div>
      )}

      {/* Action Footer */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-border bg-card">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 text-sm font-bold transition ${
              liked ? 'text-red-500 scale-105' : 'text-gray-500 hover:text-red-500'
            }`}
          >
            <FiHeart className={liked ? 'fill-current' : ''} />
            <span>{likesCount}</span>
          </button>
          
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-primary transition"
          >
            <FiMessageSquare />
            <span>{commentsCount}</span>
          </button>
          
          <button
            onClick={handleShare}
            className="text-gray-500 hover:text-primary transition"
            title="Share Link"
          >
            <FiShare2 />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Individual downloads for items */}
          {post.image && (
            <button
              onClick={() => handleDownload('image', post.image)}
              className="text-gray-500 hover:text-primary text-sm font-bold flex items-center gap-1"
              title="Download Image"
            >
              <FiDownload /> <span className="hidden sm:inline">Image</span>
            </button>
          )}
          {post.video && (
            <button
              onClick={() => handleDownload('video', post.video)}
              className="text-gray-500 hover:text-primary text-sm font-bold flex items-center gap-1"
              title="Download Video"
            >
              <FiDownload /> <span className="hidden sm:inline">Video</span>
            </button>
          )}
          {post.audio && (
            <button
              onClick={() => handleDownload('audio', post.audio)}
              className="text-gray-500 hover:text-primary text-sm font-bold flex items-center gap-1"
              title="Download Audio"
            >
              <FiDownload /> <span className="hidden sm:inline">Audio</span>
            </button>
          )}

          <button
            onClick={handleSave}
            className={`text-lg transition ${saved ? 'text-yellow-500 scale-105' : 'text-gray-500 hover:text-yellow-500'}`}
            title={saved ? "Unsave" : "Save"}
          >
            <FiBookmark className={saved ? 'fill-current' : ''} />
          </button>
        </div>
      </div>

      {/* Nested Comments section */}
      {showComments && (
        <div className="border-t border-border bg-bg/20">
          <CommentSection 
            postId={post.id} 
            onCommentAdded={() => setCommentsCount(prev => prev + 1)}
            onCommentDeleted={() => setCommentsCount(prev => Math.max(0, prev - 1))}
          />
        </div>
      )}
    </div>
  );
};

export default PostCard;
