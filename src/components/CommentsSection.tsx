'use client';

import { useEffect, useState, useCallback } from 'react';
import { campaignCommentsService, CampaignComment } from '@/lib/pocketbase';
import { useActiveAccount } from 'thirdweb/react';
import { FaHeart, FaReply, FaTrash, FaPaperPlane } from 'react-icons/fa';
import { useToast } from './Toast';

interface CommentWithReplies extends CampaignComment {
  replies?: CampaignComment[];
}

export const CommentsSection: React.FC<{ campaignAddress: string; creatorAddress: string }> = ({ campaignAddress, creatorAddress }) => {
  const account = useActiveAccount();
  const { showSuccess, showError } = useToast();
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      setIsLoading(true);
      const fetchedComments = await campaignCommentsService.getByCampaign(campaignAddress);
      
      // Fetch replies for each comment
      const commentsWithReplies = await Promise.all(
        fetchedComments.map(async (comment) => {
          const replies = await campaignCommentsService.getReplies(comment.id!);
          return { ...comment, replies };
        })
      );
      
      setComments(commentsWithReplies);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [campaignAddress]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmitComment = async () => {
    if (!account?.address) {
      showError('Connect Wallet', 'Please connect your wallet to comment');
      return;
    }

    if (!newComment.trim()) {
      showError('Empty Comment', 'Please write something');
      return;
    }

    setIsSubmitting(true);
    try {
      await campaignCommentsService.create({
        campaign_address: campaignAddress,
        commenter_address: account.address,
        commenter_name: `${account.address.slice(0, 6)}...${account.address.slice(-4)}`,
        content: newComment,
        is_creator: account.address.toLowerCase() === creatorAddress.toLowerCase()
      });

      setNewComment('');
      showSuccess('Comment Posted', 'Your comment has been added!');
      fetchComments();
    } catch (error) {
      console.error('Error posting comment:', error);
      showError('Error', 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!account?.address) {
      showError('Connect Wallet', 'Please connect your wallet to reply');
      return;
    }

    if (!replyContent.trim()) {
      showError('Empty Reply', 'Please write something');
      return;
    }

    setIsSubmitting(true);
    try {
      await campaignCommentsService.create({
        campaign_address: campaignAddress,
        commenter_address: account.address,
        commenter_name: `${account.address.slice(0, 6)}...${account.address.slice(-4)}`,
        content: replyContent,
        reply_to_id: parentCommentId,
        is_creator: account.address.toLowerCase() === creatorAddress.toLowerCase()
      });

      setReplyContent('');
      setReplyingTo(null);
      showSuccess('Reply Posted', 'Your reply has been added!');
      fetchComments();
    } catch (error) {
      console.error('Error posting reply:', error);
      showError('Error', 'Failed to post reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await campaignCommentsService.delete(commentId);
      showSuccess('Deleted', 'Comment has been removed');
      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      showError('Error', 'Failed to delete comment');
    }
  };

  const handleLike = async (comment: CampaignComment) => {
    try {
      await campaignCommentsService.update(comment.id!, {
        likes: (comment.likes || 0) + 1
      });
      fetchComments();
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Community Comments</h2>

      {/* New Comment Input */}
      {account?.address ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-2 mb-3 border border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                {account.address.slice(0, 1).toUpperCase()}
              </div>
            </div>
            <div className="flex-grow">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share thoughts..."
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                rows={2}
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={handleSubmitComment}
                  disabled={isSubmitting || !newComment.trim()}
                  className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
                >
                  <FaPaperPlane className="text-xs" />
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-2 mb-3 text-blue-900 dark:text-blue-100 text-sm">
          Connect wallet to comment
        </div>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full" />
          </div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">No comments yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
              {/* Main Comment */}
              <div className="flex gap-2">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                    {comment.commenter_name?.[0] || '?'}
                  </div>
                </div>
                <div className="flex-grow">
                  <div className="flex items-center gap-1 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {comment.commenter_name}
                    </span>
                    {comment.is_creator && (
                      <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap">
                        Creator
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-2 text-sm">{comment.content}</p>
                  
                  {/* Comment Actions */}
                  <div className="flex items-center gap-3 text-xs">
                    <button
                      onClick={() => handleLike(comment)}
                      className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <FaHeart className="text-sm" />
                      {comment.likes || 0}
                    </button>
                    <button
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id!)}
                      className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <FaReply className="text-sm" />
                      Reply
                    </button>
                    {account?.address === comment.commenter_address && (
                      <button
                        onClick={() => handleDeleteComment(comment.id!)}
                        className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <FaTrash className="text-sm" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-2 pl-3 border-l-2 border-gray-300 dark:border-gray-600 space-y-2">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-2">
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                          {reply.commenter_name?.[0] || '?'}
                        </div>
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                          <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                            {reply.commenter_name}
                          </span>
                          {reply.is_creator && (
                            <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-1 py-0 rounded-full font-semibold whitespace-nowrap">
                              Creator
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300">{reply.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Input */}
              {replyingTo === comment.id && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Reply..."
                      className="flex-grow px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={() => handleSubmitReply(comment.id!)}
                      disabled={isSubmitting || !replyContent.trim()}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-xs"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
