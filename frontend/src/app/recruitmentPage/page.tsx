"use client";

import React, { useState, useEffect, Suspense } from "react";
import "./recruitmentPage.css";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { useSearchParams, useRouter } from "next/navigation";
import { getRecruitment, applyToRecruitment, updateRecruitment, RecruitmentPublic } from "@/lib/recruitmentApi";
import { fetchMyProfile } from "@/lib/profileApi";
import { getRepresentativeString } from "@/lib/formatTeam";
import { getRouteRegex } from "next/dist/shared/lib/router/utils/route-regex";
import ReactMarkdown from "react-markdown";
import CommentsSection from "../components/commentsSection";

/* Types */
export interface Recruiter {
  id: string;
  name: string;
  designation: string;
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
  recruiters: Recruiter[];
  application_count?: number;
  applications: any[];
}

/* Helpers */
function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(iso: string | undefined | null): string {
  if (!iso) return "Unknown Date";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Unknown Date";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Unknown Date";
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const getFullUrl = (url?: string) => url ? (url.startsWith("http") ? url : `${API_BASE_URL}${url}`) : undefined;

function mapToRecruitment(r: RecruitmentPublic): Recruitment {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    description_format: r.description_format,
    domains: r.domains,
    prerequisites: r.prerequisites,
    allowed_designations: r.allowed_designations,
    allowed_departments: r.allowed_departments,
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at,
    recruiters: r.recruiters.map((rec) => ({
      id: rec.id,
      name: rec.fullname,
      designation: rec.designation,
      avatar_url: getFullUrl(rec.profile_picture_url ?? undefined),
    })),
    application_count: r.applications.length,
    applications: r.applications || [],
  };
}

/* Description */
const DescriptionBlock: React.FC<{ text: string; format: string }> = ({ text, format }) => {
  if (format === "markdown") {
    return (
      <div className="markdown-body">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    );
  }
  return <p className="recruit-description" style={{ whiteSpace: "pre-wrap" }}>{text}</p>;
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

/* Loading Skeleton */
const RecruitmentSkeleton = () => (
  <div className="recruit-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    {[60, 40, 100, 30, 200].map((w, i) => (
      <div key={i} style={{
        height: i === 4 ? 160 : 16,
        width: `${w}%`,
        maxWidth: "100%",
        borderRadius: 8,
        background: "var(--border-color)",
        animation: "pulse 1.5s ease-in-out infinite",
      }} />
    ))}
  </div>
);

/* RecruitmentPage */
const RecruitmentPage: React.FC = () => {
  const searchParams        = useSearchParams();
  const router        = useRouter();
  const recruitmentId = searchParams.get("id") as string;

  const [recruitment, setRecruitment]   = useState<Recruitment | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [creatorId, setCreatorId]         = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [applying, setApplying]         = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError]     = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  useEffect(() => {
    if (!recruitmentId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [raw, me] = await Promise.all([
          getRecruitment(recruitmentId),
          fetchMyProfile(),
        ]);
        setRecruitment(mapToRecruitment(raw));
        setCurrentUserId(me.id);
        setCreatorId(raw.creator_id);
      } catch (err: any) {
        if (err.message === "Unauthorized") { router.replace("/loginPage"); return; }
        if (err.message.includes("not found") || err.message.includes("404")) {
          setError("Recruitment not found.");
        } else {
          setError("Failed to load recruitment. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [recruitmentId]);

  const handleApply = async () => {
    if (!recruitment) return;
    setApplying(true);
    setApplyError(null);
    try {
      await applyToRecruitment(recruitment.id, { recruitment_id: recruitment.id });
      setApplySuccess(true);
    } catch (err: any) {
      setApplyError(err.message || "Failed to apply. Please try again.");
    } finally {
      setApplying(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!recruitment) return;
    setTogglingStatus(true);
    try {
      const newStatus = recruitment.status === "Open" ? "Closed" : "Open";
      await updateRecruitment(recruitment.id, { status: newStatus });
      setRecruitment({ ...recruitment, status: newStatus });
    } catch (err: any) {
      alert(err.message || "Failed to update recruitment status.");
    } finally {
      setTogglingStatus(false);
    }
  };

  const { displayText } = getRepresentativeString(recruitment?.recruiters as any || []);

  const isRecruiter = recruitment?.recruiters?.some((r) => r.id === currentUserId) ?? false;
  const isOpen     = recruitment?.status === "Open";
  const wasUpdated = recruitment ? recruitment.updated_at !== recruitment.created_at : false;
  const hasApplied = recruitment?.applications?.some((app: any) => app.applicant?.id === currentUserId) ?? false;

  let applyText = "Apply";
  if (applying) applyText = "Applying...";
  else if (hasApplied || applySuccess) applyText = "Applied";
  else if (isRecruiter) applyText = "Cannot Apply";
  else if (!isOpen) applyText = "Closed";

  return (
    <Suspense fallback={<RecruitmentSkeleton />}>
    <div className="app-shell">
      <Header
        showEditProfile={false}
        editHref={isRecruiter ? `/recruitmentPage/editRecruitmentPage?id=${recruitmentId}` : undefined}
        editLabel="Edit Recruitment"
      />

      <div className="app-body">
        <Sidebar defaultActive="home" />

        <main className="recruit-main">

          {/* Loading */}
          {loading && <RecruitmentSkeleton />}

          {/* Error */}
          {!loading && error && (
            <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
              {error}
            </div>
          )}

          {/* Recruitment Content */}
          {!loading && !error && recruitment && (
            <div className="recruit-card">

              {/* Recruiters + Status + Apply */}
              <div className="recruit-top-row">
                <div className="recruit-recruiters-inline">
                  <div className="recruit-avatar-stack">
                    {recruitment.recruiters.slice(0, 4).map((r, i) => (
                      <div key={r.id} className={`recruit-avatar-stack-item c${(i % 5) + 1}`} title={r.name}>
                        {r.avatar_url ? <img src={r.avatar_url} alt={r.name} /> : getInitials(r.name)}
                      </div>
                    ))}
                  </div>
                  <span className="recruit-recruiters-label">
                    {displayText}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {isRecruiter && (
                    <button
                      className="recruit-apply-btn"
                      onClick={handleToggleStatus}
                      disabled={togglingStatus}
                      style={{ background: isOpen ? "#a53d2a" : "#1a9e72" }}
                    >
                      {togglingStatus ? "Updating..." : isOpen ? "Close Recruitment" : "Open Recruitment"}
                    </button>
                  )}
                  <span className={`recruit-status-badge ${isOpen ? "open" : "closed"}`}>
                    <span className="recruit-status-dot" />
                    {recruitment.status}
                  </span>

                  <button
                    className="recruit-apply-btn"
                    onClick={handleApply}
                    disabled={!isOpen || applying || applySuccess || hasApplied || isRecruiter}
                  >
                    {applyText}
                  </button>
                </div>
              </div>

              {/* Apply feedback */}
              {applySuccess && (
                <p style={{ color: "#1a9e72", fontSize: 13, marginBottom: 8 }}>
                  Your application has been submitted successfully!
                </p>
              )}
              {applyError && (
                <p style={{ color: "#a53d2a", fontSize: 13, marginBottom: 8 }}>
                  {applyError}
                </p>
              )}

              {/* Title */}
              <h1 className="recruit-title">{recruitment.title}</h1>

              {/* Domain tags */}
              {recruitment.domains.length > 0 && (
                <div className="recruit-tags">
                  {recruitment.domains.map((tag) => (
                    <span key={tag} className="recruit-tag">{tag}</span>
                  ))}
                </div>
              )}

              {/* Description */}
              <div className="recruit-section-heading">Project and Recruitment Details</div>
              <DescriptionBlock text={recruitment.description} format={recruitment.description_format} />

              {/* Prerequisites */}
              {recruitment.prerequisites.length > 0 && (
                <>
                  <hr className="recruit-divider" />
                  <div>
                    <div className="recruit-section-heading">Prerequisites</div>
                    <div className="recruit-prereq-tags">
                      {recruitment.prerequisites.map((p) => (
                        <span key={p} className="recruit-prereq-tag">{p}</span>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Eligibility */}
              {(recruitment.allowed_designations.length > 0 || recruitment.allowed_departments.length > 0) && (
                <>
                  <hr className="recruit-divider" />
                  <div>
                    <div className="recruit-section-heading">Eligibility</div>
                    <div className="recruit-eligibility-grid">
                      {recruitment.allowed_designations.length > 0 && (
                        <div>
                          <div className="recruit-eligibility-group-label">Designations</div>
                          <div className="recruit-eligibility-chips">
                            {recruitment.allowed_designations.map((d) => (
                              <span key={d} className="recruit-eligibility-chip">{d}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {recruitment.allowed_departments.length > 0 && (
                        <div>
                          <div className="recruit-eligibility-group-label">Departments</div>
                          <div className="recruit-eligibility-chips">
                            {recruitment.allowed_departments.map((d) => (
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
              {recruitment.recruiters.length > 0 && (
                <>
                  <hr className="recruit-divider" />
                  <div>
                    <div className="recruit-section-heading">Recruiters</div>
                    <div className="recruit-recruiter-list">
                      {recruitment.recruiters.map((r, i) => (
                        <div key={r.id} className="recruit-recruiter-chip">
                          <div className={`recruit-recruiter-avatar c${(i % 5) + 1}`}>
                            {r.avatar_url ? <img src={r.avatar_url} alt={r.name} /> : getInitials(r.name)}
                          </div>
                          <span>{r.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Meta */}
              <hr className="recruit-divider" />
              <div className="recruit-meta">
                <span className="recruit-meta-item">
                  <CalendarIcon />
                  Posted {formatDate(recruitment.created_at)}
                </span>
                {wasUpdated && (
                  <span className="recruit-meta-item">
                    <CalendarIcon />
                    Updated {formatDate(recruitment.updated_at)}
                  </span>
                )}
                {recruitment.application_count !== undefined && (
                  <span className="recruit-meta-item">
                    <UsersIcon />
                    {recruitment.application_count} application{recruitment.application_count !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Applications (Only visible to recruiters) */}
              {isRecruiter && recruitment.applications.length > 0 && (
                <>
                  <hr className="recruit-divider" />
                  <div className="recruit-applications-section" style={{ marginTop: "20px" }}>
                    <div className="recruit-section-heading">Applications</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
                      {recruitment.applications.map((app: any) => {
                        const applicantName = app.user?.fullname || app.user?.name || app.user?.profile?.fullname || app.applicant?.fullname || app.applicant?.name || app.applicant?.profile?.fullname || app.applicant_name || app.applicant_id || app.user_id || "Unknown Applicant";
                        const applicantDesig = app.user?.designation || app.user?.profile?.designation || app.applicant?.designation || app.applicant?.profile?.designation || app.applicant_designation || app.designation || "Unknown Designation";
                        const applicantDept = app.user?.department || app.user?.dept || app.user?.profile?.department || app.applicant?.department || app.applicant?.dept || app.applicant?.profile?.department || app.applicant_department || app.department || app.dept || "Unknown Department";
                        const appliedDate = app.applied_at || app.created_at;
                        
                        return (
                          <div key={app.id} style={{ border: "1px solid var(--border-color)", padding: "16px", borderRadius: "8px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <strong style={{ fontSize: "16px" }}>{applicantName}</strong>
                                <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>{applicantDesig} - {applicantDept}</span>
                              </div>
                              <span style={{ fontWeight: "bold", color: app.status === "Pending" ? "orange" : app.status === "Accepted" ? "green" : "red" }}>{app.status}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)" }}>Applied At: {formatDate(appliedDate)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Comments */}
              <hr className="recruit-divider" />
              <CommentsSection
                postId={recruitment.id}
                postType="recruitment"
                currentUserId={currentUserId}
                postCreatorId={creatorId}
              />

            </div>
          )}

        </main>
      </div>
    </div>
    </Suspense>
  );
};

export default RecruitmentPage;