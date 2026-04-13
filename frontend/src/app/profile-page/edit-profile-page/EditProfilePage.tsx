"use client"
import React, { useState, useEffect, useRef , Suspense} from "react";
import { useRouter } from "next/navigation";
import "./EditProfilePage.css";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import OtpPopup from "../../auth/OtpPopup";
import {
  fetchMyProfile,
  updateMyProfile,
  uploadMyProfilePicture,
  removeMyProfilePicture,
  requestSecondaryEmailOtp,
  verifySecondaryEmailOtp,
  UserProfile,
} from "@/lib/profileApi";
import CreatableSelect from "react-select/creatable";
import type { MultiValue } from "react-select";

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
  secondary_email: string;
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

type SelectOption = {
  value: string;
  label: string;
};

type SecondaryEmailVerificationStatus =
  | "idle"
  | "sending_otp"
  | "awaiting_otp"
  | "verifying_otp"
  | "verified";

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

function profileToForm(p: UserProfile): EditFormState {
  return {
    fullname: p.fullname ?? "",
    secondary_email: p.secondary_email ?? "",
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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<EditFormState | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [verifiedSecondaryEmail, setVerifiedSecondaryEmail] = useState("");
  const [secondaryEmailStatus, setSecondaryEmailStatus] = useState<SecondaryEmailVerificationStatus>("idle");
  const [showSecondaryOtpModal, setShowSecondaryOtpModal] = useState(false);
  const [pendingSecondaryEmail, setPendingSecondaryEmail] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  useEffect(() => {
    fetchMyProfile()
      .then((p) => {
        setProfile(p);
        setForm(profileToForm(p));
        const existingSecondaryEmail = (p.secondary_email ?? "").trim().toLowerCase();
        setVerifiedSecondaryEmail(existingSecondaryEmail);
        setSecondaryEmailStatus(existingSecondaryEmail ? "verified" : "idle");
      })
      .catch((err: Error) => {
        if (err.message === "Unauthorized") {
          router.replace("/auth");
        } else {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const set = (key: keyof EditFormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((prev) => prev ? { ...prev, [key]: e.target.value } : prev);

  const handleSecondaryEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextEmail = e.target.value;
    setForm((prev) => prev ? { ...prev, secondary_email: nextEmail } : prev);
    const isCurrentVerified = nextEmail.trim().toLowerCase() === verifiedSecondaryEmail;
    setSecondaryEmailStatus(isCurrentVerified && nextEmail.trim() !== "" ? "verified" : "idle");
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setRemovePhoto(false);
    const url = URL.createObjectURL(file);
    setForm((prev) => prev ? { ...prev, avatarPreview: url } : prev);
  };

  const handleRemovePhoto = () => {
    setAvatarFile(null);
    setRemovePhoto(true);
    setForm((prev) => prev ? { ...prev, avatarPreview: null, profile_picture_url: "" } : prev);
    if (fileInputRef.current) fileInputRef.current.value = "";
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

  const handleSecondaryEmailVerify = async () => {
    if (!form || !profile) return;

    const nextSecondaryEmail = form.secondary_email.trim().toLowerCase();
    if (!nextSecondaryEmail) return;

    if (!isValidEmail(nextSecondaryEmail)) {
      setSaveError("Please enter a valid secondary email.");
      return;
    }

    if (nextSecondaryEmail === profile.iitk_email.trim().toLowerCase()) {
      setSaveError("Secondary email cannot be the same as your IITK email.");
      return;
    }

    if (nextSecondaryEmail === verifiedSecondaryEmail) {
      setSecondaryEmailStatus("verified");
      return;
    }

    setSaveError(null);
    setSecondaryEmailStatus("sending_otp");
    try {
      setSaveError(null);
      setSecondaryEmailStatus("sending_otp");
      try {
        await requestSecondaryEmailOtp(nextSecondaryEmail);

        setSecondaryEmailStatus("awaiting_otp");
        setPendingSecondaryEmail(nextSecondaryEmail);
        setShowSecondaryOtpModal(true);
      } catch (error: unknown) {
        setSaveError(getErrorMessage(error, "Secondary email verification failed. Please try again."));
        setSecondaryEmailStatus("idle");
      }

      setSecondaryEmailStatus("awaiting_otp");
      setPendingSecondaryEmail(nextSecondaryEmail);
      setShowSecondaryOtpModal(true);
    } catch (error: unknown) {
      setSaveError(getErrorMessage(error, "Secondary email verification failed. Please try again."));
      setSecondaryEmailStatus("idle");
    }
  };

  const handleSecondaryOtpVerify = async (otp: string) => {
    if (!pendingSecondaryEmail) return;

    setSaveError(null);
    setSecondaryEmailStatus("verifying_otp");
    try {
      const updatedProfile = await verifySecondaryEmailOtp({
        email: pendingSecondaryEmail,
        otp,
      });
      const persistedSecondaryEmail = (updatedProfile.secondary_email ?? "").trim().toLowerCase();

      setProfile(updatedProfile);
      setForm((prev) =>
        prev
          ? {
              ...prev,
              secondary_email: updatedProfile.secondary_email ?? pendingSecondaryEmail,
            }
          : prev
      );
      setVerifiedSecondaryEmail(persistedSecondaryEmail);
      setSecondaryEmailStatus(persistedSecondaryEmail ? "verified" : "idle");
      setShowSecondaryOtpModal(false);
      setPendingSecondaryEmail("");
    } catch (error: unknown) {
      setSaveError(getErrorMessage(error, "Invalid or expired OTP."));
      setSecondaryEmailStatus("idle");
    }
  };

  const handleSecondaryOtpClose = () => {
    setShowSecondaryOtpModal(false);
    setPendingSecondaryEmail("");
    if (secondaryEmailStatus !== "verified") {
      setSecondaryEmailStatus("idle");
    }
  };

  const handleSubmit = async () => {
    if (!profile || !form) return;

    if (!form.fullname.trim()) {
      return setSaveError("Please enter your full name.");
    }

    if (form.fullname && !/^[A-Za-z\s\.\-']+$/.test(form.fullname)) {
      return setSaveError("Name can only contain letters, spaces, dots, hyphens, and apostrophes.");
    }
    
    if (!form.designation.trim()) return setSaveError("Please select a designation.");
    if (!form.degree.trim()) return setSaveError("Please select a degree.");
    if (!form.department.trim()) return setSaveError("Please select a department.");

    setSaving(true);
    setSaveError(null);
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
        await uploadMyProfilePicture(avatarFile);
      } else if (removePhoto) {
        await removeMyProfilePicture();
      }

      router.push("/profile-page");
    } catch (error: unknown) {
      setSaveError(getErrorMessage(error, "Failed to save profile. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const onSaveShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      if (saving || loading || !profile || !form) return;
      void handleSubmit();
    };

    window.addEventListener("keydown", onSaveShortcut);
    return () => window.removeEventListener("keydown", onSaveShortcut);
  }, [saving, loading, profile, form, handleSubmit]);

  const handleSkillsChange = (selectedOptions: MultiValue<SelectOption>) => {
    const newSkills = selectedOptions.map((opt) => opt.value);
    setForm((prev) => prev ? { ...prev, skills: newSkills } : prev);
  };

  /* Loading */
  if (loading) {
    return (
      <div className="app-shell">
        <Suspense fallback={<div />}>
          <Header showEditProfile={false} />
        </Suspense>
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
        <Suspense fallback={<div />}>
          <Header showEditProfile={false} />
        </Suspense>
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
  const normalizedSecondaryEmail = form.secondary_email.trim().toLowerCase();
  const secondaryEmailAlreadyVerified = normalizedSecondaryEmail !== "" && normalizedSecondaryEmail === verifiedSecondaryEmail;
  const canVerifySecondaryEmail =
    normalizedSecondaryEmail !== "" &&
    !secondaryEmailAlreadyVerified &&
    secondaryEmailStatus !== "sending_otp" &&
    secondaryEmailStatus !== "awaiting_otp" &&
    secondaryEmailStatus !== "verifying_otp";

  const verifyButtonText =
    secondaryEmailStatus === "sending_otp"
      ? "Sending..."
      : secondaryEmailStatus === "awaiting_otp"
        ? "OTP Sent"
      : secondaryEmailStatus === "verifying_otp"
        ? "Verifying..."
        : secondaryEmailAlreadyVerified || secondaryEmailStatus === "verified"
          ? "Verified"
          : "Verify";

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="app-shell">
        <Header showEditProfile={false} />

        <div className="app-body">
          <Sidebar defaultActive="profile" />

          <main className="edit-profile-page">
            {/* Top action bar */}
            <div className="edit-profile-page__actions">
              <button
                className="edit-profile-page__action-btn"
                onClick={() => router.push("/profile-page")}
                disabled={saving}
              >
                ← Go Back
              </button>
              {saveError && (
                <p style={{ color: "#a53d2a", fontSize: 13, margin: 0 }}>
                  {saveError}
                </p>
              )}
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
              <div className="edit-profile-page__body">
                {/* Avatar */}
                <div className="edit-profile-page__avatar-section">
                  <div className="edit-profile-page__avatar-wrap">
                    {displayAvatar ? (
                      <img src={displayAvatar} alt="Profile" className="edit-profile-page__avatar-img" />
                    ) : (
                      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="edit-profile-page__avatar-svg">
                        <rect width="80" height="80" rx="12" fill="#1a3a5c" />
                        <circle cx="40" cy="28" r="14" fill="#49769F" />
                        <ellipse cx="40" cy="68" rx="24" ry="18" fill="#49769F" />
                      </svg>
                    )}
                    <button
                      className="edit-profile-page__avatar-btn"
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
                  <p className="edit-profile-page__avatar-hint">Click the camera icon to change your photo</p>
                  {(form.profile_picture_url || form.avatarPreview) && !removePhoto && (
                    <button
                      type="button"
                      className="edit-profile-page__remove-photo-btn"
                      onClick={handleRemovePhoto}
                    >
                      Remove photo
                    </button>
                  )}
                </div>

                {/* Form fields */}
                <div className="edit-profile-page__fields">
                  <div className="edit-profile-page__row">
                    <label className="edit-profile-page__label">Full Name</label>
                    <input className="edit-profile-page__input" value={form.fullname} onChange={set("fullname")} placeholder="Your full name" />
                  </div>

                  <div className="edit-profile-page__row edit-profile-page__row--half">
                    <div>
                      <label className="edit-profile-page__label">
                        Secondary Email
                        <span className="edit-profile-page__hint-inline"></span>
                      </label>
                      <div className="edit-profile-page__inline-action-wrap">
                        <input
                          className="edit-profile-page__input edit-profile-page__input--with-inline-action"
                          type="email"
                          value={form.secondary_email}
                          onChange={handleSecondaryEmailChange}
                          placeholder="name@example.com"
                        />
                        <button
                          type="button"
                          className="edit-profile-page__inline-action-btn"
                          onClick={handleSecondaryEmailVerify}
                          disabled={!canVerifySecondaryEmail}
                        >
                          {verifyButtonText}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="edit-profile-page__label">Designation</label>
                      <select 
                        className="edit-profile-page__input" 
                        value={form.designation} 
                        onChange={set("designation")}
                      >
                        <option value="" disabled>Select your designation</option>
                        <option value="Undergraduate Student">Undergraduate Student</option>
                        <option value="Postgraduate Student">Postgraduate Student</option>
                        <option value="Ph.D Scholar">Ph.D Scholar</option>
                        <option value="Post-Doctoral Researcher">Post-Doctoral Researcher</option>
                        <option value="Assistant Professor">Assistant Professor</option>
                        <option value="Associate Professor">Associate Professor</option>
                        <option value="Professor">Professor</option>
                        <option value="Higher Academic Grade Professor">Higher Academic Grade Professor</option>
                      </select>
                    </div>
                  </div>

                  <div className="edit-profile-page__row edit-profile-page__row--half">
                    <div>
                      <label className="edit-profile-page__label">Degree</label>
                      <select 
                        className="edit-profile-page__input" 
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
                      <label className="edit-profile-page__label">Department</label>
                      <select 
                        className="edit-profile-page__input" 
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

                  <div className="edit-profile-page__row">
                    <label className="edit-profile-page__label">Skills</label>
                    <CreatableSelect
                      isMulti
                      options={seedSkills}
                      value={form.skills.map((skill) => ({ value: skill, label: skill }))}
                      onChange={handleSkillsChange}
                      placeholder="Search or type to create a skill..."
                      className="react-select-container"
                      classNamePrefix="react-select"
                    />
                  </div>

                  <div className="edit-profile-page__row">
                    <label className="edit-profile-page__label">Bio</label>
                    <textarea className="edit-profile-page__textarea" value={form.bio} onChange={set("bio")} rows={3} placeholder="Tell people about yourself…" />
                  </div>

                  <div className="edit-profile-page__section-title">Social Links</div>

                  <div className="edit-profile-page__row">
                    <label className="edit-profile-page__label"><LinkedInIcon /> LinkedIn URL</label>
                    <input className="edit-profile-page__input" value={form.linkedin} onChange={set("linkedin")} placeholder="https://linkedin.com/in/yourprofile" />
                  </div>

                  <div className="edit-profile-page__row">
                    <label className="edit-profile-page__label"><GitHubIcon /> GitHub URL</label>
                    <input className="edit-profile-page__input" value={form.github} onChange={set("github")} placeholder="https://github.com/yourhandle" />
                  </div>

                  <div className="edit-profile-page__row">
                    <label className="edit-profile-page__label"><ScholarIcon /> Scholar / Other URL</label>
                    <input className="edit-profile-page__input" value={form.other_link1} onChange={set("other_link1")} placeholder="https://scholar.google.com/…" />
                  </div>
                </div>
            </div>
            </div>
          </main>
        </div>
        {showSecondaryOtpModal && (
          <OtpPopup
            message={`Enter the OTP sent to ${pendingSecondaryEmail} to verify your secondary email.`}
            onVerify={handleSecondaryOtpVerify}
            onClose={handleSecondaryOtpClose}
          />
        )}
      </div>
    </Suspense>
  );
};

export default EditProfilePage;
