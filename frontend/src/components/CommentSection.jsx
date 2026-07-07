import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { commentsAPI, getMediaUrl } from '../services/api';
import { FiCornerDownRight, FiTrash2, FiSend } from 'react-icons/fi';

const CommentSection = ({ postId, onCommentAdded, onCommentDeleted }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyTexts, setReplyTexts] = useState({}); // commentId -> replyText
  const [activeReplyBox, setActiveReplyBox] = useState(null); // commentId
  const [error, setError] = useState('');

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
      const res = await commentsAPI.add(postId, newCommentText);
      setComments(prev => [res.data, ...prev]);
      setNewCommentText('');
      setError('');
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
      const res = await commentsAPI.addReply(commentId, replyText);
      // Update local comment document with fresh data (including nested replies)
      setComments(prev => prev.map(c => c.id === commentId ? res.data : c));
      setReplyTexts(prev => ({ ...prev, [commentId]: '' }));
      setActiveReplyBox(null);
      setError('');
    } catch (err) {
      setError("Failed to post reply.");
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (window.confirm("Delete this comment?")) {
      try {
        await commentsAPI.delete(commentId);
        setComments(prev => prev.filter(c => c.id !== commentId));
        if (onCommentDeleted) onCommentDeleted();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleReplyChange = (commentId, text) => {
    setReplyTexts(prev => ({ ...prev, [commentId]: text }));
  };

  return (
    <div className="p-4 space-y-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Discussion</h4>
      
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
            className="flex-1 px-4 py-2 text-xs rounded-xl bg-bg border border-border focus:outline-none focus:ring-1 focus:ring-primary"
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
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-2">No comments yet. Start the conversation!</p>
        ) : (
          comments.map((comment) => {
            const isMyComment = user && String(comment.user_id) === String(user.id);
            const canDeleteComment = isMyComment || user?.is_staff || user?.is_superuser;
            
            return (
              <div key={comment.id} className="border-b border-border/30 pb-3 last:border-b-0">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <img
                      src={getMediaUrl(comment.profile_pic) || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23a0aec0"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'}
                      alt={comment.username}
                      className="h-7 w-7 rounded-full object-cover border border-border"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-text">{comment.name || comment.username}</span>
                        <span className="text-[9px] text-gray-400">
                          {comment.created_at ? new Date(comment.created_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <p className="text-xs text-text mt-0.5 leading-relaxed">{comment.text}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isAuthenticated && (
                      <button
                        onClick={() => setActiveReplyBox(activeReplyBox === comment.id ? null : comment.id)}
                        className="text-[10px] text-primary font-bold hover:underline"
                      >
                        Reply
                      </button>
                    )}
                    {canDeleteComment && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded transition"
                        title="Delete comment"
                      >
                        <FiTrash2 className="text-xs" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Nested Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-2.5 ml-8 space-y-2.5 border-l-2 border-border/60 pl-3">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex items-start gap-2">
                        <FiCornerDownRight className="text-gray-400 text-xs mt-1 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-text">{reply.name || reply.username}</span>
                            <span className="text-[8px] text-gray-400">
                              {reply.created_at ? new Date(reply.created_at).toLocaleDateString() : ''}
                            </span>
                          </div>
                          <p className="text-xs text-text mt-0.5 leading-relaxed">{reply.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Input Box */}
                {activeReplyBox === comment.id && (
                  <div className="mt-2 ml-8 flex gap-2">
                    <input
                      type="text"
                      placeholder="Write a reply..."
                      value={replyTexts[comment.id] || ''}
                      onChange={(e) => handleReplyChange(comment.id, e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-bg border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      onClick={() => handleAddReply(comment.id)}
                      className="px-3.5 bg-primary text-white rounded-lg hover:bg-primary/95 text-xs font-semibold flex items-center justify-center transition"
                    >
                      Reply
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CommentSection;
