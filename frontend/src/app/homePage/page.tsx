"use client";

import React, { useState } from "react";
import "./homePage.css";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { useRouter } from "next/navigation";

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
  other_count: number;
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
  other_count: number;
  team_members: FeedMember[];
}

/* Helper: chunk array into pairs */
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

/* Team Panel */
const TeamPanel: React.FC<{ members: FeedMember[] }> = ({ members }) => (
  <div className="feed-team-panel">
    <div className="feed-team-label">Team Members</div>
    <div className="feed-team-list">
      {members.map((m, i) => (
        <div key={m.id} className="feed-team-chip">
          <div className={`feed-member-avatar c${(i % 6) + 1}`}>
            {m.avatar_url ? <img src={m.avatar_url} alt={m.name} /> : getInitials(m.name)}
          </div>
          <span className="feed-chip-name">{m.name}</span>
        </div>
      ))}
    </div>
  </div>
);

/* Action Bar */
const ActionBar: React.FC = () => {
  const [liked, setLiked] = useState(false);
  return (
    <div className="feed-actions">
      <button className={`feed-action-btn${liked ? " liked" : ""}`} onClick={(e) => { e.stopPropagation(); setLiked(v => !v); }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
          <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
        </svg>
        Like
      </button>
      <button className="feed-action-btn" onClick={(e) => e.stopPropagation()}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Comment
      </button>
      <button className="feed-action-btn" onClick={(e) => e.stopPropagation()}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Share
      </button>
    </div>
  );
};

/* Post Header */
const PostHeader: React.FC<{
  name: string; otherCount: number; role?: string;
  institution?: string; timeAgo: string; avatarUrl?: string;
}> = ({ name, otherCount, role, institution, timeAgo, avatarUrl }) => (
  <div className="feed-post-header">
    <div className="feed-creator-avatar">
      {avatarUrl ? <img src={avatarUrl} alt={name} /> : getInitials(name)}
    </div>
    <div className="feed-creator-meta">
      <div className="feed-creator-name-row">
        <strong>{name}</strong>
        {otherCount > 0 && `, with ${otherCount} others`}
      </div>
      <div className="feed-creator-detail">
        {[role, institution, timeAgo].filter(Boolean).join(" · ")}
      </div>
    </div>
  </div>
);

/* Project Card */
const ProjectCard: React.FC<{ item: ProjectFeedItem; onClick: () => void }> = ({ item, onClick }) => {
  const hasImage = item.media_urls.length > 0;
  return (
    <div className="feed-group" onClick={onClick} style={{ cursor: "pointer" }}>
      <TeamPanel members={item.team_members} />
      <div className="feed-post">
        <PostHeader name={item.creator_name} otherCount={item.other_count} role={item.creator_role} institution={item.institution} timeAgo={item.time_ago} avatarUrl={item.creator_avatar_url} />
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
        <ActionBar />
      </div>
    </div>
  );
};

/* Recruitment Card */
const RecruitmentCard: React.FC<{ item: RecruitmentFeedItem; onClick: () => void }> = ({ item, onClick }) => {
  const hasImage = item.media_urls.length > 0;
  const isOpen = item.status === "Open";
  return (
    <div className="feed-group" onClick={onClick} style={{ cursor: "pointer" }}>
      <TeamPanel members={item.team_members} />
      <div className="feed-post">
        <PostHeader name={item.creator_name} otherCount={item.other_count} role={item.creator_role} institution={item.institution} timeAgo={item.time_ago} avatarUrl={item.creator_avatar_url} />
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
        <ActionBar />
      </div>
    </div>
  );
};

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

interface HomePageProps {
  projects: ProjectFeedItem[];
  recruitments: RecruitmentFeedItem[];
}

const HomePage: React.FC<HomePageProps> = ({ projects, recruitments }) => {
  const [activeTab, setActiveTab] = useState<Tab>("project");
  const router = useRouter();

  const projectRows     = chunkPairs(projects);
  const recruitmentRows = chunkPairs(recruitments);

  return (
    <div className="app-shell">
      <Header showEditProfile={false} />

      <div className="app-body">
        <Sidebar defaultActive="home" />

        <main className="home-main">
          {/* Tabs */}
          <div className="home-tabs">
            <button
              className={`home-tab${activeTab === "recruitment" ? " active" : ""}`}
              onClick={() => setActiveTab("recruitment")}
            >
              <RecruitIcon /> Recruitment
            </button>
            <button
              className={`home-tab${activeTab === "project" ? " active" : ""}`}
              onClick={() => setActiveTab("project")}
            >
              <ProjectIcon /> Project
            </button>
          </div>

          {/* Feed */}
          <div className="home-feed">
            {activeTab === "project" &&
              projectRows.map((row, ri) => (
                <div className="feed-row" key={ri}>
                  {row.map((p) => (
                    <ProjectCard key={p.id} item={p} onClick={() => router.push(`/projectPage/${p.id}`)} />
                  ))}
                </div>
              ))
            }
            {activeTab === "recruitment" &&
              recruitmentRows.map((row, ri) => (
                <div className="feed-row" key={ri}>
                  {row.map((r) => (
                    <RecruitmentCard key={r.id} item={r} onClick={() => router.push(`/recruitmentPage/${r.id}`)} />
                  ))}
                </div>
              ))
            }
          </div>
        </main>
      </div>
    </div>
  );
};

export default HomePage;