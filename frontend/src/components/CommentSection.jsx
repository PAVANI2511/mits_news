import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { commentsAPI, getMediaUrl } from '../services/api';
import { FiCornerDownRight, FiTrash2, FiSend, FiEdit2, FiHeart, FiX, FiCheck, FiThumbsUp } from 'react-icons/fi';

const reactionEmojis = {
  like: '👍',
  love: '❤️',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡'
};

const reactionNames = {
  like: 'Like',
  love: 'Love',
  haha: 'Haha',
  wow: 'Wow',
  sad: 'Sad',
  angry: 'Angry'
};

const reactionColors = {
  like: 'text-blue-500 font-bold',
  love: 'text-red-500 font-bold',
  haha: 'text-yellow-600 font-bold',
  wow: 'text-yellow-600 font-bold',
  sad: 'text-yellow-600 font-bold',
  angry: 'text-orange-600 font-bold'
};

const CommentNode = ({
  comment,
  user,
  isAuthenticated,
  isPostOwner,
  activeReplyBox,
  setActiveReplyBox,
  replyTexts,
  handleReplyChange,
  handleAddReply,
  editingCommentId,
  setEditingCommentId,
  editText,
  setEditText,
  handleEditComment,
  handleDeleteComment,
  handleReactComment,
  handleShowReactionsUsersList,
  handlePinComment,
  handleHideComment,
  depth = 0
}) => {
  const isMyComment = user && String(comment.user?.id || comment.user_id) === String(user.id);
  const canDeleteComment = isMyComment || isPostOwner || user?.is_staff || user?.is_superuser;
  const canEditComment = isMyComment || user?.is_staff || user?.is_superuser;
  const isEditing = editingCommentId === comment.id;

  const [showPopover, setShowPopover] = useState(false);
  let hoverTimeout = null;

  const handleMouseEnter = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setShowPopover(true);
  };

  const handleMouseLeave = () => {
    hoverTimeout = setTimeout(() => {
      setShowPopover(false);
    }, 450);
  };

  const activeEmojis = Object.entries(comment.reactions_summary || {})
    .filter(([type, count]) => count > 0)
    .map(([type]) => reactionEmojis[type]);

  const currentEmoji = comment.my_reaction ? reactionEmojis[comment.my_reaction] : null;
  const currentName = comment.my_reaction ? reactionNames[comment.my_reaction] : 'Like';
  const currentColor = comment.my_reaction ? reactionColors[comment.my_reaction] : 'hover:text-primary';

  return (
    <div className={`mt-3 ${depth > 0 ? 'ml-6 pl-3 border-l-2 border-border/40' : 'border-b border-border/20 pb-3.5 last:border-b-0'}`}>
      {comment.is_pinned && depth === 0 && (
        <div className="flex items-center gap-1 text-[9px] text-yellow-600 font-extrabold uppercase tracking-wider mb-1">
          📌 Pinned Comment
        </div>
      )}
      {comment.is_hidden && (
        <div className="flex items-center gap-1 text-[9px] text-purple-600 font-extrabold uppercase tracking-wider mb-1">
          🔒 Hidden by Post Owner
        </div>
      )}

      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <img
            src={getMediaUrl(comment.user?.profile?.profile_pic) || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23a0aec0"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'}
            alt={comment.user?.username || comment.username}
            className="h-7 w-7 rounded-full object-cover border border-border shrink-0 bg-card shadow-sm"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="text-xs font-bold text-text truncate">
                {comment.user?.profile?.name || comment.name || comment.username || comment.user?.username}
              </span>
              <span className="text-[9px] text-gray-400 shrink-0">
                {comment.created_at ? new Date(comment.created_at).toLocaleDateString(undefined, {hour: '2-digit', minute:'2-digit'}) : ''}
              </span>
              {comment.is_edited && (
                <span className="text-[8px] font-medium bg-primary/10 text-primary px-1 py-0.5 rounded shrink-0" title="Edited">
                  Edited
                </span>
              )}
            </div>

            {isEditing ? (
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-bg border border-border focus:outline-none focus:ring-1 focus:ring-primary text-text"
                  autoFocus
                />
                <button
                  onClick={() => handleEditComment(comment.id)}
                  className="p-1.5 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg transition"
                >
                  <FiCheck className="text-xs" />
                </button>
                <button
                  onClick={() => setEditingCommentId(null)}
                  className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition"
                >
                  <FiX className="text-xs" />
                </button>
              </div>
            ) : (
              <p className={`text-xs text-text mt-0.5 leading-relaxed break-words ${comment.is_deleted ? 'italic text-gray-400 bg-bg/50 px-2 py-1 rounded border border-dashed border-border/50' : ''} ${comment.is_hidden ? 'text-gray-400 italic' : ''}`}>
                {comment.content}
              </p>
            )}

            {/* Sub-actions bar (Reactions, Reply, Edit) */}
            {(!comment.is_deleted || user?.is_staff || user?.is_superuser) && (
              <div className="flex items-center gap-4 mt-1.5 text-gray-400">
                {isAuthenticated && !comment.is_deleted && (
                  <div 
                    className="relative"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    {/* Reactions Popover */}
                    {showPopover && (
                      <div className="absolute bottom-full left-0 mb-2 bg-card border border-border px-3 py-1.5 rounded-full shadow-2xl flex gap-2.5 items-center animate-slideUp z-30 hover:scale-105 transition duration-150">
                        {Object.entries(reactionEmojis).map(([type, emoji]) => (
                          <button
                            key={type}
                            onClick={() => {
                              handleReactComment(comment.id, type);
                              setShowPopover(false);
                            }}
                            className="text-base hover:scale-130 transition transform duration-100 origin-bottom"
                            title={reactionNames[type]}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => handleReactComment(comment.id, comment.my_reaction || 'like')}
                      className={`flex items-center gap-1 text-[10px] font-semibold transition ${currentColor}`}
                    >
                      {currentEmoji ? (
                        <span>{currentEmoji}</span>
                      ) : (
                        <FiThumbsUp />
                      )}
                      <span>{currentName}</span>
                    </button>
                  </div>
                )}

                {/* Show Reactions Summary list */}
                {comment.total_reactions > 0 && (
                  <button
                    onClick={() => handleShowReactionsUsersList(comment.id)}
                    className="flex items-center gap-1 text-[10px] text-gray-400 font-bold hover:underline"
                    title="View who reacted"
                  >
                    <span className="flex items-center tracking-tight">
                      {activeEmojis.slice(0, 3).join('')}
                    </span>
                    <span>{comment.total_reactions}</span>
                  </button>
                )}

                {isAuthenticated && !comment.is_deleted && (
                  <button
                    onClick={() => setActiveReplyBox(activeReplyBox === comment.id ? null : comment.id)}
                    className={`text-[10px] font-bold hover:underline transition ${
                      activeReplyBox === comment.id ? 'text-primary font-extrabold' : 'hover:text-primary'
                    }`}
                  >
                    Reply
                  </button>
                )}

                {!isEditing && canEditComment && !comment.is_deleted && (
                  <button
                    onClick={() => {
                      setEditingCommentId(comment.id);
                      setEditText(comment.content);
                    }}
                    className="hover:text-primary transition p-0.5"
                    title="Edit"
                  >
                    <FiEdit2 className="text-[11px]" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right side moderation controls (Pin, Hide, Delete) */}
        {(!comment.is_deleted || user?.is_staff || user?.is_superuser) && (
          <div className="flex items-center gap-2.5 shrink-0 self-center">
            {isPostOwner && !comment.is_deleted && (
              <>
                <button
                  onClick={() => handlePinComment(comment.id, comment.is_pinned)}
                  className={`text-xs transition ${
                    comment.is_pinned ? 'opacity-100 scale-110' : 'opacity-40 hover:opacity-100'
                  }`}
                  title={comment.is_pinned ? "Unpin comment" : "Pin comment to top"}
                >
                  📌
                </button>
                <button
                  onClick={() => handleHideComment(comment.id, comment.is_hidden)}
                  className={`text-[10px] font-bold hover:underline transition ${
                    comment.is_hidden ? 'text-purple-600' : 'text-gray-400 hover:text-purple-600'
                  }`}
                  title={comment.is_hidden ? "Unhide comment" : "Hide comment"}
                >
                  {comment.is_hidden ? 'Unhide' : 'Hide'}
                </button>
              </>
            )}

            {canDeleteComment && !comment.is_deleted && (
              <button
                onClick={() => handleDeleteComment(comment.id)}
                className="text-gray-400 hover:text-red-500 transition p-0.5"
                title="Delete"
              >
                <FiTrash2 className="text-[11px]" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Reply input box */}
      {activeReplyBox === comment.id && (
        <div className="mt-2 ml-4 flex gap-2">
          <input
            type="text"
            placeholder="Write a reply..."
            value={replyTexts[comment.id] || ''}
            onChange={(e) => handleReplyChange(comment.id, e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-bg border border-border focus:outline-none focus:ring-1 focus:ring-primary text-text font-normal"
          />
          <button
            onClick={() => handleAddReply(comment.id)}
            className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/95 text-xs font-semibold flex items-center justify-center transition"
          >
            Reply
          </button>
        </div>
      )}

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-1">
          {comment.replies.map((reply) => (
            <CommentNode
              key={reply.id}
              comment={reply}
              user={user}
              isAuthenticated={isAuthenticated}
              isPostOwner={isPostOwner}
              activeReplyBox={activeReplyBox}
              setActiveReplyBox={setActiveReplyBox}
              replyTexts={replyTexts}
              handleReplyChange={handleReplyChange}
              handleAddReply={handleAddReply}
              editingCommentId={editingCommentId}
              setEditingCommentId={setEditingCommentId}
              editText={editText}
              setEditText={setEditText}
              handleEditComment={handleEditComment}
              handleDeleteComment={handleDeleteComment}
              handleReactComment={handleReactComment}
              handleShowReactionsUsersList={handleShowReactionsUsersList}
              handlePinComment={handlePinComment}
              handleHideComment={handleHideComment}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CommentSection = ({ postId, postOwnerUsername, onCommentAdded, onCommentDeleted }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyTexts, setReplyTexts] = useState({});
  const [activeReplyBox, setActiveReplyBox] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText] = useState('');
  const [error, setError] = useState('');

  // Reactions modal states
  const [showReactionsModalId, setShowReactionsModalId] = useState(null);
  const [reactingUsers, setReactingUsers] = useState([]);
  const [reactingUsersLoading, setReactingUsersLoading] = useState(false);

  const isPostOwner = user && String(postOwnerUsername) === String(user.username);

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    try {
      const res = await commentsAPI.getList(postId);
      setComments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setError("Please log in to add comments.");
      return;
    }
    if (!newCommentText.trim()) return;

    try {
      await commentsAPI.add(postId, newCommentText);
      setNewCommentText('');
      setError('');
      loadComments();
      if (onCommentAdded) onCommentAdded();
    } catch (err) {
      setError("Failed to post comment.");
    }
  };

  const handleAddReply = async (commentId) => {
    if (!isAuthenticated) {
      setError("Please log in to reply.");
      return;
    }
    const replyText = replyTexts[commentId] || '';
    if (!replyText.trim()) return;

    try {
      await commentsAPI.addReply(commentId, replyText);
      setReplyTexts(prev => ({ ...prev, [commentId]: '' }));
      setActiveReplyBox(null);
      setError('');
      loadComments();
    } catch (err) {
      setError("Failed to post reply.");
    }
  };

  const handleEditComment = async (commentId) => {
    if (!editText.trim()) return;
    try {
      const res = await commentsAPI.update(commentId, editText);
      
      const updateTree = (list) => {
        return list.map(c => {
          if (c.id === commentId) {
            return { ...c, content: res.data.content, is_edited: true };
          }
          if (c.replies && c.replies.length > 0) {
            return { ...c, replies: updateTree(c.replies) };
          }
          return c;
        });
      };
      setComments(prev => updateTree(prev));
      setEditingCommentId(null);
      setEditText('');
    } catch (err) {
      setError("Failed to edit comment.");
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      try {
        const res = await commentsAPI.delete(commentId);
        
        const updateTree = (list) => {
          return list.map(c => {
            if (c.id === commentId) {
              return { ...c, ...res.data.comment, content: "This comment was deleted." };
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: updateTree(c.replies) };
            }
            return c;
          });
        };
        setComments(prev => updateTree(prev));
        if (onCommentDeleted) onCommentDeleted();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleReactComment = async (commentId, reactionType) => {
    try {
      const res = await commentsAPI.react(commentId, reactionType);
      
      const updateTree = (list) => {
        return list.map(c => {
          if (c.id === commentId) {
            return {
              ...c,
              my_reaction: res.data.my_reaction,
              total_reactions: res.data.total_reactions,
              reactions_summary: res.data.reactions_summary,
              is_liked: res.data.my_reaction !== null,
              likes_count: res.data.total_reactions
            };
          }
          if (c.replies && c.replies.length > 0) {
            return { ...c, replies: updateTree(c.replies) };
          }
          return c;
        });
      };
      setComments(prev => updateTree(prev));
    } catch (err) {
      console.error(err);
    }
  };

  const handleShowReactionsUsersList = async (commentId) => {
    setShowReactionsModalId(commentId);
    setReactingUsersLoading(true);
    try {
      const res = await commentsAPI.getReactionsUsers(commentId);
      setReactingUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setReactingUsersLoading(false);
    }
  };

  const handlePinComment = async (commentId, isCurrentlyPinned) => {
    try {
      if (isCurrentlyPinned) {
        await commentsAPI.unpin(commentId);
      } else {
        await commentsAPI.pin(commentId);
      }
      loadComments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleHideComment = async (commentId, isCurrentlyHidden) => {
    try {
      if (isCurrentlyHidden) {
        await commentsAPI.unhide(commentId);
      } else {
        await commentsAPI.hide(commentId);
      }
      loadComments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReplyChange = (commentId, text) => {
    setReplyTexts(prev => ({ ...prev, [commentId]: text }));
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Discussion</h4>
        {isPostOwner && (
          <span className="text-[10px] bg-purple-100 text-purple-700 font-extrabold uppercase px-2 py-0.5 rounded tracking-wider">
            Comment Moderator
          </span>
        )}
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-xs px-3 py-1.5 rounded-lg">
          {error}
        </div>
      )}

      {/* Add Comment Input */}
      {isAuthenticated ? (
        <form onSubmit={handleAddComment} className="flex gap-2">
          <input
            type="text"
            placeholder="Write a comment..."
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            className="flex-1 px-4 py-2 text-xs rounded-xl bg-bg border border-border focus:outline-none focus:ring-1 focus:ring-primary text-text font-normal"
          />
          <button
            type="submit"
            className="p-2.5 bg-primary text-white rounded-xl hover:bg-primary/95 transition flex items-center justify-center"
          >
            <FiSend className="text-xs" />
          </button>
        </form>
      ) : (
        <p className="text-xs text-gray-500 italic">Please log in to write comments.</p>
      )}

      {/* Comments List */}
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-4">No comments yet. Start the conversation!</p>
        ) : (
          comments.map((comment) => (
            <CommentNode
              key={comment.id}
              comment={comment}
              user={user}
              isAuthenticated={isAuthenticated}
              isPostOwner={isPostOwner}
              activeReplyBox={activeReplyBox}
              setActiveReplyBox={setActiveReplyBox}
              replyTexts={replyTexts}
              handleReplyChange={handleReplyChange}
              handleAddReply={handleAddReply}
              editingCommentId={editingCommentId}
              setEditingCommentId={setEditingCommentId}
              editText={editText}
              setEditText={setEditText}
              handleEditComment={handleEditComment}
              handleDeleteComment={handleDeleteComment}
              handleReactComment={handleReactComment}
              handleShowReactionsUsersList={handleShowReactionsUsersList}
              handlePinComment={handlePinComment}
              handleHideComment={handleHideComment}
            />
          ))
        )}
      </div>

      {/* Reactions Users List Modal */}
      {showReactionsModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-sm w-full mx-4 shadow-xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4 shrink-0">
              <h3 className="text-sm font-black uppercase tracking-wider text-text">
                Reactions
              </h3>
              <button 
                onClick={() => {
                  setShowReactionsModalId(null);
                  setReactingUsers([]);
                }} 
                className="text-gray-400 hover:text-text font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {reactingUsersLoading ? (
                <div className="py-8 text-center text-gray-500 flex flex-col items-center">
                  <div className="h-6 w-6 rounded-full border-3 border-primary border-t-transparent animate-spin mb-2" />
                  <span className="text-xs">Loading list...</span>
                </div>
              ) : reactingUsers.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-6">
                  No reactions yet.
                </p>
              ) : (
                reactingUsers.map((r, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-bg transition"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={getMediaUrl(r.profile_pic) || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23a0aec0"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'}
                        alt={r.username}
                        className="h-9 w-9 rounded-full object-cover border border-border bg-card"
                      />
                      <span className="absolute -bottom-1 -right-1 text-sm bg-card rounded-full p-0.5 border border-border shadow-xs">
                        {r.emoji}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-text block truncate">{r.name}</span>
                      <span className="text-[10px] text-gray-400 block truncate">@{r.username}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-border/60 pt-3 mt-4 flex justify-end shrink-0">
              <button
                onClick={() => {
                  setShowReactionsModalId(null);
                  setReactingUsers([]);
                }}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold transition hover:bg-primary/90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentSection;
