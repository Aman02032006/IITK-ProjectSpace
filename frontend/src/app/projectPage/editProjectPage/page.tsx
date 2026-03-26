"use client";

import "./editProjectPage.css";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import { getProject, updateProject, deleteProject, addProjectMember, removeProjectMember, uploadProjectMedia } from "@/lib/projectApi";
import { searchUsers } from "@/lib/profileApi";
import { UserSummary } from "@/lib/projectApi";
import ConfirmPopUp from "../../components/confirmPopUp";

export const dynamic = 'force-dynamic';

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

function EditProjectPageContent() {
  const searchParams    = useSearchParams();
  const router    = useRouter();
  const projectId = searchParams.get("id") as string;

  // Page states
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError]   = useState<string | null>(null);
  const [showConfirm, setShowConfirm]   = useState(false);

  // Form states
  const [activeTab, setActiveTab] = useState<"Markdown" | "Plain-Text">("Markdown");
  const [title, setTitle]         = useState("");
  const [summary, setSummary]     = useState("");
  const [details, setDetails]     = useState("");
  const [tags, setTags]           = useState<Tag[]>([]);
  const [links, setLinks]         = useState<LinkEntry[]>([{ id: "1", value: "" }]);
  const [uploadedFiles, setUploadedFiles]         = useState<File[]>([]);
  const [existingMediaUrls, setExistingMediaUrls] = useState<string[]>([]);

  // Team member states
  const [selectedUsers, setSelectedUsers]         = useState<UserSummary[]>([]);
  const [originalUserIds, setOriginalUserIds]     = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery]     = useState("");
  const [userSearchResults, setUserSearchResults] = useState<UserSummary[]>([]);
  const [isSearchingUsers, setIsSearchingUsers]   = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-populate fields
  useEffect(() => {
    if (!projectId) return;

    const fetchProject = async () => {
      setLoading(true);
      setError(null);
      try {
        const raw = await getProject(projectId);
        setTitle(raw.title);
        setSummary(raw.summary);
        setDetails(raw.description);
        setActiveTab(raw.description_format === "markdown" ? "Markdown" : "Plain-Text");
        setTags(raw.domains.map((d, i) => ({ id: String(i), label: d })));
        setLinks(
          raw.links.length > 0
            ? raw.links.map((l, i) => ({ id: String(i), value: l }))
            : [{ id: "1", value: "" }]
        );
        setExistingMediaUrls(raw.media_urls ?? []);

        // Pre-populate team members as chips
        const members: UserSummary[] = raw.team_members.map((m) => ({
          id: m.id,
          fullname: m.fullname,
          designation: m.designation,
          profile_picture_url: m.profile_picture_url,
        }));
        setSelectedUsers(members);
        setOriginalUserIds(members.map((m) => m.id));
      } catch (error: unknown) {
        if (getErrorMessage(error, "") === "Unauthorized") { router.replace("/auth"); return; }
        setError("Failed to load project. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

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
        // Filter out already selected users
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
  const addTag = () => {
    const label = prompt("Enter domain tag:");
    if (label?.trim())
      setTags((prev) => [...prev, { id: Date.now().toString(), label: label.trim() }]);
  };
  const removeTag = (id: string) => setTags((prev) => prev.filter((t) => t.id !== id));

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
    if (e.target.files)
      setUploadedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
  };
  const removeNewFile = (index: number) =>
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  const removeExistingUrl = (url: string) =>
    setExistingMediaUrls((prev) => prev.filter((u) => u !== url));

  const handleDelete = async () => {
    try {
      await deleteProject(projectId);
      router.replace("/homepage");
    } catch (error: unknown) {
      if (getErrorMessage(error, "") === "Unauthorized") { router.replace("/auth"); return; }
      setSubmitError(getErrorMessage(error, "Failed to delete project."));
    } finally {
      setShowConfirm(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim())   return setSubmitError("Please enter a title.");
    if (!summary.trim()) return setSubmitError("Please enter a summary.");
    if (!details.trim()) return setSubmitError("Please enter the details.");

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // 1. Save field changes
      await updateProject(projectId, {
        title:              title.trim(),
        summary:            summary.trim(),
        description:        details.trim(),
        description_format: activeTab === "Markdown" ? "markdown" : "plain-text",
        domains:            tags.map((t) => t.label),
        links:              links.map((l) => l.value).filter(Boolean),
        media_urls:         existingMediaUrls,
      });

      // Upload any new media files
      if (uploadedFiles.length > 0) {
        await uploadProjectMedia(projectId, uploadedFiles);
      }

      // 2. Diff team members and apply adds/removes
      const currentIds  = selectedUsers.map((u) => u.id);
      const toAdd       = currentIds.filter((id) => !originalUserIds.includes(id));
      const toRemove    = originalUserIds.filter((id) => !currentIds.includes(id));

      await Promise.all([
        ...toAdd.map((id) => addProjectMember(projectId, id)),
        ...toRemove.map((id) => removeProjectMember(projectId, id)),
      ]);

      router.push(`/projectPage?id=${projectId}`);
    } catch (error: unknown) {
      if (getErrorMessage(error, "") === "Unauthorized") { router.replace("/auth"); return; }
      setSubmitError(getErrorMessage(error, "Failed to save changes. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

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
                <button className="edit-page__action-btn" onClick={() => router.push(`/projectPage?id=${projectId}`)} disabled={isSubmitting}>
                  ← Go Back
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {submitError && (
                    <p style={{ color: "#a53d2a", fontSize: 13, margin: 0 }}>{submitError}</p>
                  )}
                  <button className="edit-page__action-btn edit-page__action-btn--destructive" onClick={() => setShowConfirm(true)} disabled={isSubmitting}>
                    Delete Project
                  </button>
                  <button className="edit-page__action-btn" onClick={handleSave} disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>

              <div className="pcf-form-container">

                {/* Section 1 — Details */}
                <section className="pcf-card">
                  <div className="pcf-card-header">
                    <div>
                      <p className="pcf-section-label">Section 1 of 3</p>
                      <h2 className="pcf-section-title">Project Details</h2>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="pcf-field">
                    <label className="pcf-label">
                      Title
                      <span className="pcf-label-hint">(This will be displayed everywhere, make sure it is catchy :))</span>
                    </label>
                    <input className="pcf-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Eg. Generative AI for Healthcare Applications" />
                  </div>

                  {/* Summary */}
                  <div className="pcf-field">
                    <label className="pcf-label">
                      Summary
                      <span className="pcf-label-hint">(A concise summary of your work.)</span>
                    </label>
                    <textarea className="pcf-textarea pcf-textarea--short" value={summary} onChange={(e) => setSummary(e.target.value)} />
                  </div>

                  {/* Details */}
                  <div className="pcf-field">
                    <label className="pcf-label">
                      Details
                      <span className="pcf-label-hint">(A detailed description of your work.)</span>
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

                  {/* Domain Tags */}
                  <div className="pcf-field">
                    <label className="pcf-label">
                      Domains / Tags
                      <span className="pcf-label-hint">(Add tags that best describe the domains your project falls under.)</span>
                    </label>
                    <div className="pcf-tags-row">
                      {tags.map((t) => (
                        <span key={t.id} className="pcf-tag">
                          {t.label}
                          <button className="pcf-tag-remove" onClick={() => removeTag(t.id)}>×</button>
                        </span>
                      ))}
                    </div>
                    <button className="pcf-add-btn" onClick={addTag}><span className="pcf-add-icon">+</span> Add Tag</button>
                  </div>
                </section>

                {/* Section 2 — Media & Links */}
                <section className="pcf-card">
                  <div className="pcf-card-header">
                    <div>
                      <p className="pcf-section-label">Section 2 of 3</p>
                      <h2 className="pcf-section-title">Project Media and Links</h2>
                    </div>
                  </div>

                  {/* Existing media URLs */}
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
                            <button className="pcf-file-remove" onClick={() => removeExistingUrl(url)}>×</button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>No existing media.</p>
                    )}
                  </div>

                  {/* Upload new media */}
                  <div className="pcf-field">
                    <label className="pcf-label">
                      Upload New Media
                      <span className="pcf-label-hint">(Add new images, videos or PDFs.)</span>
                    </label>
                    <div className="pcf-upload-zone" onDragOver={(e) => e.preventDefault()} onDrop={handleFileDrop} onClick={() => fileInputRef.current?.click()}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span className="pcf-upload-title">Upload Files from your Computer</span>
                      <span className="pcf-upload-hint">Upload images, videos or PDFs</span>
                      <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,.pdf" style={{ display: "none" }} onChange={handleFileInput} />
                    </div>
                    {uploadedFiles.length > 0 && (
                      <div className="pcf-file-list">
                        {uploadedFiles.map((f, i) => (
                          <div key={i} className="pcf-file-item">
                            <span className="pcf-file-name">{f.name}</span>
                            <button className="pcf-file-remove" onClick={() => removeNewFile(i)}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Links */}
                  <div className="pcf-field">
                    <label className="pcf-label">
                      Relevant Links
                      <span className="pcf-label-hint">(Add links to material, publications or code repositories.)</span>
                    </label>
                    {links.map((link) => (
                      <div key={link.id} className="pcf-link-row">
                        <div className="pcf-link-input-wrapper">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pcf-link-icon">
                            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                          </svg>
                          <input className="pcf-input pcf-input--link" placeholder="https://" value={link.value} onChange={(e) => updateLink(link.id, e.target.value)} />
                        </div>
                        {links.length > 1 && <button className="pcf-link-remove" onClick={() => removeLink(link.id)}>×</button>}
                      </div>
                    ))}
                    <button className="pcf-add-btn" onClick={addLink}><span className="pcf-add-icon">+</span> Add Link</button>
                  </div>
                </section>

                {/* Section 3 — Team */}
                <section className="pcf-card">
                  <div className="pcf-card-header">
                    <div>
                      <p className="pcf-section-label">Section 3 of 3</p>
                      <h2 className="pcf-section-title">Project Team</h2>
                    </div>
                  </div>

                  <div className="pcf-field">
                    <label className="pcf-label">
                      Team Members
                      <span className="pcf-label-hint">(Search and add team members. Changes are applied on Save.)</span>
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
                          placeholder="Search for team members..."
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

              </div>

              {showConfirm && (
                <ConfirmPopUp
                  heading="Delete Project?"
                  message="This will permanently delete this project and cannot be undone."
                  confirmLabel="Delete"
                  cancelLabel="Cancel"
                  isDestructive={true}
                  onConfirm={handleDelete}
                  onCancel={() => setShowConfirm(false)}
                />
              )}
            </>
          )}

        </main>
      </div>
    </div>
  );
}

export default function EditProjectPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditProjectPageContent />
    </Suspense>
  );
}
