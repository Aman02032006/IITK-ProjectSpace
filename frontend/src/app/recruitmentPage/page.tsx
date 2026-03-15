"use client";

import React from "react";
import "./recruitmentPage.css";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

/* Types — mirrors recruitments.py model */
export interface Recruiter {
  id: string;
  name: string;
  avatar_url?: string;
}

export interface Recruitment {
  id: string;
  title: string;
  description: string;
  description_format: "plain-text" | "markdown";

  domains: string[];
  prerequisites: string[];
  allowed_designations: string[];
  allowed_departments: string[];

  status: "Open" | "Closed";

  created_at: string;
  updated_at: string;

  // Populated via RecruitmentRecruiterLink join
  recruiters: Recruiter[];

  // Derived by API — total application count (not exposing individual applications)
  application_count?: number;
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

/* Description */
const DescriptionBlock: React.FC<{ text: string; format: string }> = ({ text, format }) => {
  if (format === "markdown") {
    const html = text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br />");
    return <p className="recruit-description" dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <p className="recruit-description">{text}</p>;
};

/* Icons */
const CalendarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8"  y1="2" x2="8"  y2="6" />
    <line x1="3"  y1="10" x2="21" y2="10" />
  </svg>
);

const UsersIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

/* RecruitmentPage */
interface RecruitmentPageProps {
  recruitment: Recruitment;
  onApply?: () => void;
}

const RecruitmentPage: React.FC<RecruitmentPageProps> = ({ recruitment, onApply }) => {
  const {
    title,
    description,
    description_format,
    domains,
    prerequisites,
    allowed_designations,
    allowed_departments,
    status,
    created_at,
    updated_at,
    recruiters,
    application_count,
  } = recruitment;

  const isOpen = status === "Open";
  const wasUpdated = updated_at !== created_at;

  return (
    <div className="app-shell">
      <Header showEditProfile={false} />

      <div className="app-body">
        <Sidebar defaultActive="home" />

        {/* Main */}
        <main className="recruit-main">
        <div className="recruit-card">

          {/* Top row: stacked recruiter avatars + status badge + Apply */}
          <div className="recruit-top-row">
            <div className="recruit-recruiters-inline">
              {/* Stacked avatars */}
              <div className="recruit-avatar-stack">
                {recruiters.slice(0, 4).map((r, i) => (
                  <div
                    key={r.id}
                    className={`recruit-avatar-stack-item c${(i % 5) + 1}`}
                    title={r.name}
                  >
                    {r.avatar_url
                      ? <img src={r.avatar_url} alt={r.name} />
                      : getInitials(r.name)
                    }
                  </div>
                ))}
              </div>
              {/* Names label */}
              <span className="recruit-recruiters-label">
                {recruiters.map(r => r.name.split(" ")[0]).join(", ")}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* Status badge */}
              <span className={`recruit-status-badge ${isOpen ? "open" : "closed"}`}>
                <span className="recruit-status-dot" />
                {status}
              </span>

              {/* Apply button */}
              <button
                className="recruit-apply-btn"
                onClick={onApply}
                disabled={!isOpen}
              >
                Apply
              </button>
            </div>
          </div>

          {/* Title */}
          <h1 className="recruit-title">{title}</h1>

          {/* Domain tags */}
          {domains.length > 0 && (
            <div className="recruit-tags">
              {domains.map((tag) => (
                <span key={tag} className="recruit-tag">{tag}</span>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="recruit-section-heading">Project and Recruitment Details</div>
          <DescriptionBlock text={description} format={description_format} />

          {/* Prerequisites */}
          {prerequisites.length > 0 && (
            <>
              <hr className="recruit-divider" />
              <div>
                <div className="recruit-section-heading">Prerequisites</div>
                <div className="recruit-prereq-tags">
                  {prerequisites.map((p) => (
                    <span key={p} className="recruit-prereq-tag">{p}</span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Eligibility */}
          {(allowed_designations.length > 0 || allowed_departments.length > 0) && (
            <>
              <hr className="recruit-divider" />
              <div>
                <div className="recruit-section-heading">Eligibility</div>
                <div className="recruit-eligibility-grid">
                  {allowed_designations.length > 0 && (
                    <div>
                      <div className="recruit-eligibility-group-label">Designations</div>
                      <div className="recruit-eligibility-chips">
                        {allowed_designations.map((d) => (
                          <span key={d} className="recruit-eligibility-chip">{d}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {allowed_departments.length > 0 && (
                    <div>
                      <div className="recruit-eligibility-group-label">Departments</div>
                      <div className="recruit-eligibility-chips">
                        {allowed_departments.map((d) => (
                          <span key={d} className="recruit-eligibility-chip">{d}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Recruiters */}
          {recruiters.length > 0 && (
            <>
              <hr className="recruit-divider" />
              <div>
                <div className="recruit-section-heading">Recruiters</div>
                <div className="recruit-recruiter-list">
                  {recruiters.map((r, i) => (
                    <div key={r.id} className="recruit-recruiter-chip">
                      <div className={`recruit-recruiter-avatar c${(i % 5) + 1}`}>
                        {r.avatar_url
                          ? <img src={r.avatar_url} alt={r.name} />
                          : getInitials(r.name)
                        }
                      </div>
                      <span>{r.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Meta: dates + application count */}
          <hr className="recruit-divider" />
          <div className="recruit-meta">
            <span className="recruit-meta-item">
              <CalendarIcon />
              Posted {formatDate(created_at)}
            </span>
            {wasUpdated && (
              <span className="recruit-meta-item">
                <CalendarIcon />
                Updated {formatDate(updated_at)}
              </span>
            )}
            {application_count !== undefined && (
              <span className="recruit-meta-item">
                <UsersIcon />
                {application_count} application{application_count !== 1 ? "s" : ""}
              </span>
            )}
          </div>

        </div>
        </main>
      </div>
    </div>
  );
};

export default RecruitmentPage;