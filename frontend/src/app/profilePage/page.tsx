"use client"
import React, { useState, useEffect, useRef } from "react";
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

const CameraIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/* Helpers */
type TabType = "recruitment" | "project";
const TAG_COLORS = ["teal", "blue", "red"] as const;

/* Edit-profile form state */
interface EditFormState {
  fullname: string;
  designation: string;
  degree: string;
  department: string;
  linkedin: string;
  github: string;
  other_link1: string;
  bio: string;
  skills: string;         
  profile_picture_url: string;
  avatarPreview: string | null; 
}

function profileToForm(p: UserProfile): EditFormState {
  return {
    fullname: p.fullname ?? "",
    designation: p.designation ?? "",
    degree: p.degree ?? "",
    department: p.department ?? "",
    linkedin: p.linkedin ?? "",
    github: p.github ?? "",
    other_link1: p.other_link1 ?? "",
    bio: p.bio ?? "",
    skills: (p.skills ?? []).join(", "),
    profile_picture_url: p.profile_picture_url ?? "",
    avatarPreview: null,
  };
}

/* EditProfileModal */
interface EditProfileModalProps {
  profile: UserProfile;
  onClose: () => void;
  onSave: (updated: UserProfile, avatarFile: File | null) => void;
  saving: boolean;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ profile, onClose, onSave, saving }) => {
  const [form, setForm] = useState<EditFormState>(() => profileToForm(profile));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof EditFormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setForm((prev) => ({ ...prev, avatarPreview: url }));
  };

  const handleSubmit = () => {
    const updatedProfile: UserProfile = {
      ...profile,
      fullname: form.fullname,
      designation: form.designation,
      degree: form.degree,
      department: form.department,
      linkedin: form.linkedin,
      github: form.github,
      other_link1: form.other_link1,
      bio: form.bio,
      skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      profile_picture_url: form.avatarPreview ?? form.profile_picture_url,
    };
    onSave(updatedProfile, avatarFile);
  };

  const displayAvatar = form.avatarPreview ?? form.profile_picture_url;

  return (
    /* Backdrop */
    <div
      className="edit-modal__backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Edit profile"
    >
      <div className="edit-modal">
        {/* Header */}
        <div className="edit-modal__header">
          <h2 className="edit-modal__title">Edit Profile</h2>
          <button className="edit-modal__close" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="edit-modal__body">
          {/* Avatar */}
          <div className="edit-modal__avatar-section">
            <div className="edit-modal__avatar-wrap">
              {displayAvatar ? (
                <img src={displayAvatar} alt="Profile" className="edit-modal__avatar-img" />
              ) : (
                <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="edit-modal__avatar-svg">
                  <rect width="80" height="80" rx="12" fill="#1a3a5c" />
                  <circle cx="40" cy="28" r="14" fill="#49769F" />
                  <ellipse cx="40" cy="68" rx="24" ry="18" fill="#49769F" />
                </svg>
              )}
              <button
                className="edit-modal__avatar-btn"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Change profile picture"
              >
                <CameraIcon />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
            <p className="edit-modal__avatar-hint">Click the camera icon to change your photo</p>
          </div>

          {/* Form fields */}
          <div className="edit-modal__fields">
            <div className="edit-modal__row">
              <label className="edit-modal__label">Full Name</label>
              <input className="edit-modal__input" value={form.fullname} onChange={set("fullname")} placeholder="Your full name" />
            </div>

            <div className="edit-modal__row">
              <label className="edit-modal__label">Designation</label>
              <input className="edit-modal__input" value={form.designation} onChange={set("designation")} placeholder="e.g. PhD Student, Research Associate" />
            </div>

            <div className="edit-modal__row edit-modal__row--half">
              <div>
                <label className="edit-modal__label">Degree</label>
                <input className="edit-modal__input" value={form.degree} onChange={set("degree")} placeholder="e.g. B.Tech, M.Tech, PhD" />
              </div>
              <div>
                <label className="edit-modal__label">Department</label>
                <input className="edit-modal__input" value={form.department} onChange={set("department")} placeholder="e.g. Computer Science" />
              </div>
            </div>

            <div className="edit-modal__row">
              <label className="edit-modal__label">Skills <span className="edit-modal__hint-inline">(comma-separated)</span></label>
              <input className="edit-modal__input" value={form.skills} onChange={set("skills")} placeholder="e.g. React, Python, Machine Learning" />
            </div>

            <div className="edit-modal__row">
              <label className="edit-modal__label">Bio</label>
              <textarea className="edit-modal__textarea" value={form.bio} onChange={set("bio")} rows={3} placeholder="Tell people about yourself…" />
            </div>

            <div className="edit-modal__section-title">Social Links</div>

            <div className="edit-modal__row">
              <label className="edit-modal__label"><LinkedInIcon /> LinkedIn URL</label>
              <input className="edit-modal__input" value={form.linkedin} onChange={set("linkedin")} placeholder="https://linkedin.com/in/yourprofile" />
            </div>

            <div className="edit-modal__row">
              <label className="edit-modal__label"><GitHubIcon /> GitHub URL</label>
              <input className="edit-modal__input" value={form.github} onChange={set("github")} placeholder="https://github.com/yourhandle" />
            </div>

            <div className="edit-modal__row">
              <label className="edit-modal__label"><ScholarIcon /> Scholar / Other URL</label>
              <input className="edit-modal__input" value={form.other_link1} onChange={set("other_link1")} placeholder="https://scholar.google.com/…" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="edit-modal__footer">
          <button className="edit-modal__cancel-btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="edit-modal__save-btn" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* Profile Page */
const ProfilePage: React.FC = () => {
  const [activeTab, setActiveTab]   = useState<TabType>("recruitment");
  const [profile, setProfile]       = useState<UserProfile | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [editOpen, setEditOpen]     = useState(false);
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    fetchMyProfile()
      .then(setProfile)
      .catch((err: Error) => {
        if (err.message === "Unauthorized") {
          window.location.href = "/login";
        } else {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  /* Save handler */
  const handleSave = async (updated: UserProfile, avatarFile: File | null) => {
    setSaving(true);
    try {
      // replace everything below with the correct api calls, used this for testing on my device --Vardhan
      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
      }

      setProfile(updated);
      setEditOpen(false);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setSaving(false);
    }
  };

  /* Loading */
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

  /* Error */
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

  const visibleCards = profile?.cards?.filter((c) => c?.type === activeTab) || [];

  return (
    <div className="app-shell">
      <Header
        showEditProfile={true}
        onEditProfile={() => setEditOpen(true)}
      />

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
                {profile.skills?.map((skill, i) => (
                  <span key={skill} className={`skills-bio__tag skills-bio__tag--${TAG_COLORS[i % TAG_COLORS.length]}`}>
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
              aria-selected={activeTab === "recruitment"}
              className={`tabs__btn${activeTab === "recruitment" ? " tabs__btn--active" : ""}`}
              onClick={() => setActiveTab("recruitment")}
            >
              <RecruitIcon /> Recruitments
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "project"}
              className={`tabs__btn${activeTab === "project" ? " tabs__btn--active" : ""}`}
              onClick={() => setActiveTab("project")}
            >
              <ProjectIcon /> Projects
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

      {/* Edit Profile Modal currently as a pop-up */}
      {editOpen && (
        <EditProfileModal
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
};

export default ProfilePage;