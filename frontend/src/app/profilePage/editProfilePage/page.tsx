"use client"
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import "../ProfilePage.css";
import "./editProfilePage.css";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import { fetchMyProfile, updateMyProfile, UserProfile } from "@/lib/profileApi";
import CreatableSelect from "react-select/creatable";

import seedSkills from "@/data/seed_skills.json"

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

const CameraIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

/* Form state */
interface EditFormState {
  fullname: string;
  designation: string;
  degree: string;
  department: string;
  linkedin: string;
  github: string;
  other_link1: string;
  bio: string;
  skills: string[];
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
    skills: p.skills ?? [],
    profile_picture_url: p.profile_picture_url ?? "",
    avatarPreview: null,
  };
}

/* Edit Profile Page */
const EditProfilePage: React.FC = () => {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditFormState | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMyProfile()
      .then((p) => {
        setProfile(p);
        setForm(profileToForm(p));
      })
      .catch((err: Error) => {
        if (err.message === "Unauthorized") {
          window.location.href = "/login";
        } else {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof EditFormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((prev) => prev ? { ...prev, [key]: e.target.value } : prev);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setForm((prev) => prev ? { ...prev, avatarPreview: url } : prev);
  };

  const formatUrl = (url: string | undefined): string | null => {
    if (!url) return null;
    const trimmed = url.trim();
    if (trimmed === "") return null;
    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  const handleSubmit = async () => {
    if (!profile || !form) return;
    setSaving(true);
    try {
      const updateData: Partial<UserProfile> = {
        fullname: form.fullname || null,
        designation: form.designation || undefined,
        degree: form.degree || undefined,
        department: form.department || undefined,
        linkedin: formatUrl(form.linkedin),
        github: formatUrl(form.github),
        other_link1: formatUrl(form.other_link1),
        bio: form.bio || undefined,
        skills: form.skills,
      };

      await updateMyProfile(updateData);

      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
      }

      router.push("/profilePage");
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSkillsChange = (selectedOptions: any) => {
    const newSkills = selectedOptions ? selectedOptions.map((opt: any) => opt.value) : [];
    setForm((prev) => prev ? { ...prev, skills: newSkills } : prev);
  };

  /* Loading */
  if (loading) {
    return (
      <div className="app-shell">
        <Header showEditProfile={false} />
        <div className="app-body">
          <Sidebar defaultActive="profile" />
          <main className="edit-profile-page">
            <p style={{ color: "#888" }}>Loading profile…</p>
          </main>
        </div>
      </div>
    );
  }

  /* Error */
  if (error || !profile || !form) {
    return (
      <div className="app-shell">
        <Header showEditProfile={false} />
        <div className="app-body">
          <Sidebar defaultActive="profile" />
          <main className="edit-profile-page">
            <p style={{ color: "#c0392b" }}>Error: {error ?? "Could not load profile."}</p>
          </main>
        </div>
      </div>
    );
  }

  const displayAvatar = form.avatarPreview ?? form.profile_picture_url;

  return (
    <div className="app-shell">
      <Header showEditProfile={false} />

      <div className="app-body">
        <Sidebar defaultActive="profile" />

        <main className="edit-profile-page">
          {/* Top action bar */}
          <div className="edit-profile-page__actions">
            <button
              className="edit-profile-page__action-btn"
              onClick={() => router.push("/profilePage")}
              disabled={saving}
            >
              ← Go Back
            </button>
            <button
              className="edit-profile-page__action-btn"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
          <div className="edit-profile-page__card">
            <div className="edit-profile-page__card-header">
              <h2 className="edit-profile-page__card-title">Edit Profile</h2>
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
                  <select 
                    className="edit-modal__input" 
                    value={form.designation} 
                    onChange={set("designation")}
                  >
                    <option value="" disabled>Select your designation</option>
                    <option value="Undergraduate Student">Undergraduate Student</option>
                    <option value="Postgraduate Student">Postgraduate Student</option>
                    <option value="PhD Scholar">PhD Scholar</option>
                    <option value="Post-Doctoral Researcher">Post-Doctoral Researcher</option>
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Professor">Professor</option>
                    <option value="Higher Academic Grade Professor">Higher Academic Grade Professor</option>
                  </select></div>

                <div className="edit-modal__row edit-modal__row--half">
                  <div>
                    <label className="edit-modal__label">Degree</label>
                    <select 
                      className="edit-modal__input" 
                      value={form.degree} 
                      onChange={set("degree")}
                    >
                      <option value="" disabled>Select degree</option>
                      <option value="B.Tech">B.Tech</option>
                      <option value="BS">BS</option>
                      <option value="M.Tech">M.Tech</option>
                      <option value="MS">MS</option>
                      <option value="MS by Research">MS by Research</option>
                      <option value="B.Tech/M.Tech Dual">B.Tech/M.Tech Dual</option>
                      <option value="B.Tech/MS Dual">B.Tech/MS Dual</option>
                      <option value="B.Tech/MBA Dual">B.Tech/MBA Dual</option>
                      <option value="BS/MS Dual">BS/MS Dual</option>
                      <option value="BS/M.Tech Dual">BS/M.Tech Dual</option>
                      <option value="BS/MBA Dual">BS/MBA Dual</option>
                      <option value="BS/MBA Dual">BS/MBA Dual</option>
                      <option value="MDes">MDes</option>
                      <option value="MBA">MBA</option>
                      <option value="MS/Ph.D Dual">MS/Ph.D Dual</option>
                      <option value="Ph.D">Ph.D</option>
                    </select>
                  </div>
                  <div>
                    <label className="edit-modal__label">Department</label>
                    <select 
                      className="edit-modal__input" 
                      value={form.department} 
                      onChange={set("department")}
                    >
                      <option value="" disabled>Select department</option>
                      <option value="Aerospace Engineering">Aerospace Engineering</option>
                      <option value="Biological Sciences and Bioengineering">Biological Sciences and Bioengineering</option>
                      <option value="Chemical Engineering">Chemical Engineering</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Civil Engineering">Civil Engineering</option>
                      <option value="Cognitive Sciences">Cognitive Sciences</option>
                      <option value="Computer Science and Engineering">Computer Science and Engineering</option>
                      <option value="Design">Design</option>
                      <option value="Earth Sciences">Earth Sciences</option>
                      <option value="Economics">Economics</option>
                      <option value="Electrical Engineering">Electrical Engineering</option>
                      <option value="Humanities and Social Sciences">Humanities and Social Sciences</option>
                      <option value="Intelligent Systems">Intelligent Systems</option>
                      <option value="Materials Science and Engineering">Materials Science and Engineering</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                      <option value="Nuclear Engineering and Technology">Nuclear Engineering and Technology</option>
                      <option value="Management Sciences">Management Sciences</option>
                      <option value="Management Sciences">Management Sciences</option>
                      <option value="Space, Planetary and Astronomical Sciences and Engineering">Space, Planetary and Astronomical Sciences and Engineering</option>
                      <option value="Statistics and Data Science">Statistics and Data Science</option>
                      <option value="Sustainable Energy Engineering">Sustainable Energy Engineering</option>
                    </select>
                  </div>
                </div>

                <div className="edit-modal__row">
                  <label className="edit-modal__label">Skills</label>
                  <CreatableSelect
                    isMulti
                    options={seedSkills}
                    // We map the string array back into the {value, label} objects that react-select needs to render
                    value={form.skills.map((skill) => ({ value: skill, label: skill }))}
                    onChange={handleSkillsChange}
                    placeholder="Search or type to create a skill..."
                    className="react-select-container"
                    classNamePrefix="react-select"
                  />
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
          </div>
        </main>
      </div>
    </div>
  );
};

export default EditProfilePage;