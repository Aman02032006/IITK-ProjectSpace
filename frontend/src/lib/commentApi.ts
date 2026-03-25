import { authHeaders } from "@/lib/token";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const API = `${BASE_URL}/comments`;

const toAbsoluteUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${BASE_URL}${url}`;
};

type ApiErrorData = {
  detail?: string | Array<{ msg?: string }>;
} | null;

const extractError = (data: ApiErrorData, fallback: string): string => {
  if (!data || !data.detail) return fallback;
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail) && data.detail[0]?.msg) return data.detail[0].msg;
  return fallback;
};

export interface CommentAuthor {
  id: string;
  fullname: string;
  profile_picture_url?: string | null;
}

export interface Comment {
  id: string;
  content: string;
  project_id?: string | null;
  recruitment_id?: string | null;
  parent_id?: string | null;
  author: CommentAuthor;
  created_at: string;
  updated_at: string;
  reply_count: number;
}

export interface CommentRepliesPage {
  replies: Comment[];
  total: number;
}

export interface CommentCreate {
  content: string;
  project_id?: string | null;
  recruitment_id?: string | null;
  parent_id?: string | null;
}

const normalizeComment = (comment: Comment): Comment => ({
  ...comment,
  author: {
    ...comment.author,
    profile_picture_url: toAbsoluteUrl(comment.author.profile_picture_url),
  },
});

// API Functions

export async function getProjectComments(
  projectId: string,
  skip = 0,
  limit = 20
): Promise<Comment[]> {
  const res = await fetch(
    `${API}/project/${projectId}?skip=${skip}&limit=${limit}`,
    { headers: { ...authHeaders() } }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to fetch comments"));
  return (data as Comment[]).map(normalizeComment);
}

export async function getRecruitmentComments(
  recruitmentId: string,
  skip = 0,
  limit = 20
): Promise<Comment[]> {
  const res = await fetch(
    `${API}/recruitment/${recruitmentId}?skip=${skip}&limit=${limit}`,
    { headers: { ...authHeaders() } }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to fetch comments"));
  return (data as Comment[]).map(normalizeComment);
}

export async function getCommentReplies(
  commentId: string,
  skip = 0,
  limit = 5
): Promise<CommentRepliesPage> {
  const res = await fetch(
    `${API}/${commentId}/replies?skip=${skip}&limit=${limit}`,
    { headers: { ...authHeaders() } }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to fetch replies"));
  const page = data as CommentRepliesPage;
  return {
    ...page,
    replies: page.replies.map(normalizeComment),
  };
}

export async function createComment(payload: CommentCreate): Promise<Comment> {
  const res = await fetch(`${API}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to post comment"));
  return normalizeComment(data as Comment);
}

export async function deleteComment(commentId: string): Promise<void> {
  const res = await fetch(`${API}/${commentId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(extractError(data, "Failed to delete comment"));
  }
}
