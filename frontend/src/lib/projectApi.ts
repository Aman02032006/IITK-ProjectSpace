import { authHeaders } from "@/lib/token";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const API = `${BASE_URL}/projects`;
const UUID_PATTERN =
  /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

type ApiErrorData = {
  detail?: string | Array<{ msg?: string }>;
} | null;

const extractError = (data: ApiErrorData, fallbackMsg: string): string => {
  if (!data || !data.detail) return fallbackMsg;
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail) && data.detail[0]?.msg) {
    let msg = data.detail[0].msg;
    if (msg.startsWith("Value error, ")) msg = msg.replace("Value error, ", "");
    return msg;
  }
  return fallbackMsg;
};

const normalizeUuid = (rawId: string, fieldLabel: string): string => {
  const cleaned = rawId.trim().replace(/^['"`]+|['"`]+$/g, "");
  const match = cleaned.match(UUID_PATTERN)?.[0];
  if (!match) {
    throw new Error(`Invalid ${fieldLabel}: ${rawId}`);
  }
  return match;
};

const toAbsoluteUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${BASE_URL}${url}`;
};

// Types
export interface UserSummary {
  id: string;
  fullname: string;
  designation: string;
  profile_picture_url?: string | null;
}

export interface ProjectCreate {
  title: string;
  summary: string;
  description: string;
  description_format: "markdown" | "plain-text";
  domains: string[];
  links: string[];
  media_urls: string[];
  team_member_ids: string[];
}

export interface ProjectUpdate {
  title?: string;
  summary?: string;
  description?: string;
  description_format?: "markdown" | "plain-text";
  domains?: string[];
  links?: string[];
  media_urls?: string[];
}

export interface ProjectPublic {
  id: string;
  title: string;
  summary: string;
  description: string;
  description_format: "markdown" | "plain-text";
  domains: string[];
  links: string[];
  media_urls: string[];
  created_at: string;
  updated_at: string;
  team_members: UserSummary[];
  pending_members: UserSummary[];

  creator_id: string;
  creator_name: string;
  creator_avatar_url?: string | null;
}

export interface ProjectSummary {
  id: string;
  title: string;
  summary: string;
  domains: string[];
  created_at: string;
  team_members: UserSummary[];
  media_urls?: string[];

  creator_id: string;
  creator_name: string;
  creator_avatar_url?: string | null;
}

const normalizeUserSummary = (user: UserSummary): UserSummary => ({
  ...user,
  profile_picture_url: toAbsoluteUrl(user.profile_picture_url) ?? null,
});

export const normalizeProjectPublic = (project: ProjectPublic): ProjectPublic => ({
  ...project,
  media_urls: (project.media_urls ?? []).map((url) => toAbsoluteUrl(url) ?? url),
  team_members: (project.team_members ?? []).map(normalizeUserSummary),
  pending_members: (project.pending_members ?? []).map(normalizeUserSummary),
  creator_avatar_url: toAbsoluteUrl(project.creator_avatar_url) ?? null,
});

export const normalizeProjectSummary = (project: ProjectSummary): ProjectSummary => ({
  ...project,
  media_urls: (project.media_urls ?? []).map((url) => toAbsoluteUrl(url) ?? url),
  team_members: (project.team_members ?? []).map(normalizeUserSummary),
  creator_avatar_url: toAbsoluteUrl(project.creator_avatar_url) ?? null,
});

// API Functions
export async function createProject(payload: ProjectCreate): Promise<ProjectPublic> {
  const res = await fetch(`${API}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to create project"));
  return normalizeProjectPublic(data as ProjectPublic);
}

export async function uploadProjectMedia(projectId: string, files: File[]): Promise<void> {
  // Upload sequentially to prevent race conditions on backend array update
  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API}/${projectId}/upload`, {
      method: "POST",
      // Notice: Do NOT set "Content-Type" manually here! 
      // The browser automatically sets it to multipart/form-data with the correct boundary
      headers: { ...authHeaders() },
      body: formData,
    });
    
    if (!res.ok) throw new Error("Failed to upload a file");
  }
}

export async function getProjectCount(): Promise<number> {
  const res = await fetch(`${API}/count`, {
    headers: { ...authHeaders() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to fetch project count"));
  return data.count as number;
}

export async function getProject(projectId: string): Promise<ProjectPublic> {
  const res = await fetch(`${API}/${projectId}`, {
    headers: { ...authHeaders() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to fetch project"));
  return normalizeProjectPublic(data as ProjectPublic);
}

export async function getAllProjects(skip = 0, limit = 10): Promise<ProjectSummary[]> {
  const res = await fetch(`${API}/?skip=${skip}&limit=${limit}`, {
    headers: { ...authHeaders() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to fetch projects"));
  return (data as ProjectSummary[]).map(normalizeProjectSummary);
}

export async function updateProject(projectId: string, payload: ProjectUpdate): Promise<ProjectPublic> {
  const res = await fetch(`${API}/${projectId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to update project"));
  return normalizeProjectPublic(data as ProjectPublic);
}

export async function deleteProject(projectId: string): Promise<void> {
  const res = await fetch(`${API}/${projectId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(extractError(data, "Failed to delete project"));
  }
}

export async function addProjectMember(projectId: string, userId: string): Promise<ProjectPublic> {
  const res = await fetch(`${API}/${projectId}/invites/users/${userId}`, {
    method: "POST",
    headers: { ...authHeaders() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to add member"));
  return normalizeProjectPublic(data as ProjectPublic);
}

export async function removeProjectMember(projectId: string, userId: string): Promise<ProjectPublic> {
  const res = await fetch(`${API}/${projectId}/members/${userId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to remove member"));
  return normalizeProjectPublic(data as ProjectPublic);
}

export async function acceptProjectInvite(projectId: string): Promise<ProjectPublic> {
  const normalizedId = normalizeUuid(projectId, "project_id");
  const url = `${API}/${encodeURIComponent(normalizedId)}/invites/accept`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...authHeaders() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `${extractError(data, "Failed to accept project invitation")} [url=${url}]`
    );
  }
  return normalizeProjectPublic(data as ProjectPublic);
}

export async function rejectProjectInvite(projectId: string): Promise<ProjectPublic> {
  const normalizedId = normalizeUuid(projectId, "project_id");
  const url = `${API}/${encodeURIComponent(normalizedId)}/invites/reject`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...authHeaders() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `${extractError(data, "Failed to reject project invitation")} [url=${url}]`
    );
  }
  return normalizeProjectPublic(data as ProjectPublic);
}
