import { authHeaders } from "@/lib/token";
import { ProjectPublic } from "./projectApi";
import { RecruitmentPublic } from "./recruitmentApi";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const API = BASE_URL;

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

// Fetches the logged-in user's profile
export async function fetchMyProfile(): Promise<UserProfile> {
  const res = await fetch(`${API}/users/me`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
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
  return res.json();
}

// Fetch another user's public profile by their ID
export async function getUserById(userId: string): Promise<UserProfileView> {
  const res = await fetch(`${API}/users/${userId}`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error(extractError(await res.json().catch(() => ({})), "User not found"));
  return res.json();
}

export async function searchUsers(q: string): Promise<UserProfileView[]> {
  const res = await fetch(`${API}/users/search?q=${encodeURIComponent(q)}`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) return [];
  return res.json();
}

export async function fetchMyProjects(): Promise<ProjectPublic[]> {
  const res = await fetch(`${API}/users/me/projects`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

// fetches the recruitments managed by user
export async function fetchMyRecruitments(): Promise<RecruitmentPublic[]> {
  const res = await fetch(`${API}/users/me/recruitments`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error("Failed to fetch recruitments");
  return res.json();
}