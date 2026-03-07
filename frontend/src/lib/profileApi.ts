import { authHeaders } from "@/lib/token";

const API = "http://127.0.0.1:8000";

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
  is_admin: boolean;
  created_at: string;

  cards?: CardData[];
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
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export async function updateMyProfile(updateData: Partial<UserProfile>): Promise<UserProfile> {
  const res = await fetch(`${API}/users/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(updateData),
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error("Failed to update profile");
  return res.json();
}