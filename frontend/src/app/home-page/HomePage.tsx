"use client";

import React, { Suspense, useState, useEffect, useRef } from "react";
import "./HomePage.css";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { useRouter } from "next/navigation";
import { getAllProjects, getProjectCount, ProjectSummary } from "@/lib/projectApi";
import { getAllRecruitments, getRecruitmentCount, RecruitmentSummary } from "@/lib/recruitmentApi";
import { getRepresentativeString } from "@/lib/formatTeam";


/* Types */
export interface FeedMember {
  id: string;
  name: string;
  avatar_url?: string;
}

export interface ProjectFeedItem {
  id: string;
  title: string;
  description: string;
  media_urls: string[];
  creator_name: string;
  creator_role?: string;
  creator_avatar_url?: string;
  institution?: string;
  time_ago: string;
  team_members: FeedMember[];
}

export interface RecruitmentFeedItem {
  id: string;
  title: string;
  description: string;
  media_urls: string[];
  status: "Open" | "Closed";
  creator_name: string;
  creator_role?: string;
  creator_avatar_url?: string;
  institution?: string;
  time_ago: string;
  team_members: FeedMember[];
}

/* Helpers */
function chunkPairs<T>(arr: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < arr.length; i += 2) {
    rows.push(arr.slice(i, i + 2));
  }
  return rows;
}

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message === "Unauthorized";
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30)  return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const getFullUrl = (url?: string | null) => url ? (url.startsWith("http") ? url : `${API_BASE_URL}${url}`) : undefined;

function getFirstImageUrl(urls?: string[]): string[] {
  if (!urls) return [];
  const img = urls.find(url => /\.(jpg|jpeg|png|gif|webp)$/i.test(url));
  return img ? [getFullUrl(img) as string] : [];
}

function mapProjectToFeedItem(p: ProjectSummary): ProjectFeedItem {
  const { displayText, representative } = getRepresentativeString(p.team_members, p.creator_name, p.creator_avatar_url);
  return {
    id: p.id,
    title: p.title,
    description: p.summary,
    media_urls: getFirstImageUrl(p.media_urls),
    creator_name: displayText,
    creator_role: representative?.designation,
    creator_avatar_url: getFullUrl(representative?.profile_picture_url ?? undefined),
    institution: "IIT Kanpur",
    time_ago: timeAgo(p.created_at),
    team_members: p.team_members?.map(m => ({ id: m.id, name: m.fullname, avatar_url: getFullUrl(m.profile_picture_url) })) || [],
  };
}

function mapRecruitmentToFeedItem(r: RecruitmentSummary): RecruitmentFeedItem {
  const { displayText, representative } = getRepresentativeString(r.recruiters, r.creator_name, r.creator_avatar_url);
  return {
    id: r.id,
    title: r.title,
    description: r.domains.join(", ") || "Open recruitment",
    media_urls: getFirstImageUrl(r.media_urls),
    status: r.status,
    creator_name: displayText,
    creator_role: representative?.designation,
    creator_avatar_url: getFullUrl(representative?.profile_picture_url ?? undefined),
    institution: "IIT Kanpur",
    time_ago: timeAgo(r.created_at),
    team_members: r.recruiters?.map(m => ({ id: m.id, name: m.fullname, avatar_url: getFullUrl(m.profile_picture_url) })) || [],
  };
}

/* Pagination helpers */
function buildPageSequence(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "…")[] = [];

  const addRange = (from: number, to: number) => {
    for (let i = from; i <= to; i++) pages.push(i);
  };

  pages.push(1);

  if (current <= 4) {
    addRange(2, 5);
    pages.push("…");
    pages.push(total);
  } else if (current >= total - 3) {
    pages.push("…");
    addRange(total - 4, total);
  } else {
    pages.push("…");
    addRange(current - 1, current + 1);
    pages.push("…");
    pages.push(total);
  }

  return pages;
}

/* Share Popup */
interface SharePlatform {
  id: string;
  label: string;
  color: string;
  icon: React.ReactNode;
  getHref: (url: string) => string;
}

const SHARE_PLATFORMS: SharePlatform[] = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    color: "#25D366",
    icon: (
      <svg width="22" height="22" viewBox="0 0 32 32" fill="currentColor">
        <path d="M16 3C8.82 3 3 8.82 3 16c0 2.33.63 4.51 1.72 6.39L3 29l6.77-1.7A13 13 0 0 0 16 29c7.18 0 13-5.82 13-13S23.18 3 16 3zm0 2c6.07 0 11 4.93 11 11s-4.93 11-11 11c-2.01 0-3.89-.54-5.5-1.49l-.39-.23-4.02 1.01 1.03-3.91-.26-.41A10.96 10.96 0 0 1 5 16C5 9.93 9.93 5 16 5zm-3.07 5.5c-.22 0-.57.08-.87.41-.3.33-1.13 1.1-1.13 2.68s1.16 3.1 1.32 3.32c.17.21 2.24 3.56 5.51 4.85 2.72 1.08 3.28.86 3.87.81.59-.05 1.9-.78 2.17-1.53.27-.75.27-1.39.19-1.53-.08-.13-.3-.21-.63-.37-.33-.16-1.9-.94-2.2-1.05-.29-.1-.5-.16-.71.16-.21.33-.82 1.05-1 1.26-.19.21-.37.24-.7.08-.33-.16-1.38-.51-2.63-1.62-.97-.87-1.63-1.94-1.82-2.27-.19-.33-.02-.51.14-.67.15-.15.33-.37.5-.56.16-.19.21-.33.32-.54.1-.21.05-.4-.03-.56-.08-.16-.7-1.75-.97-2.39-.25-.61-.51-.53-.71-.54l-.6-.01z"/>
      </svg>
    ),
    getHref: (url) => `https://wa.me/?text=${encodeURIComponent(url)}`,
  },
  {
    id: "email",
    label: "Email",
    color: "#6b7280",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
    getHref: (url) => `mailto:?subject=Check this out on IITK ProjectSpace&body=${encodeURIComponent(url)}`,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    color: "#0A66C2",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    getHref: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    id: "x",
    label: "X",
    color: "#000000",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    getHref: (url) => `https://x.com/intent/tweet?url=${encodeURIComponent(url)}`,
  },
  {
    id: "reddit",
    label: "Reddit",
    color: "#FF4500",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
      </svg>
    ),
    getHref: (url) => `https://reddit.com/submit?url=${encodeURIComponent(url)}&subreddit=IITK`,
  },
];

const SharePopup: React.FC<{
  url: string;
  onClose: () => void;
}> = ({ url, onClose }) => {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      inputRef.current?.select();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlatformClick = (platform: SharePlatform) => {
    window.open(platform.getHref(url), "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {/* Backdrop */}
      <div className="share-backdrop" onClick={onClose} />
      {/* Panel */}
      <div className="share-popup" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="share-popup__header">
          <span className="share-popup__title">Share</span>
          <button className="share-popup__close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Platform icons */}
        <div className="share-popup__platforms">
          {SHARE_PLATFORMS.map((platform) => (
            <button
              key={platform.id}
              className="share-popup__platform-btn"
              onClick={() => handlePlatformClick(platform)}
              aria-label={`Share on ${platform.label}`}
            >
              <span
                className="share-popup__platform-icon"
                style={{ background: platform.color, color: "#fff" }}
              >
                {platform.icon}
              </span>
              <span className="share-popup__platform-label">{platform.label}</span>
            </button>
          ))}
        </div>

        {/* Divider */}
        <hr className="share-popup__divider" />

        {/* Copy link row */}
        <div className="share-popup__row">
          <input
            ref={inputRef}
            className="share-popup__input"
            value={url}
            readOnly
            onFocus={(e) => e.target.select()}
          />
          <button
            className={`share-popup__copy-btn${copied ? " share-popup__copy-btn--copied" : ""}`}
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy link
              </>
            )}
          </button>
        </div>

      </div>
    </>
  );
};

/* Team Panel */
const TeamPanel: React.FC<{ members: FeedMember[] }> = ({ members }) => (
  <div className="feed-team-panel">
    <div className="feed-team-label">Team Members</div>
    <div className="feed-team-list">
      {members.length === 0 ? (
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>—</span>
      ) : (
        members.map((m, i) => (
          <div key={m.id} className="feed-team-chip">
            <div className={`feed-member-avatar c${(i % 6) + 1}`}>
              {m.avatar_url ? <img src={m.avatar_url} alt={m.name} /> : getInitials(m.name)}
            </div>
            <span className="feed-chip-name">{m.name}</span>
          </div>
        ))
      )}
    </div>
  </div>
);

/* Action Bar */
const ActionBar: React.FC<{
  shareUrl: string;
  onOpenShare: (url: string) => void;
  onComment: () => void;
}> = ({ shareUrl, onOpenShare, onComment }) => (
  <div className="feed-actions">
    <button className="feed-action-btn" onClick={(e) => { e.stopPropagation(); onComment(); }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      Comment
    </button>
    <button
      className="feed-action-btn"
      onClick={(e) => { e.stopPropagation(); onOpenShare(shareUrl); }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      Share
    </button>
  </div>
);

/* Post Header */
const PostHeader: React.FC<{
  name: string; role?: string;
  institution?: string; timeAgo: string; avatarUrl?: string;
}> = ({ name, role, institution, timeAgo, avatarUrl }) => (
  <div className="feed-post-header">
    <div className="feed-creator-avatar">
      {avatarUrl ? <img src={avatarUrl} alt={name} /> : getInitials(name)}
    </div>
    <div className="feed-creator-meta">
      <div className="feed-creator-name-row">
        <strong>{name}</strong>
      </div>
      <div className="feed-creator-detail">
        {[role, institution, timeAgo].filter(Boolean).join(" · ")}
      </div>
    </div>
  </div>
);

/* Project Card */
const ProjectCard: React.FC<{
  item: ProjectFeedItem;
  onClick: () => void;
  onOpenShare: (url: string) => void;
  onComment: () => void;
}> = ({ item, onClick, onOpenShare, onComment }) => {
  const hasImage = item.media_urls.length > 0;
  const shareUrl = `${window.location.origin}/project-page?id=${item.id}`;
  return (
    <div className="feed-group" onClick={onClick} style={{ cursor: "pointer" }}>
      <TeamPanel members={item.team_members} />
      <div className="feed-post">
        <PostHeader name={item.creator_name} role={item.creator_role} institution={item.institution} timeAgo={item.time_ago} avatarUrl={item.creator_avatar_url} />
        <div className="feed-post-title">{item.title}</div>
        {hasImage ? (
          <div className="feed-image-wrap">
            <img src={item.media_urls[0]} alt={item.title} className="feed-image" />
            <div className="feed-image-overlay">
              <p className="feed-snippet-over-image">{item.description}</p>
            </div>
          </div>
        ) : (
          <p className="feed-snippet-plain">{item.description}</p>
        )}
        <ActionBar shareUrl={shareUrl} onOpenShare={onOpenShare} onComment={onComment} />
      </div>
    </div>
  );
};

/* Recruitment Card */
const RecruitmentCard: React.FC<{
  item: RecruitmentFeedItem;
  onClick: () => void;
  onOpenShare: (url: string) => void;
  onComment: () => void;
}> = ({ item, onClick, onOpenShare, onComment }) => {
  const hasImage = item.media_urls.length > 0;
  const isOpen = item.status === "Open";
  const shareUrl = `${window.location.origin}/recruitment-page?id=${item.id}`;
  return (
    <div className="feed-group" onClick={onClick} style={{ cursor: "pointer" }}>
      <TeamPanel members={item.team_members} />
      <div className="feed-post">
        <PostHeader name={item.creator_name} role={item.creator_role} institution={item.institution} timeAgo={item.time_ago} avatarUrl={item.creator_avatar_url} />
        <span className={`feed-status ${isOpen ? "open" : "closed"}`}>
          <span className="feed-status-dot" />{item.status}
        </span>
        <div className="feed-post-title">{item.title}</div>
        {hasImage ? (
          <div className="feed-image-wrap">
            <img src={item.media_urls[0]} alt={item.title} className="feed-image" />
            <div className="feed-image-overlay">
              <p className="feed-snippet-over-image">{item.description}</p>
            </div>
          </div>
        ) : (
          <p className="feed-snippet-plain">{item.description}</p>
        )}
        <ActionBar shareUrl={shareUrl} onOpenShare={onOpenShare} onComment={onComment} />
      </div>
    </div>
  );
};

/* Pagination Bar */
const PaginationBar: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const sequence = buildPageSequence(currentPage, totalPages);

  return (
    <div className="pagination">
      <button
        className="pagination__btn pagination__btn--arrow"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        ‹
      </button>

      {sequence.map((item, i) =>
        item === "…" ? (
          <span key={`ellipsis-${i}`} className="pagination__ellipsis">…</span>
        ) : (
          <button
            key={item}
            className={`pagination__btn${item === currentPage ? " pagination__btn--active" : ""}`}
            onClick={() => onPageChange(item as number)}
          >
            {item}
          </button>
        )
      )}

      <button
        className="pagination__btn pagination__btn--arrow"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
};

/* Loading Skeleton */
const FeedSkeleton = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
    {[1, 2].map(row => (
      <div key={row} className="feed-row">
        {[1, 2].map(col => (
          <div key={col} className="feed-group" style={{ animation: "pulse 1.5s ease-in-out infinite" }}>
            <div style={{ width: 148, borderRight: "1px solid var(--border-color)", background: "var(--bg-card-header)" }} />
            <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ height: 14, borderRadius: 6, background: "var(--border-color)", width: "60%" }} />
              <div style={{ height: 12, borderRadius: 6, background: "var(--border-color)", width: "40%" }} />
              <div style={{ flex: 1, borderRadius: 8, background: "var(--border-color)" }} />
            </div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

/* Icons */
const RecruitIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const ProjectIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

/* Main: HomePage */
type Tab = "project" | "recruitment";

const LIMIT = 10;

const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("project");
  const router  = useRouter();
  const feedRef = useRef<HTMLDivElement>(null);

  // Share popup state
  const [sharePopupUrl, setSharePopupUrl] = useState<string | null>(null);

  // Each tab has its own independent state
  const [projects, setProjects]                         = useState<ProjectFeedItem[]>([]);
  const [projectsPage, setProjectsPage]                 = useState(1);
  const [projectsTotalPages, setProjectsTotalPages]     = useState(1);
  const [projectsLoading, setProjectsLoading]           = useState(false);
  const [projectsInitialized, setProjectsInitialized]   = useState(false);
  const [projectsError, setProjectsError]               = useState<string | null>(null);

  const [recruitments, setRecruitments]                         = useState<RecruitmentFeedItem[]>([]);
  const [recruitmentsPage, setRecruitmentsPage]                 = useState(1);
  const [recruitmentsTotalPages, setRecruitmentsTotalPages]     = useState(1);
  const [recruitmentsLoading, setRecruitmentsLoading]           = useState(false);
  const [recruitmentsInitialized, setRecruitmentsInitialized]   = useState(false);
  const [recruitmentsError, setRecruitmentsError]               = useState<string | null>(null);

  // Share handler — opens the share popup
  const handleOpenShare = (url: string) => setSharePopupUrl(url);

  // Fetch functions
  const fetchProjects = async (page: number) => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const skip = (page - 1) * LIMIT;
      const [raw, total] = await Promise.all([
        getAllProjects(skip, LIMIT),
        projectsInitialized ? Promise.resolve(null) : getProjectCount(),
      ]);
      setProjects(raw.map(mapProjectToFeedItem));
      setProjectsPage(page);
      if (total !== null) {
        setProjectsTotalPages(Math.max(1, Math.ceil(total / LIMIT)));
      }
      setProjectsInitialized(true);
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) { router.replace("/auth"); return; }
      setProjectsError("Failed to load projects. Please try again.");
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchRecruitments = async (page: number) => {
    setRecruitmentsLoading(true);
    setRecruitmentsError(null);
    try {
      const skip = (page - 1) * LIMIT;
      const [raw, total] = await Promise.all([
        getAllRecruitments(skip, LIMIT),
        recruitmentsInitialized ? Promise.resolve(null) : getRecruitmentCount(),
      ]);
      setRecruitments(raw.map(mapRecruitmentToFeedItem));
      setRecruitmentsPage(page);
      if (total !== null) {
        setRecruitmentsTotalPages(Math.max(1, Math.ceil(total / LIMIT)));
      }
      setRecruitmentsInitialized(true);
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) { router.replace("/auth"); return; }
      setRecruitmentsError("Failed to load recruitments. Please try again.");
    } finally {
      setRecruitmentsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects(1);
  }, []);

  useEffect(() => {
    if (activeTab === "recruitment" && !recruitmentsInitialized) {
      fetchRecruitments(1);
    }
  }, [activeTab]);

  const handleProjectPageChange = (page: number) => {
    feedRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    fetchProjects(page);
  };

  const handleRecruitmentPageChange = (page: number) => {
    feedRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    fetchRecruitments(page);
  };

  // Render

  const projectRows     = chunkPairs(projects);
  const recruitmentRows = chunkPairs(recruitments);

  const isProjectTab  = activeTab === "project";
  const isRecruitTab  = activeTab === "recruitment";

  const showProjectSkeleton  = isProjectTab && !projectsInitialized  && projectsLoading;
  const showRecruitSkeleton  = isRecruitTab && !recruitmentsInitialized && recruitmentsLoading;
  const showProjectError     = isProjectTab && !!projectsError;
  const showRecruitError     = isRecruitTab && !!recruitmentsError;

  return (
    <div className="app-shell">
      <Suspense fallback={<div />}>
        <Header showEditProfile={false} />
      </Suspense>

      {/* Global toast — rendered outside the feed so it always floats on top */}
      {/* Share popup */}
      {sharePopupUrl && (
        <SharePopup url={sharePopupUrl} onClose={() => setSharePopupUrl(null)} />
      )}

      <div className="app-body">
        <Sidebar defaultActive="home" />

        <main className="home-main">
          {/* Tabs */}
          <div className="home-tabs">
            <button
              className={`home-tab${isProjectTab ? " active" : ""}`}
              onClick={() => setActiveTab("project")}
            >
              <ProjectIcon /> Projects
            </button>
            <button
              className={`home-tab${isRecruitTab ? " active" : ""}`}
              onClick={() => setActiveTab("recruitment")}
            >
              <RecruitIcon /> Recruitments
            </button>
          </div>

          {/* Feed */}
          <div className="home-feed" ref={feedRef}>

            {/* Skeletons on first load */}
            {(showProjectSkeleton || showRecruitSkeleton) && <FeedSkeleton />}

            {/* Skeleton on page change (already initialized) */}
            {isProjectTab  && projectsInitialized  && projectsLoading  && <FeedSkeleton />}
            {isRecruitTab  && recruitmentsInitialized && recruitmentsLoading && <FeedSkeleton />}

            {/* Error states */}
            {showProjectError && (
              <p style={{ color: "var(--text-muted)", fontSize: 14, padding: "20px 0", textAlign: "center" }}>
                {projectsError}
              </p>
            )}
            {showRecruitError && (
              <p style={{ color: "var(--text-muted)", fontSize: 14, padding: "20px 0", textAlign: "center" }}>
                {recruitmentsError}
              </p>
            )}

            {/* Projects feed */}
            {isProjectTab && projectsInitialized && !projectsLoading && !projectsError && (
              projectRows.length === 0
                ? <p style={{ color: "var(--text-muted)", fontSize: 14, padding: "20px 0" }}>No projects yet.</p>
                : projectRows.map((row, ri) => (
                    <div className="feed-row" key={ri}>
                      {row.map((p) => (
                        <ProjectCard
                          key={p.id}
                          item={p}
                          onClick={() => router.push(`/project-page?id=${p.id}`)}
                          onOpenShare={handleOpenShare}
                          onComment={() => router.push(`/project-page?id=${p.id}#comments`)}
                        />
                      ))}
                    </div>
                  ))
            )}

            {/* Recruitments feed */}
            {isRecruitTab && recruitmentsInitialized && !recruitmentsLoading && !recruitmentsError && (
              recruitmentRows.length === 0
                ? <p style={{ color: "var(--text-muted)", fontSize: 14, padding: "20px 0" }}>No recruitments yet.</p>
                : recruitmentRows.map((row, ri) => (
                    <div className="feed-row" key={ri}>
                      {row.map((r) => (
                        <RecruitmentCard
                          key={r.id}
                          item={r}
                          onClick={() => router.push(`/recruitment-page?id=${r.id}`)}
                          onOpenShare={handleOpenShare}
                          onComment={() => router.push(`/recruitment-page?id=${r.id}#comments`)}
                        />
                      ))}
                    </div>
                  ))
            )}

            {/* Pagination bars */}
            {isProjectTab && projectsInitialized && !projectsLoading && !projectsError && (
              <PaginationBar
                currentPage={projectsPage}
                totalPages={projectsTotalPages}
                onPageChange={handleProjectPageChange}
              />
            )}
            {isRecruitTab && recruitmentsInitialized && !recruitmentsLoading && !recruitmentsError && (
              <PaginationBar
                currentPage={recruitmentsPage}
                totalPages={recruitmentsTotalPages}
                onPageChange={handleRecruitmentPageChange}
              />
            )}

          </div>
        </main>
      </div>
    </div>
  );
};

export default HomePage;
