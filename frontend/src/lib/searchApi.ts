import { authHeaders } from "@/lib/token";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const API = `${BASE_URL}/search`;

interface PaginatedResponse<T> {
  total: number;
  offset: number;
  limit: number;
  results: T[];
}

interface SearchFilters {
  skills?: string[];
  domains?: string[];
  designations?: string[];
  degrees?: string[];
  departments?: string[];
  prerequisites?: string[];
}

export interface SearchUserResult {
  id: string;
  fullname?: string | null;
  iitk_email: string;
  designation: string;
  degree: string;
  department: string;
  profile_picture_url?: string | null;
  bio: string;
  skills: string[];
  domains: string[];
}

export interface SearchProjectResult {
  id: string;
  title: string;
  summary: string;
  domains: string[];
  creator_id: string;
  created_at: string;
  creator_name: string;
  creator_avatar_url?: string | null;
}

export interface SearchRecruitmentResult {
  id: string;
  title: string;
  domains: string[];
  prerequisites: string[];
  allowed_designations: string[];
  allowed_departments: string[];
  status: "Open" | "Closed";
  created_at: string;
  recruiters: string[];
  creator_id: string;
  creator_name: string;
  creator_avatar_url?: string | null;
}

const extractError = (data: any, fallbackMsg: string): string => {
  if (!data || !data.detail) return fallbackMsg;
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail) && data.detail[0]?.msg) {
    return data.detail[0].msg;
  }
  return fallbackMsg;
};

function buildUrl(
  path: string,
  params: Record<string, string | number | string[] | undefined>
) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    if (Array.isArray(value)) {
      value
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => query.append(key, item));
      return;
    }
    query.set(key, String(value));
  });
  return `${API}${path}?${query.toString()}`;
}

export async function searchUsers(
  q: string,
  offset = 0,
  limit = 20,
  filters: SearchFilters = {}
): Promise<PaginatedResponse<SearchUserResult>> {
  const res = await fetch(
    buildUrl("/users", {
      q,
      offset,
      limit,
      designation: filters.designations,
      degree: filters.degrees,
      department: filters.departments,
      skill: filters.skills,
      domain: filters.domains,
    }),
    {
    headers: { ...authHeaders() },
    }
  );
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error(extractError(data, "Failed to search users"));
  return data;
}

export async function searchProjects(
  q: string,
  offset = 0,
  limit = 20,
  filters: SearchFilters = {}
): Promise<PaginatedResponse<SearchProjectResult>> {
  const res = await fetch(
    buildUrl("/projects", {
      q,
      offset,
      limit,
      domain: filters.domains,
    }),
    {
    headers: { ...authHeaders() },
    }
  );
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error(extractError(data, "Failed to search projects"));
  return data;
}

export async function searchRecruitments(
  q: string,
  offset = 0,
  limit = 20,
  filters: SearchFilters = {}
): Promise<PaginatedResponse<SearchRecruitmentResult>> {
  const res = await fetch(
    buildUrl("/recruitments", {
      q,
      offset,
      limit,
      domain: filters.domains,
      designation: filters.designations,
      department: filters.departments,
      skill: filters.skills,
      prerequisite: filters.prerequisites,
    }),
    {
      headers: { ...authHeaders() },
    }
  );
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error(extractError(data, "Failed to search recruitments"));
  return data;
}
