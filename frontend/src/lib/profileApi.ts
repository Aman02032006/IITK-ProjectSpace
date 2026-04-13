import { authHeaders } from "@/lib/token";
import {
  ProjectSummary,
  normalizeProjectSummary,
} from "./projectApi";
import {
  RecruitmentSummary,
  normalizeRecruitmentSummary,
} from "./recruitmentApi";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const API = BASE_URL;

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

const toAbsoluteUrl = (url?: string | null): string | null => {
  if (!url) return null;
  return url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `${BASE_URL}${url}`;
};

export interface UserProfile {
  id: string;
  fullname: string | null;
  iitk_email: string;
  secondary_email: string | null;

  designation: string;
  degree: string;
  department: string;

  bio: string;
  skills: string[];
  domains: string[];

  linkedin: string | null;
  github: string | null;
  other_link1: string | null;
  other_link2: string | null;
  profile_picture_url: string | null;

  is_active: boolean;
  created_at: string;

  cards?: CardData[];
}

export interface UserProfileView {
  id: string;
  fullname: string;
  iitk_email: string;
  secondary_email?: string;
  designation: string;
  degree: string;
  department: string;
  bio: string;
  profile_picture_url?: string;
  github?: string;
  linkedin?: string;
  other_link1?: string;
  other_link2?: string;
  skills: string[];
  domains: string[];
}

export interface CardData {
  id: string;
  type: "recruitment" | "project";
  title: string;
  author: string;
  role: string;
  tags: string[];
  prerequisites: string;
}

const mapUserProfile = (profile: UserProfile): UserProfile => ({
  ...profile,
  profile_picture_url: toAbsoluteUrl(profile.profile_picture_url),
});

const mapUserProfileView = (profile: UserProfileView): UserProfileView => ({
  ...profile,
  profile_picture_url: toAbsoluteUrl(profile.profile_picture_url) ?? undefined,
});

// Fetches the logged-in user's profile
export async function fetchMyProfile(): Promise<UserProfile> {
  const res = await fetch(`${API}/users/me`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error("Failed to fetch profile");
  const data = (await res.json()) as UserProfile;
  return mapUserProfile(data);
}

// Updates the user's profile
export async function updateMyProfile(updateData: Partial<UserProfile>): Promise<UserProfile> {
  const res = await fetch(`${API}/users/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(updateData),
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    const errorData = await res.json();
    console.error("🚨 FastAPI 422 Validation Error:", JSON.stringify(errorData, null, 2));
    throw new Error(`API Error: ${JSON.stringify(errorData)}`);
  }
  const data = (await res.json()) as UserProfile;
  return mapUserProfile(data);
}

export async function uploadMyProfilePicture(file: File): Promise<UserProfile> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API}/users/me/profile-picture`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: formData,
  });

  if (res.status === 401) throw new Error("Unauthorized");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to upload profile picture"));

  return mapUserProfile(data as UserProfile);
}

export async function removeMyProfilePicture(): Promise<void> {
  const res = await fetch(`${API}/users/me/profile-picture`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });

  if (res.status === 401) throw new Error("Unauthorized");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to remove profile picture"));
}

export async function requestSecondaryEmailOtp(email: string): Promise<void> {
  const res = await fetch(`${API}/users/me/request-secondary-email-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ secondary_email: email }),
  });

  if (res.status === 401) throw new Error("Unauthorized");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to send verification code"));
}

export async function verifySecondaryEmailOtp(params: {
  email: string;
  otp: string;
}): Promise<UserProfile> {
  const res = await fetch(`${API}/users/me/verify-secondary-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      secondary_email: params.email,
      otp_code: params.otp,
    }),
  });

  if (res.status === 401) throw new Error("Unauthorized");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to verify secondary email"));

  return mapUserProfile(data as UserProfile);
}

// Fetch another user's public profile by their ID
export async function getUserById(userId: string): Promise<UserProfileView> {
  const res = await fetch(`${API}/users/${userId}`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error(extractError(await res.json().catch(() => ({})), "User not found"));
  const data = (await res.json()) as UserProfileView;
  return mapUserProfileView(data);
}

export async function searchUsers(q: string): Promise<UserProfileView[]> {
  const res = await fetch(`${API}/users/search?q=${encodeURIComponent(q)}`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) return [];
  const data = (await res.json()) as UserProfileView[];
  return data.map(mapUserProfileView);
}

export async function fetchMyProjects(): Promise<ProjectSummary[]> {
  const res = await fetch(`${API}/users/me/projects`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error("Failed to fetch projects");
  const data = (await res.json()) as ProjectSummary[];
  return data.map(normalizeProjectSummary);
}

// fetches the recruitments managed by user
export async function fetchMyRecruitments(): Promise<RecruitmentSummary[]> {
  const res = await fetch(`${API}/users/me/recruitments`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error("Failed to fetch recruitments");
  const data = (await res.json()) as RecruitmentSummary[];
  return data.map(normalizeRecruitmentSummary);
}

export async function getUserProjects(userId: string): Promise<ProjectSummary[]> {
  const res = await fetch(`${API}/users/${userId}/projects`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error("Failed to fetch user projects");
  const data = (await res.json()) as ProjectSummary[];
  return data.map(normalizeProjectSummary);
}

export async function getUserRecruitments(userId: string): Promise<RecruitmentSummary[]> {
  const res = await fetch(`${API}/users/${userId}/recruitments`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error("Failed to fetch user recruitments");
  const data = (await res.json()) as RecruitmentSummary[];
  return data.map(normalizeRecruitmentSummary);
}
