"use client";

import React from "react";
import "./projectPage.css";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

/* Types */
export interface TeamMember {
  id: string;
  name: string;
  avatar_url?: string;
}

export interface Project {
  id: string;
  title: string;
  summary: string;
  description: string;
  description_format: "plain-text" | "markdown";
  domains: string[];
  links: string[];
  media_urls: string[];
  creator_id: string;
  created_at: string;
  updated_at: string;

  // Joined from User table by API
  creator_name?: string;
  creator_avatar_url?: string;

  // Populated using ProjectTeamLink join
  team_members?: TeamMember[];
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

/* Creator Avatar */
const CreatorAvatar: React.FC<{ name: string; avatarUrl?: string }> = ({ name, avatarUrl }) => (
  <div className="project-creator-avatar">
    {avatarUrl ? <img src={avatarUrl} alt={name} /> : getInitials(name)}
  </div>
);

/* Team Member Chip */
const TeamChip: React.FC<{ member: TeamMember; colorIndex: number }> = ({ member, colorIndex }) => (
  <div className="project-team-chip">
    <div className={`project-team-avatar c${(colorIndex % 5) + 1}`}>
      {member.avatar_url
        ? <img src={member.avatar_url} alt={member.name} />
        : getInitials(member.name)
      }
    </div>
    <span>{member.name}</span>
  </div>
);

/* Description */
const DescriptionBlock: React.FC<{ text: string; format: string }> = ({ text, format }) => {
  if (format === "markdown") {
    const html = text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br />");
    return <p className="project-description" dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <p className="project-description">{text}</p>;
};

/* Calendar icon */
const CalendarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

/* ProjectPage */
interface ProjectPageProps {
  project: Project;
}

const ProjectPage: React.FC<ProjectPageProps> = ({ project }) => {
  const {
    title,
    summary,
    description,
    description_format,
    domains,
    links,
    media_urls,
    creator_name,
    creator_avatar_url,
    created_at,
    updated_at,
    team_members,
  } = project;

  const creatorDisplayName = creator_name ?? "Unknown";
  const hasTeam = team_members && team_members.length > 0;
  const wasUpdated = updated_at !== created_at;

  return (
    <div className="app-shell">
      <Header showEditProfile={false} />

      <div className="app-body">
        <Sidebar defaultActive="home" />

        {/* Main */}
        <main className="project-main">
        <div className="project-card">

          {/* Creator row */}
          <div className="project-creator-row">
            <div className="project-creator-info">
              <CreatorAvatar name={creatorDisplayName} avatarUrl={creator_avatar_url} />
              <div className="project-creator-name">{creatorDisplayName}</div>
            </div>
          </div>

          {/* Title */}
          <h1 className="project-title">{title}</h1>

          {/* Summary */}
          {summary && <p className="project-summary">{summary}</p>}

          {/* Domain tags */}
          {domains.length > 0 && (
            <div className="project-tags">
              {domains.map((tag) => (
                <span key={tag} className="project-tag">{tag}</span>
              ))}
            </div>
          )}

          {/* Details */}
          <div className="project-section-heading">Details</div>
          <DescriptionBlock text={description} format={description_format} />

          {/* Media */}
          {media_urls.length > 0 && (
            <div className={`project-media-grid${media_urls.length === 1 ? " single-media" : ""}`}>
              {media_urls.map((url, i) => (
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
                  {team_members!.map((member, i) => (
                    <TeamChip key={member.id} member={member} colorIndex={i} />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* External links */}
          {links.length > 0 && (
            <>
              <hr className="project-divider" />
              <div className="project-links">
                <div className="project-section-heading">Links</div>
                <div className="project-links-list">
                  {links.map((link, i) => (
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
              Posted {formatDate(created_at)}
            </span>
            {wasUpdated && (
              <span className="project-meta-item">
                <CalendarIcon />
                Last updated {formatDate(updated_at)}
              </span>
            )}
          </div>

        </div>
        </main>
      </div>
    </div>
  );
};

export default ProjectPage;