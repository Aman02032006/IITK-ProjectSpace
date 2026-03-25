import { authHeaders } from "@/lib/token";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const API = `${BASE_URL}/notifications`;

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

export interface NotificationRead {
  id: string;
  recipient_id: string;
  sender_id?: string | null;
  type: string;
  title: string;
  message: string;
  link: string;
  related_entity_id?: string | null;
  is_read: boolean;
  created_at: string;
  sender_name?: string | null;
  sender_avatar?: string | null;
}

export interface PaginatedNotifications {
  total: number;
  unread_count: number;
  limit: number;
  offset: number;
  results: NotificationRead[];
}

const normalizeNotification = (notification: NotificationRead): NotificationRead => ({
  ...notification,
  sender_avatar: toAbsoluteUrl(notification.sender_avatar),
});

export async function getNotifications(limit = 20, offset = 0): Promise<PaginatedNotifications> {
  const res = await fetch(`${API}/?limit=${limit}&offset=${offset}`, {
    headers: { ...authHeaders() },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) throw new Error("Unauthorized");
    throw new Error(extractError(data, "Failed to fetch notifications"));
  }

  const page = data as PaginatedNotifications;
  return {
    ...page,
    results: page.results.map(normalizeNotification),
  };
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const res = await fetch(`${API}/${notificationId}/read`, {
    method: "PATCH",
    headers: { ...authHeaders() },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(extractError(data, "Failed to mark notification as read"));
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const res = await fetch(`${API}/read-all`, {
    method: "PATCH",
    headers: { ...authHeaders() },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(extractError(data, "Failed to mark all notifications as read"));
  }
}
