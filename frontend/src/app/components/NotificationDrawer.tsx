"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  NotificationRead,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
} from "@/lib/notificationApi";
import {
  acceptProjectInvite,
  getProject,
  rejectProjectInvite,
} from "@/lib/projectApi";
import {
  acceptRecruiterInvite,
  getRecruitment,
  rejectRecruiterInvite,
} from "@/lib/recruitmentApi";
import { fetchMyProfile } from "@/lib/profileApi";
import "./NotificationDrawer.css";
import ConfirmPopup from "./ConfirmPopup";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const LIST_PAGE_SIZE = 25;

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

type InviteEntityType = "project" | "recruitment";

interface InviteTarget {
  entityType: InviteEntityType;
  entityId: string;
}

const UUID_PATTERN =
  /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

// Removes quotes and trims whitespace from a UUID candidate string
function sanitizeUuidCandidate(value: string): string {
  return value.trim().replace(/^['"`]+|['"`]+$/g, "");
}

// Extracts a valid UUID string from a given input string
function extractValidUuid(value?: string | null): string | null {
  if (!value) return null;
  const cleaned = sanitizeUuidCandidate(value);
  const match = cleaned.match(UUID_PATTERN)?.[0] ?? null;
  return match;
}

// Converts an ISO date string into a relative time string (e.g., "5m ago")
function getRelativeTime(iso: string): string {
  const timestamp = new Date(iso).getTime();
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;

  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Returns an appropriate label for actions based on notification type
function getActionLabel(type: string): string {
  switch (type) {
    case "NEW_APPLICATION":
      return "Open Application";
    case "APPLICATION_RESULT":
      return "View Result";
    case "NEW_COMMENT":
      return "Open Comment";
    case "COMMENT_REPLY":
      return "Open Thread";
    case "VERIFICATION_REQUEST":
      return "Review Request";
    case "VERIFICATION_RESULT":
      return "View Result";
    default:
      return "Open Details";
  }
}

// Determines if an action primary button should be shown for a notification
function shouldShowPrimaryAction(notification: NotificationRead, hasInviteTarget: boolean): boolean {
  if (hasInviteTarget) return false;
  if (notification.type === "APPLICATION_RESULT") return false;
  if (notification.type === "VERIFICATION_RESULT") return false;
  return true;
}

// Resolves internal links or absolute URLs from notification paths
function resolveClientLink(link: string): string | null {
  if (!link) return null;
  if (link.startsWith("http://") || link.startsWith("https://")) return link;

  const projectMatch = link.match(/^\/projects\/([^/]+)/);
  if (projectMatch?.[1]) return `/project-page?id=${projectMatch[1]}`;

  const recruitmentMatch = link.match(/^\/recruitments\/([^/]+)/);
  if (recruitmentMatch?.[1]) return `/recruitment-page?id=${recruitmentMatch[1]}`;

  return link;
}

// Parses a target project or recruitment ID from a given notification
function getInviteTarget(notification: NotificationRead | null): InviteTarget | null {
  if (!notification || notification.type !== "VERIFICATION_REQUEST") return null;

  const relatedId = extractValidUuid(notification.related_entity_id);

  const projectMatch = notification.link.match(/^\/projects\/([^/?#]+)/);
  if (projectMatch?.[1]) {
    const linkId = extractValidUuid(projectMatch[1]);
    const entityId = relatedId ?? linkId;
    if (!entityId) return null;
    return {
      entityType: "project",
      entityId,
    };
  }

  const recruitmentMatch = notification.link.match(/^\/recruitments\/([^/?#]+)/);
  if (recruitmentMatch?.[1]) {
    const linkId = extractValidUuid(recruitmentMatch[1]);
    const entityId = relatedId ?? linkId;
    if (!entityId) return null;
    return {
      entityType: "recruitment",
      entityId,
    };
  }

  const normalizedLink = notification.link ?? "";
  if (normalizedLink.includes("/project")) {
    const uuidFromLink = extractValidUuid(normalizedLink);
    if (uuidFromLink) {
      return {
        entityType: "project",
        entityId: relatedId ?? uuidFromLink,
      };
    }
  }

  if (normalizedLink.includes("/recruitment")) {
    const uuidFromLink = extractValidUuid(normalizedLink);
    if (uuidFromLink) {
      return {
        entityType: "recruitment",
        entityId: relatedId ?? uuidFromLink,
      };
    }
  }

  return null;
}

// Appends API base URL for relative avatar image links
function withAbsoluteAvatar(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url}`;
}

// Renders appropriate icon graphic depending on the notification type
function NotificationIcon({ type }: { type: string }) {
  if (type === "NEW_COMMENT" || type === "COMMENT_REPLY") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    );
  }

  if (type === "NEW_APPLICATION" || type === "APPLICATION_RESULT") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="17 2 22 7 11 18 6 18 6 13 17 2" />
      </svg>
    );
  }

  if (type === "VERIFICATION_REQUEST" || type === "VERIFICATION_RESULT") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4" />
        <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
      </svg>
    );
  }

  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// Main sliding drawer component to display and interact with notifications
const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  open,
  onClose,
  onUnreadCountChange,
}) => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationRead[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [markAllLoading, setMarkAllLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [inviteActionLoading, setInviteActionLoading] = useState<"accept" | "reject" | null>(null);
  const [inviteActionError, setInviteActionError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [handledInvites, setHandledInvites] = useState<
    Record<string, "accepted" | "rejected" | "resolved">
  >({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [inviteStatusByNotification, setInviteStatusByNotification] = useState<
    Record<string, "pending" | "resolved">
  >({});
  const [inviteStatusLoading, setInviteStatusLoading] = useState(false);

  const selectedNotification = useMemo(
    () => notifications.find((item) => item.id === selectedId) ?? null,
    [notifications, selectedId]
  );
  const selectedInviteTarget = useMemo(
    () => getInviteTarget(selectedNotification),
    [selectedNotification]
  );
  const selectedInviteHandledState = selectedNotification
    ? handledInvites[selectedNotification.id]
    : undefined;
  const showPrimaryAction = selectedNotification
    ? shouldShowPrimaryAction(selectedNotification, !!selectedInviteTarget)
    : false;
  const selectedInviteStatus = selectedNotification
    ? inviteStatusByNotification[selectedNotification.id]
    : undefined;

  const syncUnread = useCallback(
    (count: number) => {
      setUnreadCount(count);
      onUnreadCountChange?.(count);
    },
    [onUnreadCountChange]
  );

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const page = await getNotifications(LIST_PAGE_SIZE, 0);
      setNotifications(page.results);
      syncUnread(page.unread_count);
      setSelectedId((current) => {
        if (!current) return null;
        if (page.results.some((item) => item.id === current)) return current;
        return null;
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "Unauthorized") {
        router.replace("/auth");
        return;
      }
      setErrorMessage("Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }, [router, syncUnread]);

  useEffect(() => {
    if (!open) return;
    setSelectedId(null);
    void loadNotifications();
  }, [open, loadNotifications]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  useEffect(() => {
    setInviteActionLoading(null);
    setInviteActionError(null);
  }, [selectedId]);

  useEffect(() => {
    if (!open || currentUserId) return;

    const loadCurrentUser = async () => {
      try {
        const me = await fetchMyProfile();
        setCurrentUserId(me.id);
      } catch {
        // Silent: invite controls will fallback to optimistic behavior if needed.
      }
    };

    void loadCurrentUser();
  }, [open, currentUserId]);

  useEffect(() => {
    if (!open || !selectedNotification || !selectedInviteTarget || !currentUserId) return;
    if (selectedInviteHandledState) return;

    const existing = inviteStatusByNotification[selectedNotification.id];
    if (existing) return;

    const resolveInviteStatus = async () => {
      setInviteStatusLoading(true);
      try {
        let isPending = false;
        if (selectedInviteTarget.entityType === "project") {
          const project = await getProject(selectedInviteTarget.entityId);
          isPending = (project.pending_members ?? []).some((member) => member.id === currentUserId);
        } else {
          const recruitment = await getRecruitment(selectedInviteTarget.entityId);
          isPending = (recruitment.pending_recruiters ?? []).some(
            (member) => member.id === currentUserId
          );
        }

        setInviteStatusByNotification((prev) => ({
          ...prev,
          [selectedNotification.id]: isPending ? "pending" : "resolved",
        }));

        if (!isPending) {
          setHandledInvites((prev) => ({
            ...prev,
            [selectedNotification.id]: "resolved",
          }));
        }
      } catch {
        // Keep current UI if status check fails.
      } finally {
        setInviteStatusLoading(false);
      }
    };

    void resolveInviteStatus();
  }, [
    open,
    selectedNotification,
    selectedInviteTarget,
    currentUserId,
    selectedInviteHandledState,
    inviteStatusByNotification,
  ]);

  const markSelectedRead = async (notification: NotificationRead) => {
    if (notification.is_read) return;

    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item
      )
    );
    syncUnread(Math.max(0, unreadCount - 1));

    try {
      await markNotificationRead(notification.id);
    } catch {
      void loadNotifications();
    }
  };

  const onSelect = (notification: NotificationRead) => {
    setSelectedId(notification.id);
    void markSelectedRead(notification);
  };

  const requestDelete = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    setConfirmDeleteId(notificationId);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    const previous = notifications;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    syncUnread(previous.filter((n) => !n.is_read && n.id !== id).length);
    try {
      await deleteNotification(id);
    } catch {
      setNotifications(previous);
      syncUnread(previous.filter((n) => !n.is_read).length);
    }
  };

  const onMarkAllRead = async () => {
    if (unreadCount === 0 || markAllLoading) return;
    const previous = notifications;

    setMarkAllLoading(true);
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
    syncUnread(0);

    try {
      await markAllNotificationsRead();
    } catch {
      setNotifications(previous);
      syncUnread(previous.filter((item) => !item.is_read).length);
      setErrorMessage("Could not mark all as read.");
    } finally {
      setMarkAllLoading(false);
    }
  };

  const onOpenTarget = () => {
    if (!selectedNotification) return;
    const target = resolveClientLink(selectedNotification.link);
    if (!target) return;

    if (target.startsWith("http://") || target.startsWith("https://")) {
      window.open(target, "_blank", "noopener,noreferrer");
      return;
    }

    router.push(target);
    onClose();
  };

  const onRespondToInvite = async (decision: "accept" | "reject") => {
    if (!selectedNotification || !selectedInviteTarget || inviteActionLoading) return;
    if (selectedInviteHandledState) return;

    setInviteActionLoading(decision);
    setInviteActionError(null);
    try {
      if (selectedInviteTarget.entityType === "project") {
        if (decision === "accept") {
          await acceptProjectInvite(selectedInviteTarget.entityId);
        } else {
          await rejectProjectInvite(selectedInviteTarget.entityId);
        }
      } else if (decision === "accept") {
        await acceptRecruiterInvite(selectedInviteTarget.entityId);
      } else {
        await rejectRecruiterInvite(selectedInviteTarget.entityId);
      }

      setHandledInvites((prev) => ({
        ...prev,
        [selectedNotification.id]: decision === "accept" ? "accepted" : "rejected",
      }));
      setInviteStatusByNotification((prev) => ({
        ...prev,
        [selectedNotification.id]: "resolved",
      }));
      await markNotificationRead(selectedNotification.id);
      await loadNotifications();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Could not update invitation.";

      if (message.toLowerCase().includes("no pending invitation found")) {
        setHandledInvites((prev) => ({
          ...prev,
          [selectedNotification.id]: "resolved",
        }));
        setInviteStatusByNotification((prev) => ({
          ...prev,
          [selectedNotification.id]: "resolved",
        }));
        setInviteActionError(null);
        await markNotificationRead(selectedNotification.id).catch(() => undefined);
        await loadNotifications();
      } else {
        setInviteActionError(message);
      }
    } finally {
      setInviteActionLoading(null);
    }
  };

  const closeDetail = () => setSelectedId(null);

  return (
    <div className={`notif-drawer${open ? " notif-drawer--open" : ""}`} aria-hidden={!open}>
      <button className="notif-backdrop" aria-label="Close notifications" onClick={onClose} />

      <button
        className={`notif-detail-backdrop${open && selectedNotification ? " notif-detail-backdrop--open" : ""}`}
        aria-label="Close notification detail"
        onClick={closeDetail}
      />

      <aside className={`notif-detail${open && selectedNotification ? " notif-detail--open" : ""}`}>
        {selectedNotification ? (
          <>
            <button className="notif-detail__close" onClick={closeDetail} aria-label="Close detail card">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div className="notif-detail__top">
              <span className="notif-detail__chip">{selectedNotification.type.replaceAll("_", " ")}</span>
            </div>

            <h3 className="notif-detail__title">{selectedNotification.title}</h3>

            <p className="notif-detail__message">{selectedNotification.message}</p>

            <div className="notif-detail__sender">
              {selectedNotification.sender_avatar ? (
                <img
                  src={withAbsoluteAvatar(selectedNotification.sender_avatar)}
                  alt={selectedNotification.sender_name ?? "Sender avatar"}
                  className="notif-detail__sender-avatar"
                />
              ) : (
                <div className="notif-detail__sender-avatar notif-detail__sender-avatar--fallback">
                  {(selectedNotification.sender_name ?? "I").charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="notif-detail__sender-name">{selectedNotification.sender_name ?? "IITK ProjectSpace"}</p>
                <p className="notif-detail__sender-sub">Notification source</p>
              </div>
            </div>

            <div className="notif-detail__meta">
              <span className="notif-detail__time">{getRelativeTime(selectedNotification.created_at)}</span>
            </div>

            {selectedInviteHandledState && (
              <p
                className={`notif-detail__action-state ${
                  selectedInviteHandledState === "rejected"
                    ? "notif-detail__action-state--danger"
                    : "notif-detail__action-state--success"
                }`}
              >
                {selectedInviteHandledState === "accepted" && "Invitation accepted."}
                {selectedInviteHandledState === "rejected" && "Invitation rejected."}
                {selectedInviteHandledState === "resolved" && "Invitation already handled."}
              </p>
            )}
            {!selectedInviteHandledState && selectedInviteTarget && inviteStatusLoading && (
              <p className="notif-detail__action-state">Checking invitation status...</p>
            )}
            {inviteActionError && (
              <p className="notif-detail__action-state notif-detail__action-state--error">
                {inviteActionError}
                {selectedInviteTarget && (
                  <>
                    {" "}
                    [target={selectedInviteTarget.entityType}:{selectedInviteTarget.entityId}]
                  </>
                )}
              </p>
            )}

            <div className="notif-detail__actions">
              {selectedInviteTarget &&
              !selectedInviteHandledState &&
              selectedInviteStatus !== "resolved" ? (
                <>
                  <button
                    className="notif-detail__btn notif-detail__btn--primary"
                    onClick={() => void onRespondToInvite("accept")}
                    disabled={!!inviteActionLoading || inviteStatusLoading}
                  >
                    {inviteActionLoading === "accept" ? "Accepting..." : "Accept"}
                  </button>
                  <button
                    className="notif-detail__btn notif-detail__btn--danger"
                    onClick={() => void onRespondToInvite("reject")}
                    disabled={!!inviteActionLoading || inviteStatusLoading}
                  >
                    {inviteActionLoading === "reject" ? "Rejecting..." : "Reject"}
                  </button>
                </>
              ) : showPrimaryAction ? (
                <button className="notif-detail__btn notif-detail__btn--primary" onClick={onOpenTarget}>
                  {getActionLabel(selectedNotification.type)}
                </button>
              ) : null}
              <button className="notif-detail__btn" onClick={onOpenTarget}>
                Open Page
              </button>
            </div>
          </>
        ) : (
          <div className="notif-empty">
            <p>Select a notification to view full details.</p>
          </div>
        )}
      </aside>

      <aside className={`notif-panel${open ? " notif-panel--open" : ""}`}>
        <div className="notif-panel__header">
          <div>
            <h2>Notifications</h2>
            <p>{unreadCount} unread</p>
          </div>
          <button className="notif-panel__close" onClick={onClose} aria-label="Close notifications panel">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="notif-panel__toolbar">
          <button
            className="notif-panel__mark-all"
            onClick={onMarkAllRead}
            disabled={markAllLoading || unreadCount === 0}
          >
            {markAllLoading ? "Updating..." : "Mark all as read"}
          </button>
        </div>

        <div className="notif-panel__list">
          {loading && <p className="notif-panel__state">Loading notifications...</p>}
          {!loading && errorMessage && <p className="notif-panel__state notif-panel__state--error">{errorMessage}</p>}
          {!loading && !errorMessage && notifications.length === 0 && (
            <p className="notif-panel__state">No notifications yet.</p>
          )}

          {!loading &&
            !errorMessage &&
            notifications.map((notification) => {
              const isActive = selectedId === notification.id;
              return (
                <div
                  key={notification.id}
                  className={`notif-item${isActive ? " notif-item--active" : ""}${notification.is_read ? "" : " notif-item--unread"}`}
                  onClick={() => onSelect(notification)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onSelect(notification)}
                >
                  <div className="notif-item__icon">
                    <NotificationIcon type={notification.type} />
                  </div>

                  <div className="notif-item__content">
                    <div className="notif-item__title-row">
                      <strong>{notification.title}</strong>
                      <span>{getRelativeTime(notification.created_at)}</span>
                    </div>
                    <p>{notification.message}</p>
                  </div>

                  <button
                    className="notif-item__delete-btn"
                    onClick={(e) => requestDelete(e, notification.id)}
                    aria-label="Delete notification"
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              );
            })}
        </div>
      </aside>

      {confirmDeleteId && (
        <ConfirmPopup
          heading="Delete Notification"
          message="Are you sure you want to delete this notification? This cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          isDestructive={true}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
};

export default NotificationDrawer;
