import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  FiHeart, FiMessageSquare, FiBookmark, FiDownload, 
  FiShare2, FiMapPin, FiFileText, FiUserCheck, FiUserPlus,
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

  const [audioMuted, setAudioMuted] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [_isPlaying, setIsPlaying] = useState(false);

  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  const audioMutedRef = useRef(audioMuted);
  useEffect(() => {
    audioMutedRef.current = audioMuted;
  }, [audioMuted]);

  // Play / Pause helper functions
  const playMedia = useCallback(() => {
    const isMuted = audioMutedRef.current;
    if (post.video && videoRef.current) {
      videoRef.current.currentTime = 0; // Play from starting
      videoRef.current.muted = isMuted;
      videoRef.current.play().catch((err) => {
        console.log("Video playback blocked by browser policies:", err);
      });
      setIsPlaying(true);
    }
    if (post.audio && audioRef.current) {
      audioRef.current.currentTime = 0; // Play from starting
      audioRef.current.muted = isMuted;
      if (!isMuted) {
        audioRef.current.play().catch((err) => {
          console.log("Audio playback blocked by browser policies:", err);
        });
        setIsPlaying(true);
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [post.video, post.audio]);

  const pauseMedia = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  }, []);

  // Sync video element muted property with audioMuted state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = audioMuted;
    }
  }, [audioMuted]);

  // Handle toggleMute explicitly
  const toggleMute = () => {
    const newMuted = !audioMuted;
    setAudioMuted(newMuted);
    
    // Broadcast mute state globally so all posts stay synced
    window.dispatchEvent(new CustomEvent('global-mute-toggle', { detail: { muted: newMuted } }));

    // Update local media state immediately
    if (videoRef.current) {
      videoRef.current.muted = newMuted;
    }
    
    if (post.audio && audioRef.current) {
      audioRef.current.muted = newMuted;
      if (!newMuted && isActive) {
        audioRef.current.play().catch(err => console.log("Play failed:", err));
        setIsPlaying(true);
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  // Sync mute state globally
  useEffect(() => {
    const handleGlobalMute = (e) => {
      setAudioMuted(e.detail.muted);
      if (videoRef.current) {
        videoRef.current.muted = e.detail.muted;
      }
      if (audioRef.current) {
        audioRef.current.muted = e.detail.muted;
        if (e.detail.muted) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else if (isActive) {
          audioRef.current.play().catch(err => console.log("Play failed:", err));
          setIsPlaying(true);
        }
      }
    };
    window.addEventListener('global-mute-toggle', handleGlobalMute);
    return () => {
      window.removeEventListener('global-mute-toggle', handleGlobalMute);
    };
  }, [post.id, isActive]);

  // Set up Intersection Observer to trigger autoplay at >= 60% visibility
  useEffect(() => {
    const observerOptions = {
      root: null, // viewport
      threshold: 0.6 // 60% visibility
    };

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          // Tell other cards to pause, and flag this card as active
          window.dispatchEvent(new CustomEvent('post-media-visible', { detail: { postId: post.id } }));
        } else {
          setIsActive(false);
          pauseMedia();
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [post.id, pauseMedia]);

  // Listen to other posts playing, and browser tab visibility / window focus loss
  useEffect(() => {
    const handleMediaVisible = (e) => {
      if (e.detail.postId === post.id) {
        setIsActive(true);
        playMedia();
      } else {
        setIsActive(false);
        pauseMedia();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        pauseMedia();
      }
    };

    const handleBlur = () => {
      pauseMedia();
    };

    window.addEventListener('post-media-visible', handleMediaVisible);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('post-media-visible', handleMediaVisible);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      pauseMedia(); // Pause immediately when navigating away / unmounting
    };
  }, [post.id, playMedia, pauseMedia]);



  const [liked, setLiked] = useState(post.is_liked || false);
  const [currentInterest, setCurrentInterest] = useState(post.interest_status || null);
  const [categoryFollowed, setCategoryFollowed] = useState(post.category?.is_followed || false);

  const isRegistrationClosed = post.last_date ? new Date(post.last_date) < new Date() : false;
  const isEventCompleted = post.event_date ? new Date(post.event_date) < new Date() : false;
  const isExpired = isRegistrationClosed || isEventCompleted;

  const handleCategoryFollowToggle = async (catId) => {
    if (!isAuthenticated) {
      setErrorMessage("Please log in to follow categories.");
      return;
    }

    const nextState = !categoryFollowed;
    const previousState = categoryFollowed;

    setCategoryFollowed(nextState);

    try {
      if (previousState) {
        await postsAPI.unfollowCategory(catId);
      } else {
        await postsAPI.followCategory(catId);
      }
    } catch (err) {
      console.error(err);
      setCategoryFollowed(previousState);
      setErrorMessage("Failed to update category follow status.");
    }
  };

  const handleInterestSelection = async (status) => {
    if (!isAuthenticated) {
      setErrorMessage("Please log in to respond to events.");
      return;
    }

    const newStatus = currentInterest === status ? '' : status;
    const prevStatus = currentInterest;

    setCurrentInterest(newStatus || null);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await postsAPI.setInterest(post.id, newStatus);
      setCurrentInterest(res.data.interest_status);
      if (res.data.interest_status === 'interested') {
        if (post.event_date || post.last_date) {
          setSuccessMessage("Interest registered! A confirmation email with event details has been sent.");
        } else {
          setSuccessMessage("Interest registered successfully!");
        }
      } else if (res.data.interest_status === 'not_interested') {
        setSuccessMessage("Status updated to Not Interested.");
      } else {
        setSuccessMessage("Interest cleared.");
      }
    } catch (err) {
      console.error(err);
      setCurrentInterest(prevStatus);
      setErrorMessage("Failed to update event interest selection.");
    }
  };
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [saved, setSaved] = useState(post.is_saved || false);
  const [savedCount, setSavedCount] = useState(post.saved_count || 0);
  const [sharesCount, setSharesCount] = useState(post.share_count || 0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [following, setFollowing] = useState(post.is_following || false);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
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
    if (isLiking) return;

    const prevLiked = liked;
    const prevLikesCount = likesCount;

    // Optimistic update
    setLiked(!prevLiked);
    setLikesCount(prev => prevLiked ? Math.max(0, prev - 1) : prev + 1);
    setIsLiking(true);
    setErrorMessage('');

    try {
      let response;
      if (prevLiked) {
        response = await postsAPI.unlike(post.id);
      } else {
        response = await postsAPI.like(post.id);
      }

      if (response && response.data) {
        setLiked(response.data.is_liked);
        setLikesCount(response.data.likes_count);
      }
    } catch (err) {
      console.error(err);
      // Revert optimistic update
      setLiked(prevLiked);
      setLikesCount(prevLikesCount);
      setErrorMessage(err.response?.data?.error || err.response?.data?.message || "Failed to update like status.");
    } finally {
      setIsLiking(false);
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
      
      let filename = mediaUrl.split('/').pop() || `download.${mediaType}`;
      const ext = filename.includes('.') ? filename.split('.').pop().toLowerCase() : '';
      const validExtensions = {
        pdf: ['pdf'],
        audio: ['mp3', 'wav', 'ogg', 'm4a', 'aac'],
        video: ['mp4', 'webm', 'ogg', 'mov', 'avi'],
        image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
        poster: ['jpg', 'jpeg', 'png', 'webp']
      };
      
      const allowed = validExtensions[mediaType] || [mediaType];
      if (!allowed.includes(ext)) {
        filename = `${filename}.${allowed[0]}`;
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (_err) {
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
    <div ref={containerRef} className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden transition-all duration-300">
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
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link to={`/profile/${post.username}`} className="font-serif text-sm font-bold text-gray-900 hover:text-[#800000] hover:underline">
                {post.name || post.username}
              </Link>
              {post.category && (
                <div className="flex items-center gap-1 shrink-0 bg-[#800000]/10 pl-2 pr-1 py-0.5 rounded-full">
                  <span className="text-[#800000] font-serif text-[9px] font-bold uppercase tracking-wider">
                    {post.category.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleCategoryFollowToggle(post.category.id);
                    }}
                    className={`text-[8px] font-serif font-extrabold px-1.5 py-0.5 rounded-full transition-colors uppercase ${
                      categoryFollowed
                        ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        : 'bg-[#800000] text-white hover:bg-[#660000]'
                    }`}
                  >
                    {categoryFollowed ? 'Unfollow' : 'Follow'}
                  </button>
                </div>
              )}
              {post.location && (
                <span className="font-serif text-xs text-gray-400 flex items-center gap-0.5">
                  • <FiMapPin className="inline text-[10px]" /> {post.location}
                </span>
              )}
            </div>
            <div className="font-serif text-[10px] text-gray-500 font-semibold">{post.email}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-serif text-xs text-gray-400">{formattedDate}</span>
          {!isOwner && isAuthenticated && (
            <button
              onClick={handleFollow}
              className={`px-3 py-1 rounded-full font-serif text-xs font-bold transition flex items-center gap-1 ${
                following 
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                  : 'bg-[#800000]/10 text-[#800000] hover:bg-[#800000]/20'
              }`}
            >
              {following ? <><FiUserCheck /> Following</> : <><FiUserPlus /> Follow</>}
            </button>
          )}
          {(isOwner || isAdmin) && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate(`/posts/${post.id}/edit`)}
                className="font-serif text-xs px-2.5 py-1 text-[#800000] hover:bg-[#800000]/10 rounded-lg transition font-semibold"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="font-serif text-xs px-2.5 py-1 text-red-600 hover:bg-red-50 rounded-lg transition font-semibold"
              >
                Delete
              </button>
            </div>
          )}
          {!isOwner && isAuthenticated && (
            <button
              onClick={() => setShowReportModal(true)}
              className="font-serif text-xs px-2.5 py-1 text-red-600 hover:bg-red-50 rounded-lg transition font-semibold"
            >
              Report Post
            </button>
          )}
        </div>
      </div>


      {/* Main Content */}
      <div className="px-5 pb-4">
        {post.caption && (
          <p className="font-serif text-base text-gray-900 whitespace-pre-wrap leading-relaxed">
            {post.caption}
          </p>
        )}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {post.hashtags.map((tag) => (
              <span 
                key={tag} 
                className="font-serif text-xs font-semibold text-[#800000] hover:underline cursor-pointer"
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
            ref={videoRef}
            src={getMediaUrl(post.video)}
            controls
            muted={audioMuted}
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
              <div className="text-xs font-bold text-text truncate">
                {post.pdf ? decodeURIComponent(post.pdf.split('/').pop().split('?')[0]) : 'College Document (PDF)'}
              </div>
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
            loop
            muted={audioMuted}
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

      {/* Event Schedule Info Panel */}
      <div className={`mx-4 mt-3 p-4 rounded-2xl bg-bg/50 border border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${isExpired ? 'opacity-75' : ''}`}>
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className={`text-[10px] font-black uppercase tracking-wider ${
            isEventCompleted 
              ? 'text-gray-500' 
              : isRegistrationClosed 
                ? 'text-orange-500' 
                : 'text-primary'
          }`}>
            {isEventCompleted 
              ? 'Event Completed' 
              : isRegistrationClosed 
                ? 'Registration Closed' 
                : 'MITS Campus Activity'}
          </div>
          {post.event_date && (
            <div className="text-xs text-text flex items-center gap-1.5">
              <span className="font-bold text-gray-500">Event Date:</span>
              <span className="font-semibold text-text">{new Date(post.event_date).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
          {post.last_date && (
            <div className="text-xs text-text flex items-center gap-1.5">
              <span className="font-bold text-gray-500">Reg. Closes:</span>
              <span className={isRegistrationClosed ? 'text-gray-500 font-semibold' : 'text-red-500 font-bold'}>
                {new Date(post.last_date).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={() => !isExpired && handleInterestSelection('interested')}
            disabled={isExpired}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm ${
              isExpired
                ? currentInterest === 'interested'
                  ? 'bg-green-500/50 text-white cursor-not-allowed'
                  : 'bg-card border border-border text-gray-400 cursor-not-allowed'
                : currentInterest === 'interested'
                  ? 'bg-green-500 text-white shadow-green-500/10'
                  : 'bg-card border border-border text-gray-500 hover:text-green-500 hover:bg-green-500/5'
            }`}
          >
            👍 Interested
          </button>
          <button
            onClick={() => !isExpired && handleInterestSelection('not_interested')}
            disabled={isExpired}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm ${
              isExpired
                ? currentInterest === 'not_interested'
                  ? 'bg-gray-500/50 text-white cursor-not-allowed'
                  : 'bg-card border border-border text-gray-400 cursor-not-allowed'
                : currentInterest === 'not_interested'
                  ? 'bg-gray-500 text-white shadow-sm'
                  : 'bg-card border border-border text-gray-500 hover:text-red-500 hover:bg-red-500/5'
            }`}
          >
            👎 Not Interested
          </button>
        </div>
      </div>

      {/* Alerts / Error messages */}
      {errorMessage && (
        <div className="mx-4 mt-3 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} className="font-bold ml-2">×</button>
        </div>
      )}

      {successMessage && (
        <div className="mx-4 mt-3 bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-2 rounded-lg flex items-center justify-between animate-fadeIn">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="font-bold ml-2">×</button>
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
            disabled={isLiking}
            className={`flex items-center gap-1 text-sm font-bold transition ${
              liked ? 'text-red-500 scale-105' : 'text-gray-500 hover:text-red-500'
            } ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
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
