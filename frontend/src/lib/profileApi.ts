import { authHeaders } from "@/lib/token";

const API = "http://127.0.0.1:8000";

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  department: string;
  institution: string;
  bio: string;
  skills: string[];
  domains: string[];
  socialLinks: {
    linkedin: string | null;
    github: string | null;
    other_link1: string | null;
    other_link2: string | null;
  };
  profilePictureUrl: string | null;
  cards: CardData[];
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