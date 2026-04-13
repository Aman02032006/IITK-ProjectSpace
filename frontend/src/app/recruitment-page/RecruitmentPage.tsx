"use client";

import React, { useState, useEffect, Suspense } from "react";
import "./RecruitmentPage.css";
import Link from "next/link";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { useSearchParams, useRouter } from "next/navigation";
import {
  acceptRecruiterInvite,
  rejectRecruiterInvite,
  getRecruitment,
  getRecruitmentApplications,
  getMyRecruitmentApplication,
  applyToRecruitment,
  updateRecruitment,
  updateApplicationStatus,
  RecruitmentPublic,
  UserSummary,
  ApplicationPublic,
  MyRecruitmentApplicationPublic,
} from "@/lib/recruitmentApi";
import { fetchMyProfile } from "@/lib/profileApi";
import { getRepresentativeString } from "@/lib/formatTeam";
import { skillColor } from "@/lib/skillColor";
import ReactMarkdown from "react-markdown";
import CommentsSection from "../components/CommentsSection";


/* Types */
export interface Recruitment {
  id: string;
  title: string;
  description: string;
  description_format: "plain-text" | "markdown";
  domains: string[];
  media_urls: string[];
  prerequisites: string[];
  allowed_designations: string[];
  allowed_departments: string[];
  status: "Open" | "Closed";
  created_at: string;
  updated_at: string;
  recruiters: UserSummary[];
  pending_recruiters?: UserSummary[];
  application_count?: number;
  creator_name?: string;
  creator_avatar_url?: string;
  applications: ApplicationPublic[];
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

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

function mapToRecruitment(r: RecruitmentPublic): Recruitment {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    description_format: r.description_format,
    domains: r.domains,
    media_urls: (r.media_urls ?? []).map((url) => getFullUrl(url) as string),
    prerequisites: r.prerequisites,
    allowed_designations: r.allowed_designations,
    allowed_departments: r.allowed_departments,
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at,
    recruiters: r.recruiters.map((rec) => ({
      id: rec.id,
      fullname: rec.fullname,
      designation: rec.designation,
      department: rec.department,
      profile_picture_url: getFullUrl(rec.profile_picture_url ?? undefined),
    })),
    pending_recruiters: (r.pending_recruiters ?? []).map((rec) => ({
      id: rec.id,
      fullname: rec.fullname,
      designation: rec.designation,
      department: rec.department,
      profile_picture_url: getFullUrl(rec.profile_picture_url ?? undefined),
    })),
    applications: [],
    creator_name: r.creator_name,
    creator_avatar_url: getFullUrl(r.creator_avatar_url ?? undefined),
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
const RecruitmentPageContent: React.FC = () => {
  const searchParams        = useSearchParams();
  const router        = useRouter();
  const recruitmentId = searchParams.get("id") as string;

  const [recruitment, setRecruitment]   = useState<Recruitment | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [creatorId, setCreatorId]         = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [applying, setApplying]         = useState(false);
  const [applyError, setApplyError]     = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [applicationUpdating, setApplicationUpdating] = useState<Record<string, boolean>>({});
  const [myApplication, setMyApplication] = useState<MyRecruitmentApplicationPublic | null>(null);
  const [inviteActionLoading, setInviteActionLoading] = useState<"accept" | "reject" | null>(null);
  const [inviteActionError, setInviteActionError] = useState<string | null>(null);
  const [inviteResolved, setInviteResolved] = useState(false);

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
        const mapped = mapToRecruitment(raw);
        const viewerIsRecruiter = mapped.recruiters.some((r) => r.id === me.id);
        setRecruitment(mapped);
        setCurrentUserId(me.id);
        setCreatorId(raw.creator_id);

        if (viewerIsRecruiter) {
          const applications = await getRecruitmentApplications(recruitmentId);
          setRecruitment((prev) =>
            prev
              ? {
                  ...prev,
                  applications,
                  application_count: applications.length,
                }
              : prev
          );
          setMyApplication(null);
        } else {
          const mine = await getMyRecruitmentApplication(recruitmentId);
          setMyApplication(mine);
        }
      } catch (error: unknown) {
        const message = getErrorMessage(error, "");
        if (message === "Unauthorized") { router.replace("/auth"); return; }
        if (message.includes("not found") || message.includes("404")) {
          setError("Recruitment not found.");
        } else {
          setError("Failed to load recruitment. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [recruitmentId, router]);

  useEffect(() => {
    setInviteResolved(false);
  }, [recruitmentId]);

  // Scroll to comments and focus the compose box if navigated here with #comments hash
  useEffect(() => {
    if (recruitment && window.location.hash === "#comments") {
      document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => {
        document.querySelector<HTMLTextAreaElement>(".cs-compose-input")?.focus();
      }, 200);
    }
  }, [recruitment]);

  const handleApply = async () => {
    if (!recruitment) return;
    setApplying(true);
    setApplyError(null);
    try {
      await applyToRecruitment(recruitment.id, {
        recruitment_id: recruitment.id,
      });
      const mine = await getMyRecruitmentApplication(recruitment.id);
      setMyApplication(mine);
    } catch (error: unknown) {
      setApplyError(getErrorMessage(error, "Failed to apply. Please try again."));
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
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Failed to update recruitment status."));
    } finally {
      setTogglingStatus(false);
    }
  };

  const { displayText } = getRepresentativeString(
    recruitment?.recruiters || [],
    recruitment?.creator_name,
    recruitment?.creator_avatar_url
  );
  const handleApplicationStatusUpdate = async (
    applicationId: string,
    nextStatus: "Accepted" | "Rejected"
  ) => {
    if (!recruitment) return;
    setApplicationUpdating((prev) => ({ ...prev, [applicationId]: true }));
    try {
      const updated = await updateApplicationStatus(recruitment.id, applicationId, {
        status: nextStatus,
      });
      setRecruitment((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          applications: prev.applications.map((app) =>
            app.id === applicationId ? { ...app, status: updated.status } : app
          ),
        };
      });
    } catch (error: unknown) {
      alert(getErrorMessage(error, "Failed to update application status."));
    } finally {
      setApplicationUpdating((prev) => ({ ...prev, [applicationId]: false }));
    }
  };

  const isRecruiter = recruitment?.recruiters?.some((r) => r.id === currentUserId) ?? false;
  const hasPendingInvite =
    recruitment?.pending_recruiters?.some((r) => r.id === currentUserId) ?? false;
  const showInviteBanner = hasPendingInvite && !inviteResolved;
  const isOpen     = recruitment?.status === "Open";
  const wasUpdated = recruitment ? recruitment.updated_at !== recruitment.created_at : false;
  const myApplicationFromRecruiterList =
    recruitment?.applications?.find((app) => app.applicant.id === currentUserId) ?? null;
  const myApplicationStatus = (myApplication?.status ?? myApplicationFromRecruiterList?.status) as
    | "Pending"
    | "Accepted"
    | "Rejected"
    | undefined;
  const hasApplied = !!myApplicationStatus;

  let applyText = "Apply";
  if (applying) applyText = "Applying...";
  else if (myApplicationStatus) applyText = myApplicationStatus;
  else if (isRecruiter) applyText = "Cannot Apply";
  else if (!isOpen) applyText = "Closed";

  const refreshRecruitment = async () => {
    const raw = await getRecruitment(recruitmentId);
    const mapped = mapToRecruitment(raw);
    setRecruitment(mapped);
    setCreatorId(raw.creator_id);

    if (!currentUserId) return;
    const viewerIsRecruiter = mapped.recruiters.some((r) => r.id === currentUserId);
    if (viewerIsRecruiter) {
      const applications = await getRecruitmentApplications(recruitmentId);
      setRecruitment((prev) =>
        prev
          ? {
              ...prev,
              applications,
              application_count: applications.length,
            }
          : prev
      );
      setMyApplication(null);
      return;
    }

    const mine = await getMyRecruitmentApplication(recruitmentId);
    setMyApplication(mine);
  };

  const handleInviteAction = async (decision: "accept" | "reject") => {
    if (!recruitment) return;
    if (inviteActionLoading) return;

    setInviteActionLoading(decision);
    setInviteActionError(null);
    try {
      if (decision === "accept") {
        await acceptRecruiterInvite(recruitment.id);
      } else {
        await rejectRecruiterInvite(recruitment.id);
      }
      setInviteResolved(true);
      await refreshRecruitment();
    } catch (actionError: unknown) {
      const message = getErrorMessage(actionError, "Could not update invitation.");
      if (message === "Unauthorized") {
        router.replace("/auth");
        return;
      }
      if (message.toLowerCase().includes("no pending invitation found")) {
        setInviteResolved(true);
        setInviteActionError(null);
        await refreshRecruitment().catch(() => undefined);
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
        editHref={isRecruiter ? `/recruitment-page/edit-recruitment-page?id=${recruitmentId}` : undefined}
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
                      <Link key={r.id} href={`/profile-page?id=${r.id}`} className={`recruit-avatar-stack-item c${(i % 5) + 1}`} title={r.fullname}>
                        {r.profile_picture_url ? <img src={r.profile_picture_url} alt={r.fullname} /> : getInitials(r.fullname)}
                      </Link>
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
                    disabled={isRecruiter || applying || hasApplied || (!isOpen && !hasApplied)}
                  >
                    {applyText}
                  </button>
                </div>
              </div>

              {showInviteBanner && (
                <div className="recruit-invite-banner">
                  <p className="recruit-invite-banner__text">
                    You have been invited to be a recruiter for this post.
                  </p>
                  <div className="recruit-invite-banner__actions">
                    <button
                      className="recruit-invite-banner__btn recruit-invite-banner__btn--accept"
                      disabled={!!inviteActionLoading}
                      onClick={() => void handleInviteAction("accept")}
                    >
                      {inviteActionLoading === "accept" ? "Accepting..." : "Accept"}
                    </button>
                    <button
                      className="recruit-invite-banner__btn recruit-invite-banner__btn--reject"
                      disabled={!!inviteActionLoading}
                      onClick={() => void handleInviteAction("reject")}
                    >
                      {inviteActionLoading === "reject" ? "Rejecting..." : "Reject"}
                    </button>
                  </div>
                  {inviteActionError && (
                    <p className="recruit-invite-banner__error">{inviteActionError}</p>
                  )}
                </div>
              )}

              {/* Apply feedback */}
              {myApplicationStatus && (
                <p
                  style={{
                    color:
                      myApplicationStatus === "Accepted"
                        ? "#1a9e72"
                        : myApplicationStatus === "Rejected"
                        ? "#a53d2a"
                        : "#a57d2a",
                    fontSize: 13,
                    marginBottom: 8,
                    fontWeight: 600,
                  }}
                >
                  Your application status: {myApplicationStatus}
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
                    <span key={tag} className="recruit-tag" style={{ backgroundColor: skillColor(tag) }}>{tag}</span>
                  ))}
                </div>
              )}

              {/* Description */}
              <div className="recruit-section-heading">Details</div>
              <DescriptionBlock text={recruitment.description} format={recruitment.description_format} />

              {/* Media */}
              {recruitment.media_urls.length > 0 && (
                <div className={`recruit-media-grid${recruitment.media_urls.length === 1 ? " single-media" : ""}`}>
                  {recruitment.media_urls.map((url, i) => (
                    <img key={i} src={url} alt={`Recruitment media ${i + 1}`} className="recruit-media-item" />
                  ))}
                </div>
              )}

              {/* Prerequisites */}
              {recruitment.prerequisites.length > 0 && (
                <>
                  <hr className="recruit-divider" />
                  <div>
                    <div className="recruit-section-heading">Prerequisites</div>
                    <div className="recruit-prereq-tags">
                      {recruitment.prerequisites.map((p) => (
                        <span key={p} className="recruit-prereq-tag" style={{ backgroundColor: skillColor(p) }}>{p}</span>
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
                        <Link key={r.id} href={`/profile-page?id=${r.id}`} className="recruit-recruiter-chip">
                          <div className={`recruit-recruiter-avatar c${(i % 5) + 1}`}>
                            {r.profile_picture_url ? <img src={r.profile_picture_url} alt={r.fullname} /> : getInitials(r.fullname)}
                          </div>
                          <span>{r.fullname}</span>
                        </Link>
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
                      {recruitment.applications.map((app) => {
                        const applicantName = app.applicant.fullname || "Unknown Applicant";
                        const applicantDesig = app.applicant.designation || "Unknown Designation";
                        const applicantDept = app.applicant.department || "Unknown Department";
                        const appliedDate = app.applied_at;
                        const applicantId = app.applicant.id;
                        const isUpdating = applicationUpdating[app.id] === true;
                        const isFinalized = app.status !== "Pending";
                        
                        return (
                          <div key={app.id} style={{ border: "1px solid var(--border-color)", padding: "16px", borderRadius: "8px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                {applicantId ? (
                                  <Link
                                    href={`/profile-page?id=${applicantId}`}
                                    style={{
                                      fontSize: "16px",
                                      fontWeight: 700,
                                      color: "var(--text-primary)",
                                      textDecoration: "none",
                                    }}
                                  >
                                    {applicantName}
                                  </Link>
                                ) : (
                                  <strong style={{ fontSize: "16px" }}>{applicantName}</strong>
                                )}
                                <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>{applicantDesig} - {applicantDept}</span>
                              </div>
                              <span style={{ fontWeight: "bold", color: app.status === "Pending" ? "orange" : app.status === "Accepted" ? "green" : "red" }}>{app.status}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)" }}>Applied At: {formatDate(appliedDate)}</p>
                            {!isFinalized && (
                              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                                <button
                                  className="recruit-apply-btn"
                                  style={{
                                    padding: "6px 12px",
                                    fontSize: "12px",
                                    background: "#1a9e72",
                                  }}
                                  disabled={isUpdating}
                                  onClick={() => handleApplicationStatusUpdate(app.id, "Accepted")}
                                >
                                  {isUpdating ? "Updating..." : "Approve"}
                                </button>
                                <button
                                  className="recruit-apply-btn"
                                  style={{
                                    padding: "6px 12px",
                                    fontSize: "12px",
                                    background: "#a53d2a",
                                  }}
                                  disabled={isUpdating}
                                  onClick={() => handleApplicationStatusUpdate(app.id, "Rejected")}
                                >
                                  {isUpdating ? "Updating..." : "Reject"}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Comments */}
              <hr id="comments" className="recruit-divider" />
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
  );
};

const RecruitmentPage: React.FC = () => (
  <Suspense fallback={<RecruitmentSkeleton />}>
    <RecruitmentPageContent />
  </Suspense>
);

export default RecruitmentPage;
