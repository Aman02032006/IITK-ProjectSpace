"use client";

import React, { useState, useEffect, Suspense } from "react";
import "./projectPage.css";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { useSearchParams, useRouter } from "next/navigation";
import {
  acceptProjectInvite,
  getProject,
  ProjectPublic,
  rejectProjectInvite,
  UserSummary,
} from "@/lib/projectApi";
import { fetchMyProfile } from "@/lib/profileApi";
import { getRepresentativeString } from "@/lib/formatTeam";
import ReactMarkdown from "react-markdown";
import CommentsSection from "../components/commentsSection";

export const dynamic = 'force-dynamic';

/* Types */
export interface Project {
  id: string;
  title: string;
  summary: string;
  description: string;
  description_format: "plain-text" | "markdown";
  domains: string[];
  links: string[];
  media_urls: string[];
  created_at: string;
  updated_at: string;
  team_members?: UserSummary[];
  pending_members?: UserSummary[];
  creator_name?: string;
  creator_avatar_url?: string;
}

/* Helpers */
function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const getFullUrl = (url?: string) => url ? (url.startsWith("http") ? url : `${API_BASE_URL}${url}`) : undefined;

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

function mapToProject(p: ProjectPublic): Project {
  const extractedName = p.creator_name || "Unknown";
  const extractedAvatar = p.creator_avatar_url;

  return {
    id: p.id,
    title: p.title,
    summary: p.summary,
    description: p.description,
    description_format: p.description_format,
    domains: p.domains,
    links: p.links,
    media_urls: p.media_urls ? p.media_urls.map(url => getFullUrl(url) as string) : [],
    created_at: p.created_at,
    updated_at: p.updated_at,
    team_members: p.team_members.map((m) => ({
      id: m.id,
      fullname: m.fullname,
      designation: m.designation,
      profile_picture_url: getFullUrl(m.profile_picture_url ?? undefined),
    })),
    pending_members: (p.pending_members ?? []).map((m) => ({
      id: m.id,
      fullname: m.fullname,
      designation: m.designation,
      profile_picture_url: getFullUrl(m.profile_picture_url ?? undefined),
    })),
    creator_name: extractedName,
    creator_avatar_url: getFullUrl(extractedAvatar ?? undefined),
  };
}

/* Creator Avatar */
const CreatorAvatar: React.FC<{ name: string; avatarUrl?: string }> = ({ name, avatarUrl }) => (
  <div className="project-creator-avatar">
    {avatarUrl ? <img src={avatarUrl} alt={name} /> : getInitials(name)}
  </div>
);

/* Team Member Chip */
const TeamChip: React.FC<{ member: UserSummary; colorIndex: number }> = ({ member, colorIndex }) => (
  <div className="project-team-chip">
    <div className={`project-team-avatar c${(colorIndex % 5) + 1}`}>
      {member.profile_picture_url
        ? <img src={member.profile_picture_url} alt={member.fullname} />
        : getInitials(member.fullname)
      }
    </div>
    <span>{member.fullname}</span>
  </div>
);

/* Description */
const DescriptionBlock: React.FC<{ text: string; format: string }> = ({ text, format }) => {
  if (format === "markdown") {
    return (
      <div className="markdown-body">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    );
  }
  return <p className="project-description" style={{ whiteSpace: "pre-wrap" }}>{text}</p>;
};

/* Calendar Icon */
const CalendarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

/* Loading Skeleton */
const ProjectSkeleton = () => (
  <div className="project-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    {[80, 50, 100, 40, 200].map((w, i) => (
      <div key={i} style={{
        height: i === 4 ? 160 : 16,
        width: `${w}%`,
        maxWidth: "100%",
        borderRadius: 8,
        background: "var(--border-color)",
        animation: "pulse 1.5s ease-in-out infinite"
      }} />
    ))}
  </div>
);

/* ProjectPage */
const ProjectPageContent: React.FC = () => {
  const searchParams    = useSearchParams();
  const router    = useRouter();
  const projectId = searchParams.get("id") as string;

  const [project, setProject]           = useState<Project | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [creatorId, setCreatorId]         = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [inviteActionLoading, setInviteActionLoading] = useState<"accept" | "reject" | null>(null);
  const [inviteActionError, setInviteActionError] = useState<string | null>(null);
  const [inviteResolved, setInviteResolved] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [raw, me] = await Promise.all([
          getProject(projectId),
          fetchMyProfile(),
        ]);
        setProject(mapToProject(raw));
        setCurrentUserId(me.id);
        setCreatorId(raw.creator_id);
      } catch (error: unknown) {
        const message = getErrorMessage(error, "");
        if (message === "Unauthorized") { router.replace("/auth"); return; }
        if (message.includes("not found") || message.includes("404")) {
          setError("Project not found.");
        } else {
          setError("Failed to load project. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  useEffect(() => {
    setInviteResolved(false);
  }, [projectId]);

  const isTeamMember = project?.team_members?.some((m) => m.id === currentUserId) ?? false;
  const hasPendingInvite = project?.pending_members?.some((m) => m.id === currentUserId) ?? false;
  const showInviteBanner = hasPendingInvite && !inviteResolved;
  const { displayText, representative } = getRepresentativeString(
    project?.team_members || [],
    project?.creator_name,
    project?.creator_avatar_url
  );
  const hasTeam = project?.team_members && project.team_members.length > 0;
  const wasUpdated = project ? project.updated_at !== project.created_at : false;

  const refreshProject = async () => {
    const raw = await getProject(projectId);
    setProject(mapToProject(raw));
    setCreatorId(raw.creator_id);
  };

  const handleInviteAction = async (decision: "accept" | "reject") => {
    if (!project) return;
    if (inviteActionLoading) return;

    setInviteActionLoading(decision);
    setInviteActionError(null);
    try {
      if (decision === "accept") {
        await acceptProjectInvite(project.id);
      } else {
        await rejectProjectInvite(project.id);
      }
      setInviteResolved(true);
      await refreshProject();
    } catch (actionError: unknown) {
      const message = getErrorMessage(actionError, "Could not update invitation.");
      if (message === "Unauthorized") {
        router.replace("/auth");
        return;
      }
      if (message.toLowerCase().includes("no pending invitation found")) {
        setInviteResolved(true);
        setInviteActionError(null);
        await refreshProject().catch(() => undefined);
      } else {
        setInviteActionError(message);
      }
    } finally {
      setInviteActionLoading(null);
    }
  };

  return (
    <div className="app-shell">
      <Header
        showEditProfile={false}
        editHref={isTeamMember ? `/projectPage/editProjectPage?id=${projectId}` : undefined}
        editLabel="Edit Project"
      />

      <div className="app-body">
        <Sidebar defaultActive="home" />

        <main className="project-main">

          {/* Loading */}
          {loading && <ProjectSkeleton />}

          {/* Error */}
          {!loading && error && (
            <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
              {error}
            </div>
          )}

          {/* Project Content */}
          {!loading && !error && project && (
            <div className="project-card">

              {/* Creator row */}
              <div className="project-creator-row">
                <div className="project-creator-info">
                  <CreatorAvatar 
                    name={representative?.fullname || "Unknown"}
                    avatarUrl={representative?.profile_picture_url}
                  />
                  <div className="project-creator-name">{displayText}</div>
                </div>
              </div>

              {showInviteBanner && (
                <div className="project-invite-banner">
                  <p className="project-invite-banner__text">
                    You have been invited to join this project team.
                  </p>
                  <div className="project-invite-banner__actions">
                    <button
                      className="project-invite-banner__btn project-invite-banner__btn--accept"
                      disabled={!!inviteActionLoading}
                      onClick={() => void handleInviteAction("accept")}
                    >
                      {inviteActionLoading === "accept" ? "Accepting..." : "Accept"}
                    </button>
                    <button
                      className="project-invite-banner__btn project-invite-banner__btn--reject"
                      disabled={!!inviteActionLoading}
                      onClick={() => void handleInviteAction("reject")}
                    >
                      {inviteActionLoading === "reject" ? "Rejecting..." : "Reject"}
                    </button>
                  </div>
                  {inviteActionError && (
                    <p className="project-invite-banner__error">{inviteActionError}</p>
                  )}
                </div>
              )}

              {/* Title */}
              <h1 className="project-title">{project.title}</h1>

              {/* Summary */}
              {project.summary && <p className="project-summary">{project.summary}</p>}

              {/* Domain tags */}
              {project.domains.length > 0 && (
                <div className="project-tags">
                  {project.domains.map((tag) => (
                    <span key={tag} className="project-tag">{tag}</span>
                  ))}
                </div>
              )}

              {/* Details */}
              <div className="project-section-heading">Details</div>
              <DescriptionBlock text={project.description} format={project.description_format} />

              {/* Media */}
              {project.media_urls.length > 0 && (
                <div className={`project-media-grid${project.media_urls.length === 1 ? " single-media" : ""}`}>
                  {project.media_urls.map((url, i) => (
                    <img key={i} src={url} alt={`Project media ${i + 1}`} className="project-media-item" />
                  ))}
                </div>
              )}

              {/* Team Members */}
              {hasTeam && (
                <>
                  <hr className="project-divider" />
                  <div className="project-team">
                    <div className="project-section-heading">Team</div>
                    <div className="project-team-list">
                      {project.team_members!.map((member, i) => (
                        <TeamChip key={member.id} member={member} colorIndex={i} />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* External links */}
              {project.links.length > 0 && (
                <>
                  <hr className="project-divider" />
                  <div className="project-links">
                    <div className="project-section-heading">Links</div>
                    <div className="project-links-list">
                      {project.links.map((link, i) => (
                        <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="project-link-item">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Meta: dates */}
              <hr className="project-divider" />
              <div className="project-meta">
                <span className="project-meta-item">
                  <CalendarIcon />
                  Posted {formatDate(project.created_at)}
                </span>
                {wasUpdated && (
                  <span className="project-meta-item">
                    <CalendarIcon />
                    Last updated {formatDate(project.updated_at)}
                  </span>
                )}
              </div>

              {/* Comments */}
              <hr className="project-divider" />
              <CommentsSection
                postId={project.id}
                postType="project"
                currentUserId={currentUserId}
                postCreatorId={creatorId}
              />

            </div>
          )}

        </main>
      </div>
    </div>
  );
};

const ProjectPage: React.FC = () => (
  <Suspense fallback={<ProjectSkeleton />}>
    <ProjectPageContent />
  </Suspense>
);

export default ProjectPage;
