"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import "./commentsSection.css";
import {
  Comment,
  getProjectComments,
  getRecruitmentComments,
  getCommentReplies,
  createComment,
  deleteComment,
} from "@/lib/commentApi";

// Helpers
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function getFullUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  return url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

// Avatar
const Avatar: React.FC<{ name: string; url?: string; size?: number }> = ({
  name, url, size = 34,
}) => (
  <div className="cs-avatar" style={{ width: size, height: size, fontSize: size * 0.35 }}>
    {url ? <img src={url} alt={name} /> : getInitials(name)}
  </div>
);

// Compose Box
const ComposeBox: React.FC<{
  placeholder?: string;
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  autoFocus?: boolean;
  compact?: boolean;
}> = ({ placeholder = "Write a comment…", onSubmit, onCancel, autoFocus, compact }) => {
  const [text, setText]             = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      setText("");
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Failed to post."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
    if (e.key === "Escape" && onCancel) onCancel();
  };

  return (
    <div className={`cs-compose ${compact ? "cs-compose--compact" : ""}`}>
      <textarea
        className="cs-compose-input"
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
        autoFocus={autoFocus}
        rows={compact ? 2 : 3}
        maxLength={1000}
      />
      <div className="cs-compose-footer">
        {error && <span className="cs-compose-error">{error}</span>}
        <span className="cs-compose-hint">Ctrl+Enter to send</span>
        {onCancel && (
          <button className="cs-compose-cancel" onClick={onCancel} type="button">
            Cancel
          </button>
        )}
        <button
          className="cs-compose-btn"
          onClick={handleSubmit}
          disabled={submitting || !text.trim()}
        >
          {submitting ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
};

// Single Comment
const CommentItem: React.FC<{
  comment: Comment;
  currentUserId: string | null;
  postCreatorId: string | null;
  onReply: (parentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => void;
  depth?: number;
  isLast?: boolean;
}> = ({
  comment,
  currentUserId,
  postCreatorId,
  onReply,
  onDelete,
  depth = 0,
  isLast = false,
}) => {
  const router = useRouter();

  const [showReplyBox, setShowReplyBox]       = useState(false);
  const [replies, setReplies]                 = useState<Comment[]>([]);
  const [repliesLoaded, setRepliesLoaded]     = useState(false);
  const [loadingReplies, setLoadingReplies]   = useState(false);
  const [replySkip, setReplySkip]             = useState(0);
  const [totalReplies, setTotalReplies]       = useState(comment.reply_count);
  const [deleting, setDeleting]               = useState(false);

  const REPLY_PAGE = 5;

  const loadReplies = useCallback(
    async (skip: number) => {
      setLoadingReplies(true);
      try {
        const page = await getCommentReplies(comment.id, skip, REPLY_PAGE);
        setReplies((prev) => (skip === 0 ? page.replies : [...prev, ...page.replies]));
        setTotalReplies(page.total);
        setReplySkip(skip + page.replies.length);
        setRepliesLoaded(true);
      } catch {
        // silently ignore
      } finally {
        setLoadingReplies(false);
      }
    },
    [comment.id]
  );

  const handleReply = async (content: string) => {
    await onReply(comment.id, content);
    setShowReplyBox(false);
    await loadReplies(0);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this comment?")) return;
    setDeleting(true);
    try {
      await deleteComment(comment.id);
      onDelete(comment.id);
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Failed to delete."));
      setDeleting(false);
    }
  };

  const canDelete     = currentUserId === comment.author.id || currentUserId === postCreatorId;
  const isPostCreator = comment.author.id === postCreatorId;
  const avatarSize    = depth === 0 ? 34 : 28;
  const hasExpanded   = repliesLoaded && replies.length > 0;

  return (
    <div className={`cs-comment-row ${depth > 0 ? "cs-comment-row--nested" : ""}`}>

      {/* avatar + optional downward thread line */}
      <div className="cs-gutter">
        <Avatar
          name={comment.author.fullname}
          url={getFullUrl(comment.author.profile_picture_url)}
          size={avatarSize}
        />
        {/* Vertical line from avatar down to the last reply when expanded */}
        {hasExpanded && <div className="cs-gutter-line" />}
      </div>

      {/* Main content area */}
      <div className="cs-comment-body">

        {/* Header */}
        <div className="cs-comment-header">
          <button
            className="cs-comment-author"
            onClick={() => router.push(`/profilePage?id=${comment.author.id}`)}
            title={`View ${comment.author.fullname}'s profile`}
          >
            {comment.author.fullname}
          </button>

          {isPostCreator && (
            <span className="cs-creator-badge">Creator</span>
          )}

          <span className="cs-comment-time">{timeAgo(comment.created_at)}</span>

          {canDelete && (
            <button
              className="cs-comment-delete"
              onClick={handleDelete}
              disabled={deleting}
              title="Delete comment"
            >
              {deleting ? "…" : "Delete"}
            </button>
          )}
        </div>

        {/* Content */}
        <p className="cs-comment-content">{comment.content}</p>

        {/* Action row */}
        <div className="cs-comment-actions">
          {depth < 5 && (
            <button
              className="cs-action-btn"
              onClick={() => setShowReplyBox((v) => !v)}
            >
              {showReplyBox ? "Cancel" : "Reply"}
            </button>
          )}

          {totalReplies > 0 && !repliesLoaded && (
            <button
              className="cs-action-btn cs-action-btn--replies"
              onClick={() => loadReplies(0)}
              disabled={loadingReplies}
            >
              {loadingReplies
                ? "Loading…"
                : `▸ ${totalReplies} ${totalReplies === 1 ? "reply" : "replies"}`}
            </button>
          )}

          {hasExpanded && (
            <button
              className="cs-action-btn cs-action-btn--replies"
              onClick={() => { setReplies([]); setRepliesLoaded(false); setReplySkip(0); }}
            >
              ▴ Hide replies
            </button>
          )}
        </div>

        {/* Reply compose box */}
        {showReplyBox && (
          <ComposeBox
            placeholder={`Reply to ${comment.author.fullname}…`}
            onSubmit={handleReply}
            onCancel={() => setShowReplyBox(false)}
            autoFocus
            compact
          />
        )}

        {/* Expanded replies, nested inside the body */}
        {hasExpanded && (
          <div className="cs-replies">
            {replies.map((reply, idx) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                postCreatorId={postCreatorId}
                onReply={onReply}
                onDelete={(id) => setReplies((prev) => prev.filter((r) => r.id !== id))}
                depth={depth + 1}
                isLast={idx === replies.length - 1 && replies.length >= totalReplies}
              />
            ))}

            {replies.length < totalReplies && (
              <button
                className="cs-load-more cs-load-more--replies"
                onClick={() => loadReplies(replySkip)}
                disabled={loadingReplies}
              >
                {loadingReplies ? "Loading…" : "Load more replies"}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

// CommentsSection
interface CommentsSectionProps {
  postId: string;
  postType: "project" | "recruitment";
  currentUserId: string | null;
  postCreatorId: string | null;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({
  postId,
  postType,
  currentUserId,
  postCreatorId,
}) => {
  const [comments, setComments]       = useState<Comment[]>([]);
  const [total, setTotal]             = useState(0);
  const [skip, setSkip]               = useState(0);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const PAGE = 20;

  const fetchComments = useCallback(
    async (currentSkip: number, append = false) => {
      if (currentSkip === 0) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const fetcher = postType === "project" ? getProjectComments : getRecruitmentComments;
        const data    = await fetcher(postId, currentSkip, PAGE);
        if (append) setComments((prev) => [...prev, ...data]);
        else        setComments(data);
        setSkip(currentSkip + data.length);
        setTotal(data.length === PAGE ? currentSkip + data.length + 1 : currentSkip + data.length);
      } catch {
        setError("Could not load comments.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [postId, postType]
  );

  useEffect(() => {
    fetchComments(0);
  }, [fetchComments]);

  const handlePost = async (content: string) => {
    const newComment = await createComment({
      content,
      project_id:     postType === "project"     ? postId : null,
      recruitment_id: postType === "recruitment" ? postId : null,
    });
    setComments((prev) => [...prev, newComment]);
    setTotal((t) => t + 1);
  };

  const handleReply = async (parentId: string, content: string) => {
    await createComment({
      content,
      project_id:     postType === "project"     ? postId : null,
      recruitment_id: postType === "recruitment" ? postId : null,
      parent_id: parentId,
    });
  };

  const handleDelete = (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setTotal((t) => Math.max(0, t - 1));
  };

  const hasMore = skip < total;

  return (
    <div className="cs-root">
      <div className="cs-header">
        <span className="cs-title">Comments</span>
        {total > 0 && <span className="cs-count">{total}</span>}
      </div>

      <ComposeBox onSubmit={handlePost} />

      {loading && (
        <div className="cs-state">
          <div className="cs-skeleton" />
          <div className="cs-skeleton cs-skeleton--short" />
          <div className="cs-skeleton" />
        </div>
      )}
      {!loading && error && <p className="cs-error">{error}</p>}
      {!loading && !error && comments.length === 0 && (
        <p className="cs-empty">No comments yet. Be the first!</p>
      )}

      {!loading && !error && (
        <div className="cs-list">
          {comments.map((c, idx) => (
            <CommentItem
              key={c.id}
              comment={c}
              currentUserId={currentUserId}
              postCreatorId={postCreatorId}
              onReply={handleReply}
              onDelete={handleDelete}
              isLast={idx === comments.length - 1}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <button
          className="cs-load-more"
          onClick={() => fetchComments(skip, true)}
          disabled={loadingMore}
        >
          {loadingMore ? "Loading…" : "Load more comments"}
        </button>
      )}
    </div>
  );
};

export default CommentsSection;
