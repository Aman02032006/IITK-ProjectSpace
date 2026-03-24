import { authHeaders } from "@/lib/token";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const API = `${BASE_URL}/recruitments`;

const extractError = (data: any, fallbackMsg: string): string => {
  if (!data || !data.detail) return fallbackMsg;
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail) && data.detail[0]?.msg) {
    let msg = data.detail[0].msg;
    if (msg.startsWith("Value error, ")) msg = msg.replace("Value error, ", "");
    return msg;
  }
  return fallbackMsg;
};

// Types
export interface UserSummary {
  id: string;
  fullname: string;
  designation: string;
  profile_picture_url?: string;
}

export interface ApplicationPublic {
  id: string;
  applicant: UserSummary;
  recruitment_id: string;
  message?: string;
  status: "Pending" | "Accepted" | "Rejected";
  applied_at: string;
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
  applications: ApplicationPublic[];

  creator_id: string;
  creator_name: string;
  creator_avatar_url?: string;
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
  creator_avatar_url?: string;
}

export interface ApplicationCreate {
  recruitment_id: string;
  message?: string;
}

export interface ApplicationUpdate {
  status: "Pending" | "Accepted" | "Rejected";
}

// API Functions
export async function createRecruitment(payload: RecruitmentCreate): Promise<RecruitmentPublic> {
  const res = await fetch(`${API}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to create recruitment"));
  return data;
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
  return data;
}

export async function getAllRecruitments(skip = 0, limit = 10): Promise<RecruitmentSummary[]> {
  const res = await fetch(`${API}/?skip=${skip}&limit=${limit}`, {
    headers: { ...authHeaders() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to fetch recruitments"));
  return data;
}

export async function updateRecruitment(recruitmentId: string, payload: RecruitmentUpdate): Promise<RecruitmentPublic> {
  const res = await fetch(`${API}/${recruitmentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to update recruitment"));
  return data;
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
  const res = await fetch(`${API}/${recruitmentId}/recruiters/${userId}`, {
    method: "POST",
    headers: { ...authHeaders() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to add recruiter"));
  return data;
}

export async function removeRecruiter(recruitmentId: string, userId: string): Promise<RecruitmentPublic> {
  const res = await fetch(`${API}/${recruitmentId}/recruiters/${userId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to remove recruiter"));
  return data;
}

export async function applyToRecruitment(recruitmentId: string, payload: ApplicationCreate): Promise<ApplicationPublic> {
  const res = await fetch(`${API}/${recruitmentId}/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to submit application"));
  return data;
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
  return data;
}