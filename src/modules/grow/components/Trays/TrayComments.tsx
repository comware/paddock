/**
 * TrayComments - Component for managing comments on a tray
 *
 * Features:
 * - Chronological list of comments with timestamps
 * - Add new comment form
 * - Inline edit mode
 * - Delete with confirmation
 */

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useTrayComments } from '../../stores';

interface TrayCommentsProps {
  trayId: string;
}

export function TrayComments({ trayId }: TrayCommentsProps) {
  const { comments, isLoading, loadComments, addComment, updateComment, deleteComment } =
    useTrayComments();

  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load comments when tray changes
  useEffect(() => {
    loadComments(trayId);
  }, [trayId, loadComments]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await addComment(trayId, newComment.trim());
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (id: string, content: string) => {
    setEditingId(id);
    setEditContent(content);
    setDeletingId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return;

    setIsSubmitting(true);
    try {
      await updateComment(editingId, editContent.trim());
      setEditingId(null);
      setEditContent('');
    } catch (error) {
      console.error('Failed to update comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleDelete = async (id: string) => {
    setIsSubmitting(true);
    try {
      await deleteComment(id);
      setDeletingId(null);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400 py-2">
        Loading comments...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comment List */}
      {comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
            >
              {editingId === comment.id ? (
                // Edit Mode
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={isSubmitting || !editContent.trim()}
                      className="px-3 py-1 rounded text-xs font-medium bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-3 py-1 rounded text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : deletingId === comment.id ? (
                // Delete Confirmation
                <div className="space-y-2">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Delete this comment?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id!)}
                      disabled={isSubmitting}
                      className="px-3 py-1 rounded text-xs font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(null)}
                      className="px-3 py-1 rounded text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // Display Mode
                <>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                      {comment.updatedAt > comment.createdAt && ' (edited)'}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(comment.id!, comment.content)}
                        className="px-2 py-1 rounded text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(comment.id!)}
                        className="px-2 py-1 rounded text-xs text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400 py-2">
          No comments yet. Add one below.
        </p>
      )}

      {/* Add Comment Form */}
      <div className="space-y-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
        />
        <button
          type="button"
          onClick={handleAddComment}
          disabled={isSubmitting || !newComment.trim()}
          className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Adding...' : 'Add Comment'}
        </button>
      </div>
    </div>
  );
}
