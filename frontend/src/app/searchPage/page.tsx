"use client";
import React, { useState, useEffect, useCallback } from "react";
import "./SearchPage.css";
import "../profilePage/ProfilePage.css";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

/* ── Types ── */
type TabType = "recruitment" | "project" | "user";

interface RecruitmentResult {
  id: string; title: string; author: string; role: string;
  tags: string[]; prerequisites: string;
}
interface ProjectResult {
  id: string; title: string; author: string; role: string;
  fields: string[]; description: string;
}
interface UserResult {
  id: string; fullname: string; designation: string;
  department: string; organisation: string; profile_picture_url?: string;
}
interface SearchResults {
  recruitments: RecruitmentResult[];
  projects: ProjectResult[];
  users: UserResult[];
}

/* ── Tag suggestions ── */
const ALL_TAGS = [
  "Machine Learning", "Generative AI", "LLMs", "Agentic AI",
  "Deep Learning", "Computer Vision", "NLP", "Quantitative Finance",
  "Risk Management", "Robotics", "Reinforcement Learning", "Bioinformatics",
  "Signal Processing", "Data Engineering", "Cybersecurity", "HCI",
  "Intelligent Systems", "Python", "React", "TypeScript",
];

/* ── Mock API — replace with real fetch ── */
async function fetchSearchResults(tags: string[]): Promise<SearchResults> {
  await new Promise((r) => setTimeout(r, 300));
  if (tags.length === 0) return { recruitments: [], projects: [], users: [] };
  return {
    recruitments: [
      { id: "r1", title: "Generative AI For Healthcare Applications", author: "Alice Myers",
        role: "PhD Student", tags: ["Generative AI", "LLMs", "Agentic AI"],
        prerequisites: "Python, Natural Language Processing, Langchain / LlamaIndex" },
      { id: "r2", title: "Cross-Market Volatility Spillover Analysis", author: "Bob Singh",
        role: "Research Associate", tags: ["Quantitative Finance", "Risk Management"],
        prerequisites: "Python, Statistics, Time Series Analysis" },
      { id: "r3", title: "Project Recruitment Title", author: "Recruiter Name",
        role: "Designation", tags: ["Project Fields"], prerequisites: "" },
    ],
    projects: [
      { id: "p1", title: "Cross-Market Volatility Spillover Analysis", author: "Alice Myers",
        role: "PhD Student", fields: ["Quantitative Finance", "Risk Management"],
        description: "Modeled Volatility Spillovers Between Bitcoin And NIFTY 50 Using GARCH" },
      { id: "p2", title: "Project Title", author: "Author Name", role: "Designation",
        fields: ["Project Fields"], description: "Project Description" },
      { id: "p3", title: "Project Title", author: "Author Name", role: "Designation",
        fields: ["Project Fields"], description: "Project Description" },
    ],
    users: [
      { id: "u1", fullname: "Alice Myers", designation: "PhD Student",
        department: "Intelligent Systems", organisation: "IIT Kanpur", profile_picture_url: "" },
      { id: "u2", fullname: "Name", designation: "Designation",
        department: "Department", organisation: "Organisation" },
      { id: "u3", fullname: "Name", designation: "Designation",
        department: "Department", organisation: "Organisation" },
    ],
  };
}

/* ── Icons ── */
const RecruitIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const ProjectIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);
const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const EmptyIcon = () => (
  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const DefaultAvatar = () => (
  <svg viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="54" height="54" rx="10" fill="#1a3a5c" />
    <circle cx="27" cy="20" r="10" fill="#49769F" />
    <ellipse cx="27" cy="48" rx="18" ry="14" fill="#49769F" />
  </svg>
);

/* ── Page ── */
const SearchPage: React.FC = () => {
  const [activeTags, setActiveTags]   = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab]     = useState<TabType>("recruitment");
  const [results, setResults]         = useState<SearchResults>({ recruitments: [], projects: [], users: [] });
  const [loading, setLoading]         = useState(false);

  const addTag = useCallback((tag: string) => {
    const t = tag.trim();
    if (!t || activeTags.includes(t)) return;
    setActiveTags((prev) => [...prev, t]);
    setSearchQuery("");
  }, [activeTags]);

  const removeTag = (tag: string) =>
    setActiveTags((prev) => prev.filter((t) => t !== tag));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) addTag(searchQuery.trim());
    else if (e.key === "Backspace" && !searchQuery && activeTags.length > 0)
      removeTag(activeTags[activeTags.length - 1]);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSearchResults(activeTags)
      .then((data) => { if (!cancelled) setResults(data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeTags]);

  const counts: Record<TabType, number> = {
    recruitment: results.recruitments.length,
    project: results.projects.length,
    user: results.users.length,
  };

  return (
    <div className="app-shell">
      <Header
        showEditProfile={false}
        searchTags={activeTags}
        searchQuery={searchQuery}
        searchSuggestions={ALL_TAGS}
        onTagAdd={addTag}
        onTagRemove={removeTag}
        onSearchQueryChange={setSearchQuery}
        onSearchKeyDown={handleKeyDown}
      />

      <div className="app-body">
        <Sidebar defaultActive="search" />

        <main className="search-page">

          {/* ── Full-width Tabs ── */}
          <div className="search-tabs" role="tablist">
            {([
              { key: "recruitment" as TabType, label: "Recruitments", icon: <RecruitIcon /> },
              { key: "project"     as TabType, label: "Projects",     icon: <ProjectIcon /> },
              { key: "user"        as TabType, label: "Users",        icon: <UserIcon /> },
            ]).map(({ key, label, icon }) => (
              <button
                key={key}
                role="tab"
                aria-selected={activeTab === key}
                className={`search-tabs__btn${activeTab === key ? " search-tabs__btn--active" : ""}`}
                onClick={() => setActiveTab(key)}
              >
                {icon} {label}
                {activeTags.length > 0 && (
                  <span className="search-tabs__count">({counts[key]})</span>
                )}
              </button>
            ))}
          </div>

          {/* ── Results ── */}
          <div className="cards-grid" role="tabpanel">
            {loading ? (
              <p style={{ color: "#888", gridColumn: "1/-1" }}>Searching…</p>

            ) : activeTags.length === 0 ? (
              <div className="search-empty">
                <EmptyIcon />
                <p className="search-empty__text">
                  Type tags in the search bar above to find recruitments, projects, or people.
                </p>
              </div>

            ) : activeTab === "recruitment" ? (
              results.recruitments.length === 0
                ? <p style={{ color: "#888", gridColumn: "1/-1" }}>No recruitment posts match these tags.</p>
                : results.recruitments.map((card) => (
                    <article key={card.id} className="post-card">
                      <h2 className="post-card__title">{card.title}</h2>
                      <div className="post-card__divider" />
                      <p className="post-card__author"><strong>{card.author}</strong>, {card.role}</p>
                      <div className="post-card__tags">
                        {card.tags.map((tag) => (
                          <span key={tag} className="post-card__tag"
                            style={{ cursor: "pointer" }} onClick={() => addTag(tag)}
                            title={`Search by "${tag}"`}>{tag}</span>
                        ))}
                      </div>
                      <p className="post-card__prereq">
                        <span className="post-card__prereq-label">Prerequisites: </span>
                        {card.prerequisites || "—"}
                      </p>
                    </article>
                  ))

            ) : activeTab === "project" ? (
              results.projects.length === 0
                ? <p style={{ color: "#888", gridColumn: "1/-1" }}>No projects match these tags.</p>
                : results.projects.map((card) => (
                    <article key={card.id} className="post-card">
                      <h2 className="post-card__title">{card.title}</h2>
                      <div className="post-card__divider" />
                      <p className="post-card__author"><strong>{card.author}</strong>, {card.role}</p>
                      <div className="post-card__tags">
                        {card.fields.map((f) => (
                          <span key={f} className="post-card__tag"
                            style={{ cursor: "pointer" }} onClick={() => addTag(f)}
                            title={`Search by "${f}"`}>{f}</span>
                        ))}
                      </div>
                      <p className="post-card__prereq">{card.description}</p>
                    </article>
                  ))

            ) : (
              results.users.length === 0
                ? <p style={{ color: "#888", gridColumn: "1/-1" }}>No users match these tags.</p>
                : results.users.map((user) => (
                    <a key={user.id} className="user-card" href={`/profile/${user.id}`}>
                      <div className="user-card__avatar">
                        {user.profile_picture_url
                          ? <img src={user.profile_picture_url} alt={user.fullname} />
                          : <DefaultAvatar />}
                      </div>
                      <div className="user-card__info">
                        <span className="user-card__name">{user.fullname}</span>
                        <span className="user-card__line">{user.designation}</span>
                        <span className="user-card__line user-card__line--dept">{user.department}</span>
                        <span className="user-card__line">{user.organisation}</span>
                      </div>
                    </a>
                  ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SearchPage;