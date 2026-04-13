"use client"
import React, { useState, useEffect } from "react";
import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import "./ProfilePage.css";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { fetchMyProfile, fetchMyProjects, fetchMyRecruitments, UserProfile, UserProfileView, getUserById, getUserProjects, getUserRecruitments } from "@/lib/profileApi";
import { skillColor } from "@/lib/skillColor";
import { ProjectSummary } from "@/lib/projectApi";
import { RecruitmentSummary } from "@/lib/recruitmentApi";
import ProjectCard from "../components/ProjectCard";
import RecruitmentCard from "../components/RecruitmentCard";


/* Icons */
const LinkedInIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const ScholarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const RecruitIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const ProjectIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);

/* Helpers */
type TabType = "project" | "recruitment";
type PageToken = number | "...";

const PROFILE_PAGE_SIZE = 10;

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const buildPageSequence = (current: number, total: number): PageToken[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: PageToken[] = [];

  const addRange = (from: number, to: number) => {
    for (let i = from; i <= to; i++) pages.push(i);
  };

  pages.push(1);

  if (current <= 4) {
    addRange(2, 5);
    pages.push("...");
    pages.push(total);
  } else if (current >= total - 3) {
    pages.push("...");
    addRange(total - 4, total);
  } else {
    pages.push("...");
    addRange(current - 1, current + 1);
    pages.push("...");
    pages.push(total);
  }

  return pages;
};

const PaginationBar: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
  const sequence = buildPageSequence(currentPage, totalPages);

  const goTo = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
  };

  return (
    <div className="pagination">
      <button
        className="pagination__btn pagination__btn--arrow"
        onClick={() => goTo(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        {"<"}
      </button>

      {sequence.map((item, i) =>
        item === "..." ? (
          <span key={`ellipsis-${i}`} className="pagination__ellipsis">...</span>
        ) : (
          <button
            key={item}
            className={`pagination__btn${item === currentPage ? " pagination__btn--active" : ""}`}
            onClick={() => goTo(item as number)}
          >
            {item}
          </button>
        )
      )}

      <button
        className="pagination__btn pagination__btn--arrow"
        onClick={() => goTo(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        {">"}
      </button>
    </div>
  );
};

/* Profile Page */
const ProfilePageContent: React.FC = () => {
  const [activeTab, setActiveTab]   = useState<TabType>("project");
  const [profile, setProfile]       = useState<UserProfile | UserProfileView | null>(null);
  const [projects, setProjects]     = useState<ProjectSummary[]>([]);
  const [recruitments, setRecruitments] = useState<RecruitmentSummary[]>([]);
  const [projectsPage, setProjectsPage] = useState(1);
  const [recruitmentsPage, setRecruitmentsPage] = useState(1);

  const [loading, setLoading]     = useState(true);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [myId, setMyId]           = useState<string | null>(null);

  const [recruitmentsInitialized, setRecruitmentsInitialized] = useState(false);
  const [projectsInitialized, setProjectsInitialized]         = useState(false);

  const router = useRouter();
  const searchParam = useSearchParams();
  const userId = searchParam.get("id");

  useEffect(() => {
  const loadProfile = async () => {
    try {
      if (userId) {
        const [data, me] = await Promise.all([getUserById(userId), fetchMyProfile()]);
        setProfile(data);
        setMyId(me.id);
      } else {
        const data = await fetchMyProfile();
        setProfile(data);
        setMyId(data.id);
      }
    } catch (error: unknown) {
      if (getErrorMessage(error, "") === "Unauthorized") {
        router.replace("/auth");
      } else {
        setError(getErrorMessage(error, "Failed to load profile."));
      }
    } finally {
      setLoading(false);
    }
  };

  loadProfile();
}, [userId, router]);

const isOwnProfile = !userId || userId === myId

  // Loads each tab only on it's visit
  useEffect(() => {
    const loadData = async () => {
      try {
        setCardsLoading(true);
        setCardsError(null);

        if (activeTab === "recruitment" && !recruitmentsInitialized) {
          const data = userId
            ? await getUserRecruitments(userId)
            : await fetchMyRecruitments();

          setRecruitments(data);
          setRecruitmentsInitialized(true);
        }

        if (activeTab === "project" && !projectsInitialized) {
          const data = userId
            ? await getUserProjects(userId)
            : await fetchMyProjects();

          setProjects(data);
          setProjectsInitialized(true);
        }
      } catch (error: unknown) {
        if (getErrorMessage(error, "") === "Unauthorized") {
          router.replace("/auth");
          return;
        }
        setCardsError("Failed to load data.");
      } finally {
        setCardsLoading(false);
      }
    };

    loadData();
  }, [activeTab, userId, projectsInitialized, recruitmentsInitialized, router]);

  const projectsTotalPages = Math.max(1, Math.ceil(projects.length / PROFILE_PAGE_SIZE));
  const recruitmentsTotalPages = Math.max(1, Math.ceil(recruitments.length / PROFILE_PAGE_SIZE));

  useEffect(() => {
    setProjectsPage((page) => Math.min(page, projectsTotalPages));
  }, [projectsTotalPages]);

  useEffect(() => {
    setRecruitmentsPage((page) => Math.min(page, recruitmentsTotalPages));
  }, [recruitmentsTotalPages]);

  const visibleProjects = projects.slice(
    (projectsPage - 1) * PROFILE_PAGE_SIZE,
    projectsPage * PROFILE_PAGE_SIZE
  );
  const visibleRecruitments = recruitments.slice(
    (recruitmentsPage - 1) * PROFILE_PAGE_SIZE,
    recruitmentsPage * PROFILE_PAGE_SIZE
  );

  if (loading) {
    return (
      <div className="app-shell">
        <Header showEditProfile={false} />
        <div className="app-body">
          <Sidebar defaultActive="profile" />
          <main className="profile-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ color: "#888" }}>Loading profile…</p>
          </main>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="app-shell">
        <Header showEditProfile={false} />
        <div className="app-body">
          <Sidebar defaultActive="profile" />
          <main className="profile-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ color: "#c0392b" }}>Error: {error ?? "Could not load profile."}</p>
          </main>
        </div>
      </div>
    );
  }

  return (
      <div className="app-shell">
        <Header showEditProfile={isOwnProfile} />

        <div className="app-body">
          <Sidebar defaultActive="profile" />

          <main className="profile-page">

            {/* Profile card */}
            <section className="profile-card" aria-label="User profile">
              <div className="profile-card__top">

                {/* Avatar */}
                <div className="profile-card__avatar-wrap">
                  <div className="profile-card__avatar">
                    {profile.profile_picture_url ? (
                      <img
                        src={profile.profile_picture_url}
                        alt={profile.fullname || "User Avatar"}
                        style={{ width: "100%", height: "100%", borderRadius: 12, objectFit: "cover" }}
                      />
                    ) : (
                      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="profile-card__avatar-svg">
                        <rect width="80" height="80" rx="12" fill="#1a3a5c" />
                        <circle cx="40" cy="28" r="14" fill="#49769F" />
                        <ellipse cx="40" cy="68" rx="24" ry="18" fill="#49769F" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Identity */}
                <div className="profile-card__identity">
                  <h1 className="profile-card__name">{profile.fullname}</h1>
                  <p className="profile-card__email">{profile.iitk_email}</p>
                  <p className="profile-card__desg">{profile.designation}</p>
                  <p className="profile-card__degr">{profile.degree}</p>
                  <p className="profile-card__dept">{profile.department}</p>
                </div>

                {/* Social links */}
                <div className="profile-card__links">
                  {profile.linkedin && (
                    <a href={profile.linkedin} className="profile-card__link" aria-label="LinkedIn" target="_blank" rel="noreferrer">
                      <LinkedInIcon /> LinkedIn
                    </a>
                  )}
                  {profile.github && (
                    <a href={profile.github} className="profile-card__link" aria-label="GitHub" target="_blank" rel="noreferrer">
                      <GitHubIcon /> GitHub
                    </a>
                  )}
                  {profile.other_link1 && (
                    <a href={profile.other_link1} className="profile-card__link" aria-label="Other link" target="_blank" rel="noreferrer">
                      <ScholarIcon /> Scholar / Other
                    </a>
                  )}
                </div>
              </div>

              {/* Skills + Bio */}
              <div className="skills-bio">
                <div className="skills-bio__skills-row">
                  <span className="skills-bio__label">SKILLS</span>
                  {profile.skills?.map((skill) => (
                    <span key={skill} className="skills-bio__tag" style={{ backgroundColor: skillColor(skill) }}>
                      {skill}
                    </span>
                  ))}
                </div>
                <p className="skills-bio__bio">{profile.bio || "No bio added yet."}</p>
              </div>
            </section>

            {/* Tabs */}
            <div className="tabs" role="tablist" aria-label="Content sections">
              <button
                role="tab"
                aria-selected={activeTab === "project"}
                className={`tabs__btn${activeTab === "project" ? " tabs__btn--active" : ""}`}
                onClick={() => setActiveTab("project")}
              >
                <ProjectIcon /> Projects
              </button>
              <button
                role="tab"
                aria-selected={activeTab === "recruitment"}
                className={`tabs__btn${activeTab === "recruitment" ? " tabs__btn--active" : ""}`}
                onClick={() => setActiveTab("recruitment")}
              >
                <RecruitIcon /> Recruitments
              </button>
            </div>

            {/* Cards */}
            <div className="cards-grid" role="tabpanel">

              {/* Loading */}
              {cardsLoading && (
                <p style={{ color: "#888", gridColumn: "1 / -1" }}>Loading…</p>
              )}

              {/* Error */}
              {!cardsLoading && cardsError && (
                <p style={{ color: "#c0392b", gridColumn: "1 / -1" }}>{cardsError}</p>
              )}

              {/* Recruitment cards */}
              {!cardsLoading && !cardsError && activeTab === "recruitment" && recruitmentsInitialized && (
                recruitments.length === 0
                  ? <p style={{ color: "#888", gridColumn: "1 / -1" }}>No recruitment posts yet.</p>
                  : visibleRecruitments.map((r) => (
                      <RecruitmentCard
                        key={r.id}
                        id={r.id}
                        title={r.title}
                        recruiter={profile.fullname ?? ""}
                        fields={r.domains}
                        prerequisites={r.prerequisites}
                      />
                    ))
              )}

              {/* Project cards */}
              {!cardsLoading && !cardsError && activeTab === "project" && projectsInitialized && (
                projects.length === 0
                  ? <p style={{ color: "#888", gridColumn: "1 / -1" }}>No project posts yet.</p>
                  : visibleProjects.map((p) => (
                      <ProjectCard
                        key={p.id}
                        id={p.id}
                        title={p.title}
                        author={profile.fullname ?? ""}
                        fields={p.domains}
                        description={p.summary}
                      />
                    ))
              )}

            </div>

            {!cardsLoading && !cardsError && activeTab === "project" && projectsInitialized && projects.length > 0 && (
              <PaginationBar
                currentPage={projectsPage}
                totalPages={projectsTotalPages}
                onPageChange={setProjectsPage}
              />
            )}

            {!cardsLoading && !cardsError && activeTab === "recruitment" && recruitmentsInitialized && recruitments.length > 0 && (
              <PaginationBar
                currentPage={recruitmentsPage}
                totalPages={recruitmentsTotalPages}
                onPageChange={setRecruitmentsPage}
              />
            )}
          </main>
        </div>
      </div>
  );
};

const ProfilePage: React.FC = () => (
  <Suspense fallback={<div>Loading profile data...</div>}>
    <ProfilePageContent />
  </Suspense>
);

export default ProfilePage;
