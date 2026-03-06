"use client"
import React, { useState, useEffect } from "react";
import "./ProfilePage.css";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { fetchMyProfile, UserProfile, CardData } from "@/lib/profileApi";


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
type TabType = "recruitment" | "project";
const TAG_COLORS = ["teal", "blue", "red"] as const;

/* Profile Page */
const ProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("recruitment");
  const [profile, setProfile]     = useState<UserProfile | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    fetchMyProfile()
      .then(setProfile)
      .catch((err: Error) => {
        if (err.message === "Unauthorized") {
          window.location.href = "/login";  // token missing/expired → back to login
        } else {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
    }, []);


  /* Loading */
  if (loading) {
    return (
      <div className="app-shell">
        <Header onEditProfile={() => {}} />
        <div className="app-body">
          <Sidebar defaultActive="profile" />
          <main className="profile-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ color: "#888" }}>Loading profile…</p>
          </main>
        </div>
      </div>
    );
  }

  /* Error */
  if (error || !profile) {
    return (
      <div className="app-shell">
        <Header onEditProfile={() => {}} />
        <div className="app-body">
          <Sidebar defaultActive="profile" />
          <main className="profile-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ color: "#c0392b" }}>Error: {error ?? "Could not load profile."}</p>
          </main>
        </div>
      </div>
    );
  }

  const visibleCards = profile.cards.filter((c) => c.type === activeTab);

  return (
    <div className="app-shell">
      <Header onEditProfile={() => console.log("edit clicked")} />

      <div className="app-body">
        <Sidebar defaultActive="profile" />

        <main className="profile-page">
          {/* ── Profile card ────────────────────────────────────────────── */}
          <section className="profile-card" aria-label="User profile">
            <div className="profile-card__top">

              {/* Avatar */}
              <div className="profile-card__avatar-wrap">
                <div className="profile-card__avatar">
                  {profile.profilePictureUrl ? (
                    <img
                      src={profile.profilePictureUrl}
                      alt={profile.name}
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
                <h1 className="profile-card__name">{profile.name}</h1>
                <p className="profile-card__email">{profile.email}</p>
                <p className="profile-card__role">{profile.role}</p>
                <p className="profile-card__dept">{profile.department}</p>
                <p className="profile-card__inst">{profile.institution}</p>
              </div>

              {/* Social links — only rendered when user has them saved */}
              <div className="profile-card__links">
                {profile.socialLinks.linkedin && (
                  <a href={profile.socialLinks.linkedin} className="profile-card__link" aria-label="LinkedIn" target="_blank" rel="noreferrer">
                    <LinkedInIcon /> LinkedIn
                  </a>
                )}
                {profile.socialLinks.github && (
                  <a href={profile.socialLinks.github} className="profile-card__link" aria-label="GitHub" target="_blank" rel="noreferrer">
                    <GitHubIcon /> GitHub
                  </a>
                )}
                {profile.socialLinks.other_link1 && (
                  <a href={profile.socialLinks.other_link1} className="profile-card__link" aria-label="Other link" target="_blank" rel="noreferrer">
                    <ScholarIcon /> Scholar / Other
                  </a>
                )}
              </div>
            </div>

            {/* Skills + Bio */}
            <div className="skills-bio">
              <div className="skills-bio__skills-row">
                <span className="skills-bio__label">SKILLS</span>
                {profile.skills.map((skill, i) => (
                  <span key={skill} className={`skills-bio__tag skills-bio__tag--${TAG_COLORS[i % TAG_COLORS.length]}`}>
                    {skill}
                  </span>
                ))}
              </div>
              <p className="skills-bio__bio">{profile.bio}</p>
            </div>
          </section>

          {/* Tabs */}
          <div className="tabs" role="tablist" aria-label="Content sections">
            <button
              role="tab"
              aria-selected={activeTab === "recruitment"}
              className={`tabs__btn${activeTab === "recruitment" ? " tabs__btn--active" : ""}`}
              onClick={() => setActiveTab("recruitment")}
            >
              <RecruitIcon /> Recruitment
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "project"}
              className={`tabs__btn${activeTab === "project" ? " tabs__btn--active" : ""}`}
              onClick={() => setActiveTab("project")}
            >
              <ProjectIcon /> Project
            </button>
          </div>

          {/* Cards */}
          <div className="cards-grid" role="tabpanel">
            {visibleCards.length === 0 ? (
              <p style={{ color: "#888", gridColumn: "1 / -1" }}>No {activeTab} posts yet.</p>
            ) : (
              visibleCards.map((card: CardData) => (
                <article key={card.id} className="post-card">
                  <h2 className="post-card__title">{card.title}</h2>
                  <div className="post-card__divider" />
                  <p className="post-card__author">
                    <strong>{card.author}</strong>, {card.role}
                  </p>
                  <div className="post-card__tags">
                    {card.tags.map((tag) => (
                      <span key={tag} className="post-card__tag">{tag}</span>
                    ))}
                  </div>
                  <p className="post-card__prereq">
                    <span className="post-card__prereq-label">Prerequisites: </span>
                    {card.prerequisites}
                  </p>
                </article>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProfilePage;