"use client";

import "./editRecruitmentPage.css";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import {
  getRecruitment,
  updateRecruitment,
  deleteRecruitment,
  addRecruiter,
  removeRecruiter,
  uploadRecruitmentMedia,
} from "@/lib/recruitmentApi";
import { searchUsers } from "@/lib/profileApi";
import { UserSummary } from "@/lib/projectApi";
import ConfirmPopUp from "../../components/confirmPopUp";

interface Tag {
  id: string;
  label: string;
}

interface LinkEntry {
  id: string;
  value: string;
}

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

function EditRecruitmentPageContent() {
  const searchParams        = useSearchParams();
  const router        = useRouter();
  const recruitmentId = searchParams.get("id") as string;

  // Page states
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError]   = useState<string | null>(null);
  const [showConfirm, setShowConfirm]   = useState(false);

  // Form states
  const [activeTab, setActiveTab]                   = useState<"Markdown" | "Plain-Text">("Markdown");
  const [title, setTitle]                           = useState("");
  const [details, setDetails]                       = useState("");
  const [status, setStatus]                         = useState<"Open" | "Closed">("Open");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [domains, setDomains]                       = useState<Tag[]>([]);
  const [prerequisites, setPrerequisites]           = useState<Tag[]>([]);
  const [allowedDesignations, setAllowedDesignations] = useState<Tag[]>([]);
  const [allowedDepartments, setAllowedDepartments]   = useState<Tag[]>([]);
  const [links, setLinks]                           = useState<LinkEntry[]>([{ id: "1", value: "" }]);
  const [uploadedFiles, setUploadedFiles]           = useState<File[]>([]);
  const [existingMediaUrls, setExistingMediaUrls]   = useState<string[]>([]);

  // Recruiter states
  const [selectedUsers, setSelectedUsers]         = useState<UserSummary[]>([]);
  const [originalUserIds, setOriginalUserIds]     = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery]     = useState("");
  const [userSearchResults, setUserSearchResults] = useState<UserSummary[]>([]);
  const [isSearchingUsers, setIsSearchingUsers]   = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-populate fields
  useEffect(() => {
    if (!recruitmentId) return;

    const fetchRecruitment = async () => {
      setLoading(true);
      setError(null);
      try {
        const raw = await getRecruitment(recruitmentId);
        setTitle(raw.title);
        setDetails(raw.description);
        setActiveTab(raw.description_format === "markdown" ? "Markdown" : "Plain-Text");
        setStatus(raw.status);
        setDomains(raw.domains.map((d, i) => ({ id: String(i), label: d })));
        setPrerequisites(raw.prerequisites.map((p, i) => ({ id: String(i), label: p })));
        setAllowedDesignations(raw.allowed_designations.map((d, i) => ({ id: String(i), label: d })));
        setAllowedDepartments(raw.allowed_departments.map((d, i) => ({ id: String(i), label: d })));
        setLinks(
          raw.links.length > 0
            ? raw.links.map((l, i) => ({ id: String(i), value: l }))
            : [{ id: "1", value: "" }]
        );
        setExistingMediaUrls(raw.media_urls ?? []);

        // Pre-populate recruiters as chips
        const recruiters: UserSummary[] = raw.recruiters.map((r) => ({
          id: r.id,
          fullname: r.fullname,
          designation: r.designation,
          profile_picture_url: r.profile_picture_url,
        }));
        setSelectedUsers(recruiters);
        setOriginalUserIds(recruiters.map((r) => r.id));
      } catch (error: unknown) {
        if (getErrorMessage(error, "") === "Unauthorized") { router.replace("/auth"); return; }
        setError("Failed to load recruitment. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchRecruitment();
  }, [recruitmentId]);

  // Debounced user search
  useEffect(() => {
    if (userSearchQuery.trim().length < 2) {
      setUserSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const results = await searchUsers(userSearchQuery);
        setUserSearchResults(
          results.filter((r) => !selectedUsers.some((s) => s.id === r.id))
        );
      } catch {
        setUserSearchResults([]);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [userSearchQuery, selectedUsers]);

  const handleSelectUser = (user: UserSummary) => {
    setSelectedUsers((prev) => [...prev, user]);
    setUserSearchQuery("");
    setUserSearchResults([]);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  // Tag helpers
  const makeAdder = (setter: React.Dispatch<React.SetStateAction<Tag[]>>, promptText: string) => () => {
    const label = prompt(promptText);
    if (label?.trim()) setter((prev) => [...prev, { id: Date.now().toString(), label: label.trim() }]);
  };
  const makeRemover = (setter: React.Dispatch<React.SetStateAction<Tag[]>>) => (id: string) =>
    setter((prev) => prev.filter((t) => t.id !== id));

  const addDomain          = makeAdder(setDomains,               "Enter domain tag:");
  const removeDomain       = makeRemover(setDomains);
  const addPrerequisite    = makeAdder(setPrerequisites,          "Enter prerequisite:");
  const removePrerequisite = makeRemover(setPrerequisites);
  const addDesignation     = makeAdder(setAllowedDesignations,    "Enter allowed designation:");
  const removeDesignation  = makeRemover(setAllowedDesignations);
  const addDepartment      = makeAdder(setAllowedDepartments,     "Enter allowed department:");
  const removeDepartment   = makeRemover(setAllowedDepartments);

  // Link helpers
  const addLink = () => setLinks((prev) => [...prev, { id: Date.now().toString(), value: "" }]);
  const updateLink = (id: string, value: string) =>
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, value } : l)));
  const removeLink = (id: string) => setLinks((prev) => prev.filter((l) => l.id !== id));

  // File helpers
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setUploadedFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
  };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files) return;
    setUploadedFiles((prev) => [...prev, ...Array.from(files)]);
  };
  const removeNewFile = (index: number) =>
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  const removeExistingUrl = (url: string) =>
    setExistingMediaUrls((prev) => prev.filter((u) => u !== url));

  const handleDelete = async () => {
    try {
      await deleteRecruitment(recruitmentId);
      router.replace("/homepage");
    } catch (error: unknown) {
      if (getErrorMessage(error, "") === "Unauthorized") { router.replace("/auth"); return; }
      setSubmitError(getErrorMessage(error, "Failed to delete recruitment."));
    } finally {
      setShowConfirm(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim())   return setSubmitError("Please enter a title.");
    if (!details.trim()) return setSubmitError("Please enter the details.");

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // 1. Save field changes
      await updateRecruitment(recruitmentId, {
        title,
        description:          details.trim(),
        description_format:   activeTab === "Markdown" ? "markdown" : "plain-text",
        domains:              domains.map((t) => t.label),
        prerequisites:        prerequisites.map((t) => t.label),
        allowed_designations: allowedDesignations.map((t) => t.label),
        allowed_departments:  allowedDepartments.map((t) => t.label),
        links:                links.map((l) => l.value).filter(Boolean),
        media_urls:           existingMediaUrls,
        status,
      });

      // Upload any newly attached files
      if (uploadedFiles.length > 0) {
        await uploadRecruitmentMedia(recruitmentId, uploadedFiles);
      }

      // 2. Diff recruiters and apply adds/removes
      const currentIds = selectedUsers.map((u) => u.id);
      const toAdd      = currentIds.filter((id) => !originalUserIds.includes(id));
      const toRemove   = originalUserIds.filter((id) => !currentIds.includes(id));

      await Promise.all([
        ...toAdd.map((id) => addRecruiter(recruitmentId, id)),
        ...toRemove.map((id) => removeRecruiter(recruitmentId, id)),
      ]);

      router.push(`/recruitmentPage?id=${recruitmentId}`);
    } catch (error: unknown) {
      if (getErrorMessage(error, "") === "Unauthorized") { router.replace("/auth"); return; }
      setSubmitError(getErrorMessage(error, "Failed to save changes. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const TagBlock = ({
    tags: blockTags, onAdd, onRemove, addLabel,
  }: {
    tags: Tag[];
    onAdd: () => void;
    onRemove: (id: string) => void;
    addLabel: string;
  }) => (
    <>
      <div className="pcf-tags-row">
        {blockTags.map((t) => (
          <span key={t.id} className="pcf-tag">
            {t.label}
            <button className="pcf-tag-remove" onClick={() => onRemove(t.id)}>×</button>
          </span>
        ))}
      </div>
      <button className="pcf-add-btn" onClick={onAdd}><span className="pcf-add-icon">+</span> {addLabel}</button>
    </>
  );

  return (
    <div className="app-shell">
      <Header showEditProfile={false} />

      <div className="app-body">
        <Sidebar defaultActive="create" />

        <main className="pcf-main">

          {/* Loading */}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="pcf-card" style={{ height: 200, background: "var(--border-color)", animation: "pulse 1.5s ease-in-out infinite" }} />
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
              {error}
            </div>
          )}

          {/* Form */}
          {!loading && !error && (
            <>
              <div className="edit-page__actions">
                <button className="edit-page__action-btn" onClick={() => router.push(`/recruitmentPage?id=${recruitmentId}`)} disabled={isSubmitting}>
                  ← Go Back
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {submitError && (
                    <p style={{ color: "#a53d2a", fontSize: 13, margin: 0 }}>{submitError}</p>
                  )}
                  <button className="edit-page__action-btn edit-page__action-btn--destructive" onClick={() => setShowConfirm(true)} disabled={isSubmitting}>
                    Delete Recruitment
                  </button>
                  <button className="edit-page__action-btn" onClick={handleSave} disabled={isSubmitting}>
                    {isSubmitting ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </div>

              <div className="pcf-form-container">

                {/* Section 1 — Details */}
                <section className="pcf-card">
                  <div className="pcf-card-header">
                    <div>
                      <p className="pcf-section-label">Section 1 of 3</p>
                      <h2 className="pcf-section-title">Recruitment Details</h2>
                    </div>

                    {/* Status dropdown */}
                    <div className="pcf-dropdown-wrapper">
                      <button className="pcf-dropdown-btn" onClick={() => setStatusDropdownOpen((v) => !v)}>
                        <span>{status}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`pcf-chevron${statusDropdownOpen ? " pcf-chevron--open" : ""}`}>
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                      {statusDropdownOpen && (
                        <div className="pcf-dropdown-menu">
                          {(["Open", "Closed"] as const).map((s) => (
                            <button key={s} className={`pcf-dropdown-item${status === s ? " pcf-dropdown-item--active" : ""}`} onClick={() => { setStatus(s); setStatusDropdownOpen(false); }}>
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="pcf-field">
                    <label className="pcf-label">
                      Title
                      <span className="pcf-label-hint">(This will be displayed everywhere, make sure it is catchy :))</span>
                    </label>
                    <input className="pcf-input" placeholder="Eg. Generative AI for Healthcare Applications" value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>

                  {/* Details */}
                  <div className="pcf-field">
                    <label className="pcf-label">
                      Details
                      <span className="pcf-label-hint">(A detailed description of recruitment requirements and criteria.)</span>
                    </label>
                    <div className="pcf-tabs">
                      {(["Markdown", "Plain-Text"] as const).map((tab) => (
                        <button key={tab} className={`pcf-tab${activeTab === tab ? " pcf-tab--active" : ""}`} onClick={() => setActiveTab(tab)}>
                          {tab}
                        </button>
                      ))}
                    </div>
                    {activeTab === "Markdown" ? (
                      <div className="pcf-split-pane">
                        <textarea className="pcf-textarea pcf-textarea--tall pcf-split-editor" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Write markdown here..." />
                        <div className="pcf-split-preview">
                          {details.trim() ? <ReactMarkdown>{details}</ReactMarkdown> : <span className="pcf-preview-placeholder">Preview will appear here...</span>}
                        </div>
                      </div>
                    ) : (
                      <textarea className="pcf-textarea pcf-textarea--tall" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Write your description here..." />
                    )}
                  </div>

                  {/* Domains */}
                  <div className="pcf-field">
                    <label className="pcf-label">Domains / Tags<span className="pcf-label-hint">(Add tags that best describe the domains this recruitment falls under.)</span></label>
                    <TagBlock tags={domains} onAdd={addDomain} onRemove={removeDomain} addLabel="Add Domain" />
                  </div>

                  {/* Prerequisites */}
                  <div className="pcf-field">
                    <label className="pcf-label">Prerequisites<span className="pcf-label-hint">(Add skills or technologies applicants should be familiar with.)</span></label>
                    <TagBlock tags={prerequisites} onAdd={addPrerequisite} onRemove={removePrerequisite} addLabel="Add Prerequisite" />
                  </div>
                </section>

                {/* Section 2 — Media & Links */}
                <section className="pcf-card">
                  <div className="pcf-card-header">
                    <div>
                      <p className="pcf-section-label">Section 2 of 3</p>
                      <h2 className="pcf-section-title">Recruitment Media and Links</h2>
                    </div>
                  </div>

                  <div className="pcf-field">
                    <label className="pcf-label">
                      Current Media
                      <span className="pcf-label-hint">(Remove any media you no longer want.)</span>
                    </label>
                    {existingMediaUrls.length > 0 ? (
                      <div className="pcf-file-list">
                        {existingMediaUrls.map((url) => (
                          <div key={url} className="pcf-file-item">
                            <span className="pcf-file-name">{url}</span>
                            <button className="pcf-file-remove" onClick={() => removeExistingUrl(url)}>x</button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>No existing media.</p>
                    )}
                  </div>

                  <div className="pcf-field">
                    <label className="pcf-label">
                      Upload New Media
                      <span className="pcf-label-hint">(Add new images, videos or PDFs.)</span>
                    </label>
                    <div
                      className="pcf-upload-zone"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleFileDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span className="pcf-upload-title">Upload Files from your Computer</span>
                      <span className="pcf-upload-hint">Upload images, videos or PDFs</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,video/*,.pdf"
                        style={{ display: "none" }}
                        onChange={handleFileInput}
                      />
                    </div>
                    {uploadedFiles.length > 0 && (
                      <div className="pcf-file-list">
                        {uploadedFiles.map((f, i) => (
                          <div key={i} className="pcf-file-item">
                            <span className="pcf-file-name">{f.name}</span>
                            <button className="pcf-file-remove" onClick={() => removeNewFile(i)}>x</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pcf-field">
                    <label className="pcf-label">
                      Relevant Links
                      <span className="pcf-label-hint">(Add links to material, publications or recruitment tasks.)</span>
                    </label>
                    {links.map((link) => (
                      <div key={link.id} className="pcf-link-row">
                        <div className="pcf-link-input-wrapper">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pcf-link-icon">
                            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                          </svg>
                          <input
                            className="pcf-input pcf-input--link"
                            placeholder="https://"
                            value={link.value}
                            onChange={(e) => updateLink(link.id, e.target.value)}
                          />
                        </div>
                        {links.length > 1 && (
                          <button className="pcf-link-remove" onClick={() => removeLink(link.id)}>x</button>
                        )}
                      </div>
                    ))}
                    <button className="pcf-add-btn" onClick={addLink}><span className="pcf-add-icon">+</span> Add Link</button>
                  </div>
                </section>

                {/* Section 3 — Specifications & Team */}
                <section className="pcf-card">
                  <div className="pcf-card-header">
                    <div>
                      <p className="pcf-section-label">Section 3 of 3</p>
                      <h2 className="pcf-section-title">Recruitment Specifications and Team</h2>
                    </div>
                  </div>

                  {/* Allowed Designations */}
                  <div className="pcf-field">
                    <label className="pcf-label">Allowed Designations<span className="pcf-label-hint">(Only applicants with these designations will be able to apply.)</span></label>
                    <TagBlock tags={allowedDesignations} onAdd={addDesignation} onRemove={removeDesignation} addLabel="Add Designation" />
                  </div>

                  {/* Allowed Departments */}
                  <div className="pcf-field">
                    <label className="pcf-label">Allowed Departments<span className="pcf-label-hint">(Only applicants from these departments will be able to apply.)</span></label>
                    <TagBlock tags={allowedDepartments} onAdd={addDepartment} onRemove={removeDepartment} addLabel="Add Department" />
                  </div>

                  {/* Fellow Recruiters */}
                  <div className="pcf-field">
                    <label className="pcf-label">
                      Fellow Recruiters
                      <span className="pcf-label-hint">(Search and add recruiters. Changes are applied on Save.)</span>
                    </label>

                    {/* Chips */}
                    {selectedUsers.length > 0 && (
                      <div className="pcf-tags-row" style={{ marginBottom: "12px" }}>
                        {selectedUsers.map((user) => (
                          <span key={user.id} className="pcf-tag" style={{ background: "var(--color-dark)", color: "white" }}>
                            {user.fullname}
                            <button className="pcf-tag-remove" style={{ color: "white" }} onClick={() => handleRemoveUser(user.id)}>×</button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Search input */}
                    <div style={{ position: "relative" }}>
                      <div className="pcf-search-input-wrapper">
                        <span className="pcf-at-icon">@</span>
                        <input
                          className="pcf-input pcf-input--search"
                          placeholder="Search for recruiters..."
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                        />
                      </div>
                      {isSearchingUsers && (
                        <div style={{ position: "absolute", right: "12px", top: "12px", fontSize: "12px", color: "var(--text-muted)" }}>
                          Searching...
                        </div>
                      )}
                      {userSearchResults.length > 0 && (
                        <div className="pcf-dropdown-menu" style={{ display: "block", position: "absolute", top: "100%", left: 0, width: "100%", zIndex: 10, marginTop: "4px", maxHeight: "200px", overflowY: "auto" }}>
                          {userSearchResults.map((user) => (
                            <button key={user.id} className="pcf-dropdown-item" onClick={() => handleSelectUser(user)} style={{ textAlign: "left", padding: "10px" }}>
                              <strong>{user.fullname}</strong>
                              <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)" }}>{user.designation}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>



                {showConfirm && (
                  <ConfirmPopUp
                    heading="Delete Recruitment?"
                    message="This will permanently delete this recruitment and cannot be undone."
                    confirmLabel="Delete"
                    cancelLabel="Cancel"
                    isDestructive={true}
                    onConfirm={handleDelete}
                    onCancel={() => setShowConfirm(false)}
                  />
                )}

              </div>
            </>
          )}

        </main>
      </div>
    </div>
  );
}

export default function EditRecruitmentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditRecruitmentPageContent />
    </Suspense>
  );
}
