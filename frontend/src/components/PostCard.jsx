import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  FiHeart, FiMessageSquare, FiBookmark, FiDownload, 
  FiShare2, FiMapPin, FiMusic, FiFileText, FiUserCheck, FiUserPlus,
  FiLink, FiExternalLink, FiVolume2, FiVolumeX
} from 'react-icons/fi';
import { 
  FaWhatsapp, FaFacebook, FaLinkedin, FaTelegram, FaTwitter 
} from 'react-icons/fa';
import { postsAPI, authAPI, getMediaUrl } from '../services/api';
import CommentSection from './CommentSection';

const PostCard = ({ post, onPostDeleted, onPostSaved, onPostUnsaved }) => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [audioMuted, setAudioMuted] = useState(true);
  const audioRef = useRef(null);

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setAudioMuted(audioRef.current.muted);
    }
  };



  const [liked, setLiked] = useState(post.is_liked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [saved, setSaved] = useState(post.is_saved || false);
  const [savedCount, setSavedCount] = useState(post.saved_count || 0);
  const [sharesCount, setSharesCount] = useState(post.share_count || 0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [following, setFollowing] = useState(post.is_following || false);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [errorMessage, setErrorMessage] = useState('');
  const [shareSuccess, setShareSuccess] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  const handleReportPost = async (e) => {
    e.preventDefault();
    if (!reportReason) {
      setReportError("Please select a reason.");
      return;
    }
    setReportSubmitting(true);
    setReportError('');
    try {
      await postsAPI.report(post.id, {
        reason: reportReason,
        details: reportDetails
      });
      setReportSuccess(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportSuccess(false);
        setReportReason('');
        setReportDetails('');
      }, 2000);
    } catch (err) {
      setReportError(err.response?.data?.error || "Failed to submit report. You may have already reported this post.");
    } finally {
      setReportSubmitting(false);
    }
  };


  useEffect(() => {
    const handleFollowToggle = (e) => {
      if (e.detail.username === post.username) {
        setFollowing(e.detail.isFollowing);
      }
    };
    window.addEventListener('user-follow-toggled', handleFollowToggle);
    return () => {
      window.removeEventListener('user-follow-toggled', handleFollowToggle);
    };
  }, [post.username]);

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
        setSavedCount(prev => Math.max(0, prev - 1));
        if (onPostUnsaved) onPostUnsaved(post.id);
      } else {
        await postsAPI.save(post.id);
        setSaved(true);
        setSavedCount(prev => prev + 1);
        if (onPostSaved) onPostSaved(post.id);
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
      const nextFollowing = !following;
      if (following) {
        await authAPI.unfollow(post.username);
      } else {
        await authAPI.follow(post.username);
      }
      setFollowing(nextFollowing);
      window.dispatchEvent(new CustomEvent('user-follow-toggled', { 
        detail: { username: post.username, isFollowing: nextFollowing } 
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleShareToPlatform = async (platform) => {
    const shareUrl = `${window.location.origin}/posts/${post.id}`;
    const text = `Check out this article: "${post.caption || 'Campus update'}" on MITS Newspaper!`;
    let redirectUrl = '';

    switch (platform) {
      case 'whatsapp':
        redirectUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + shareUrl)}`;
        break;
      case 'facebook':
        redirectUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'linkedin':
        redirectUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'telegram':
        redirectUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
        break;
      case 'twitter':
        redirectUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
        break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(shareUrl);
          setShareSuccess(true);
          setTimeout(() => setShareSuccess(false), 2000);
        } catch (err) {
          console.error("Failed to copy link:", err);
        }
        break;
      default:
        break;
    }

    if (redirectUrl) {
      window.open(redirectUrl, '_blank', 'noopener,noreferrer');
    }

    // Call backend API to record share
    try {
      const res = await postsAPI.share(post.id);
      setSharesCount(res.data.share_count);
    } catch (err) {
      console.error("Failed to increment share count on backend:", err);
    }

    setShowShareModal(false);
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
      const fullUrl = getMediaUrl(mediaUrl);
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
              src={getMediaUrl(post.profile_pic) || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23a0aec0"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'}
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
          {!isOwner && isAuthenticated && (
            <button
              onClick={() => setShowReportModal(true)}
              className="text-xs px-2.5 py-1 text-red-500 hover:bg-red-500/10 rounded transition font-semibold"
            >
              Report Post
            </button>
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
            src={getMediaUrl(post.image)}
            alt="Post content"
            className="w-full object-contain max-h-[500px]"
          />
        </div>
      )}

      {post.video && (
        <div className="border-t border-b border-border bg-black flex justify-center max-h-[500px]">
          <video
            src={getMediaUrl(post.video)}
            controls
            className="w-full max-h-[500px]"
          />
        </div>
      )}


      {/* Poster Attachment */}
      {post.poster && (
        <div className="border-t border-b border-border bg-bg/20 p-4 flex flex-col items-center">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Attached College Poster</div>
          <img
            src={getMediaUrl(post.poster)}
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

      {/* Background Music Banner (Playing uploaded Audio file) */}
      {post.audio && (
        <div className="px-4 py-1.5 bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-border flex justify-end items-center">
          <audio
            ref={audioRef}
            src={getMediaUrl(post.audio)}
            autoPlay
            loop
            muted
          />
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg hover:bg-black/5 text-gray-500 hover:text-text transition-all focus:outline-none flex items-center justify-center border border-border bg-card shadow-sm"
            title={audioMuted ? "Unmute Music" : "Mute Music"}
          >
            {audioMuted ? (
              <FiVolumeX className="text-base text-red-500" />
            ) : (
              <FiVolume2 className="text-base text-green-500 animate-pulse" />
            )}
          </button>
        </div>
      )}

      {/* External Action Link URL */}
      {post.external_url && (
        <div className="px-4 py-3.5 border-t border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5 flex items-center justify-between">
          <div className="flex items-center gap-3 truncate">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <FiLink className="text-xl" />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-text truncate">Reference / Action Link</div>
              <div className="text-[10px] text-gray-500 truncate">{post.external_url}</div>
            </div>
          </div>
          <a
            href={post.external_url.startsWith('http') ? post.external_url : `https://${post.external_url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 flex items-center gap-1.5 shadow-sm transition"
          >
            <FiExternalLink /> Visit Link
          </a>
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
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-primary transition"
            title="Share Post"
          >
            <FiShare2 />
            <span>{sharesCount}</span>
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
            className={`flex items-center gap-1 text-sm font-bold transition ${
              saved ? 'text-yellow-500 scale-105' : 'text-gray-500 hover:text-yellow-500'
            }`}
            title={saved ? "Unsave" : "Save"}
          >
            <FiBookmark className={saved ? 'fill-current' : ''} />
            <span>{savedCount}</span>
          </button>
        </div>
      </div>

      {/* Nested Comments section */}
      {showComments && (
        <div className="border-t border-border bg-bg/20">
          <CommentSection 
            postId={post.id} 
            postOwnerUsername={post.username}
            onCommentAdded={() => setCommentsCount(prev => prev + 1)}
            onCommentDeleted={() => setCommentsCount(prev => Math.max(0, prev - 1))}
          />
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-sm w-full mx-4 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-text">
                Share this post
              </h3>
              <button 
                onClick={() => setShowShareModal(false)} 
                className="text-gray-400 hover:text-text font-bold text-lg"
              >
                &times;
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 py-2">
              <button
                onClick={() => handleShareToPlatform('whatsapp')}
                className="flex items-center justify-center gap-2 p-3 bg-green-500/10 hover:bg-green-500/20 text-green-600 rounded-xl text-xs font-bold transition duration-200"
              >
                <FaWhatsapp className="text-lg" /> WhatsApp
              </button>
              
              <button
                onClick={() => handleShareToPlatform('telegram')}
                className="flex items-center justify-center gap-2 p-3 bg-blue-400/10 hover:bg-blue-400/20 text-blue-500 rounded-xl text-xs font-bold transition duration-200"
              >
                <FaTelegram className="text-lg" /> Telegram
              </button>
              
              <button
                onClick={() => handleShareToPlatform('twitter')}
                className="flex items-center justify-center gap-2 p-3 bg-black/5 hover:bg-black/10 text-black dark:text-white rounded-xl text-xs font-bold transition duration-200"
              >
                <FaTwitter className="text-lg" /> Twitter / X
              </button>
              
              <button
                onClick={() => handleShareToPlatform('facebook')}
                className="flex items-center justify-center gap-2 p-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 rounded-xl text-xs font-bold transition duration-200"
              >
                <FaFacebook className="text-lg" /> Facebook
              </button>
              
              <button
                onClick={() => handleShareToPlatform('linkedin')}
                className="flex items-center justify-center gap-2 p-3 bg-blue-700/10 hover:bg-blue-700/20 text-blue-700 rounded-xl text-xs font-bold transition duration-200"
              >
                <FaLinkedin className="text-lg" /> LinkedIn
              </button>
              
              <button
                onClick={() => handleShareToPlatform('copy')}
                className="flex items-center justify-center gap-2 p-3 bg-gray-500/10 hover:bg-gray-500/20 text-gray-600 rounded-xl text-xs font-bold col-span-2 transition duration-200"
              >
                <FiLink className="text-lg" /> Copy Link
              </button>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 border border-border text-gray-500 rounded-xl text-xs font-bold hover:bg-bg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Post Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full mx-4 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-text">
                Report Post
              </h3>
              <button 
                onClick={() => setShowReportModal(false)} 
                className="text-gray-400 hover:text-text font-bold text-lg"
              >
                &times;
              </button>
            </div>
            
            {reportSuccess ? (
              <div className="bg-green-50 border border-green-200 text-green-700 text-xs px-4 py-3 rounded-xl text-center font-semibold animate-pulse">
                Thank you. The post has been reported to administrators.
              </div>
            ) : (
              <form onSubmit={handleReportPost} className="space-y-4">
                {reportError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-[11px] px-3 py-2 rounded-lg">
                    {reportError}
                  </div>
                )}
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Reason for Report
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    required
                    className="w-full bg-bg border border-border px-3.5 py-2.5 rounded-xl text-xs text-text focus:outline-none focus:border-primary font-semibold"
                  >
                    <option value="">Select a reason...</option>
                    <option value="Spam">Spam</option>
                    <option value="Fake News">Fake News</option>
                    <option value="Harassment">Harassment</option>
                    <option value="Hate Speech">Hate Speech</option>
                    <option value="Violence">Violence</option>
                    <option value="Copyright Violation">Copyright Violation</option>
                    <option value="Inappropriate Content">Inappropriate Content</option>
                    <option value="Misinformation">Misinformation</option>
                    <option value="Other">Other (Custom Reason)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Additional Details
                  </label>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Provide details about why you are reporting this post..."
                    rows="3"
                    className="w-full bg-bg border border-border px-3.5 py-2.5 rounded-xl text-xs text-text focus:outline-none focus:border-primary font-semibold"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2 border border-border text-gray-500 rounded-xl text-xs font-bold hover:bg-bg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reportSubmitting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md shadow-red-600/10"
                  >
                    {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default PostCard;
