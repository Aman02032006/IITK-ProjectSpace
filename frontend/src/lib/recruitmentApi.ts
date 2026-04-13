import { authHeaders } from "@/lib/token";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const API = `${BASE_URL}/recruitments`;
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
  department: string;
  profile_picture_url?: string | null;
}

export interface ApplicationPublic {
  id: string;
  applicant: UserSummary;
  recruitment_id: string;
  message?: string;
  status: "Pending" | "Accepted" | "Rejected";
  applied_at: string;
}

export interface MyRecruitmentApplicationPublic {
  id: string;
  recruitment_id: string;
  message?: string;
  status: "Pending" | "Accepted" | "Rejected";
  applied_at: string;
  recruitment_title: string;
  recruitment_domains: string[];
  recruitment_status: "Open" | "Closed";
}

export interface RecruitmentCreate {
  title: string;
  description: string;
  description_format: "markdown" | "plain-text";
  domains: string[];
  prerequisites: string[];
  allowed_designations: string[];
  allowed_departments: string[];
  links: string[];
  media_urls: string[];
  status: "Open" | "Closed";
  recruiter_ids: string[];
}

export interface RecruitmentUpdate {
  title?: string;
  description?: string;
  description_format?: "markdown" | "plain-text";
  domains?: string[];
  prerequisites?: string[];
  allowed_designations?: string[];
  allowed_departments?: string[];
  links?: string[];
  media_urls?: string[];
  status?: "Open" | "Closed";
}

export interface RecruitmentPublic {
  id: string;
  title: string;
  description: string;
  description_format: "markdown" | "plain-text";
  domains: string[];
  prerequisites: string[];
  allowed_designations: string[];
  allowed_departments: string[];
  links: string[];
  media_urls: string[];
  status: "Open" | "Closed";
  created_at: string;
  updated_at: string;
  recruiters: UserSummary[];
  pending_recruiters: UserSummary[];

  creator_id: string;
  creator_name: string;
  creator_avatar_url?: string | null;
}

export interface RecruitmentSummary {
  id: string;
  title: string;
  domains: string[];
  prerequisites: string[];
  allowed_designations: string[];
  allowed_departments: string[];
  status: "Open" | "Closed";
  created_at: string;
  recruiters: UserSummary[];
  media_urls?: string[];

  creator_id: string;
  creator_name: string;
  creator_avatar_url?: string | null;
}

export interface ApplicationCreate {
  recruitment_id: string;
  message?: string;
}

export interface ApplicationUpdate {
  status: "Pending" | "Accepted" | "Rejected";
}

const normalizeUserSummary = (user: UserSummary): UserSummary => ({
  ...user,
  profile_picture_url: toAbsoluteUrl(user.profile_picture_url) ?? null,
});

const normalizeApplication = (application: ApplicationPublic): ApplicationPublic => ({
  ...application,
  applicant: normalizeUserSummary(application.applicant),
});

export const normalizeRecruitmentPublic = (
  recruitment: RecruitmentPublic
): RecruitmentPublic => ({
  ...recruitment,
  media_urls: (recruitment.media_urls ?? []).map((url) => toAbsoluteUrl(url) ?? url),
  recruiters: (recruitment.recruiters ?? []).map(normalizeUserSummary),
  pending_recruiters: (recruitment.pending_recruiters ?? []).map(normalizeUserSummary),
  creator_avatar_url: toAbsoluteUrl(recruitment.creator_avatar_url) ?? null,
});

export const normalizeRecruitmentSummary = (
  recruitment: RecruitmentSummary
): RecruitmentSummary => ({
  ...recruitment,
  media_urls: (recruitment.media_urls ?? []).map((url) => toAbsoluteUrl(url) ?? url),
  recruiters: (recruitment.recruiters ?? []).map(normalizeUserSummary),
  creator_avatar_url: toAbsoluteUrl(recruitment.creator_avatar_url) ?? null,
});

// API Functions
export async function createRecruitment(payload: RecruitmentCreate): Promise<RecruitmentPublic> {
  const res = await fetch(`${API}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to create recruitment"));
  return normalizeRecruitmentPublic(data as RecruitmentPublic);
}

export async function uploadRecruitmentMedia(recruitmentId: string, files: File[]): Promise<void> {
  // Upload sequentially to prevent race conditions on backend array update
  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API}/${recruitmentId}/upload`, {
      method: "POST",
      // Notice: Do NOT set "Content-Type" manually here! 
      // The browser automatically sets it to multipart/form-data with the correct boundary
      headers: { ...authHeaders() },
      body: formData,
    });
    
    if (!res.ok) throw new Error("Failed to upload a file");
  }
}

export async function getRecruitmentCount(): Promise<number> {
  const res = await fetch(`${API}/count`, {
    headers: { ...authHeaders() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to fetch recruitment count"));
  return data.count as number;
}

export async function getRecruitment(recruitmentId: string): Promise<RecruitmentPublic> {
  const res = await fetch(`${API}/${recruitmentId}`, {
    headers: { ...authHeaders() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to fetch recruitment"));
  return normalizeRecruitmentPublic(data as RecruitmentPublic);
}

export async function getAllRecruitments(skip = 0, limit = 10): Promise<RecruitmentSummary[]> {
  const res = await fetch(`${API}/?skip=${skip}&limit=${limit}`, {
    headers: { ...authHeaders() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to fetch recruitments"));
  return (data as RecruitmentSummary[]).map(normalizeRecruitmentSummary);
}

export async function updateRecruitment(recruitmentId: string, payload: RecruitmentUpdate): Promise<RecruitmentPublic> {
  const res = await fetch(`${API}/${recruitmentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to update recruitment"));
  return normalizeRecruitmentPublic(data as RecruitmentPublic);
}

export async function deleteRecruitment(recruitmentId: string): Promise<void> {
  const res = await fetch(`${API}/${recruitmentId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(extractError(data, "Failed to delete recruitment"));
  }
}

export async function addRecruiter(recruitmentId: string, userId: string): Promise<RecruitmentPublic> {
  const res = await fetch(`${API}/${recruitmentId}/invites/users/${userId}`, {
    method: "POST",
    headers: { ...authHeaders() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to add recruiter"));
  return normalizeRecruitmentPublic(data as RecruitmentPublic);
}

export async function removeRecruiter(recruitmentId: string, userId: string): Promise<RecruitmentPublic> {
  const res = await fetch(`${API}/${recruitmentId}/recruiters/${userId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to remove recruiter"));
  return normalizeRecruitmentPublic(data as RecruitmentPublic);
}

export async function acceptRecruiterInvite(recruitmentId: string): Promise<RecruitmentPublic> {
  const normalizedId = normalizeUuid(recruitmentId, "recruitment_id");
  const url = `${API}/${encodeURIComponent(normalizedId)}/invites/accept`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...authHeaders() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `${extractError(data, "Failed to accept recruiter invitation")} [url=${url}]`
    );
  }
  return normalizeRecruitmentPublic(data as RecruitmentPublic);
}

export async function rejectRecruiterInvite(recruitmentId: string): Promise<RecruitmentPublic> {
  const normalizedId = normalizeUuid(recruitmentId, "recruitment_id");
  const url = `${API}/${encodeURIComponent(normalizedId)}/invites/reject`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...authHeaders() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `${extractError(data, "Failed to reject recruiter invitation")} [url=${url}]`
    );
  }
  return normalizeRecruitmentPublic(data as RecruitmentPublic);
}

export async function applyToRecruitment(recruitmentId: string, payload: ApplicationCreate): Promise<ApplicationPublic> {
  const res = await fetch(`${API}/${recruitmentId}/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to submit application"));
  return normalizeApplication(data as ApplicationPublic);
}

export async function getRecruitmentApplications(
  recruitmentId: string,
  skip = 0,
  limit = 100
): Promise<ApplicationPublic[]> {
  const res = await fetch(`${API}/${recruitmentId}/applications?skip=${skip}&limit=${limit}`, {
    headers: { ...authHeaders() },
  });
  const data = await res.json().catch(() => ([]));
  if (!res.ok) throw new Error(extractError(data as ApiErrorData, "Failed to fetch applications"));
  return (data as ApplicationPublic[]).map(normalizeApplication);
}

export async function getMyRecruitmentApplication(
  recruitmentId: string
): Promise<MyRecruitmentApplicationPublic | null> {
  const res = await fetch(`${API}/${recruitmentId}/applications/me`, {
    headers: { ...authHeaders() },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(extractError(data as ApiErrorData, "Failed to fetch your application"));
  if (!data) return null;
  return data as MyRecruitmentApplicationPublic;
}

export async function updateApplicationStatus(
  recruitmentId: string,
  applicationId: string,
  payload: ApplicationUpdate
): Promise<ApplicationPublic> {
  const res = await fetch(`${API}/${recruitmentId}/applications/${applicationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to update application status"));
  return normalizeApplication(data as ApplicationPublic);
}
