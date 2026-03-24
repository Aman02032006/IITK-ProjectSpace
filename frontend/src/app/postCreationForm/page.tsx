"use client";

import "./postCreationForm.css";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown"
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { getToken } from "@/lib/token"
import { createProject, uploadProjectMedia } from "@/lib/projectApi";
import { createRecruitment, uploadRecruitmentMedia } from "@/lib/recruitmentApi";
import { UserSummary } from "@/lib/projectApi";
import { searchUsers } from "@/lib/profileApi";
import CreatableSelect from "react-select/creatable";

import skillsData from "@/data/seed_skills.json"

type PostType = "Project" | "Recruitment";

interface Tag {
  id: string;
  label: string;
}

interface LinkEntry {
  id: string;
  value: string;
}

export default function PostCreationForm() {
  const router = useRouter();

  const [postType, setPostType]       = useState<PostType>("Project");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeTab, setActiveTab]     = useState<"Markdown" | "Plain-Text">("Markdown");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError]   = useState<string | null>(null);

  // Shared fields
  const [title, setTitle]     = useState("");
  const [details, setDetails] = useState("");
  const [tags, setTags]       = useState<Tag[]>([]);
  const [links, setLinks]     = useState<LinkEntry[]>([{ id: "1", value: "" }]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Project-only fields
  const [summary, setSummary]         = useState("");
  const [selectedUsers, setSelectedUsers] = useState<UserSummary[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<UserSummary[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  // Recruitment-only fields
  const [prerequisites, setPrerequisites]           = useState<Tag[]>([]);
  const [allowedDesignations, setAllowedDesignations] = useState<Tag[]>([]);
  const [allowedDepartments, setAllowedDepartments]   = useState<Tag[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const SKILLS = skillsData;
  const DEPARTMENTS = [ 
    "Aerospace Engineering(AE)",
    "Biological Sciences and Bio-Engineering(BSBE)",
    "Chemical Engineering(CHE)",
    "Chemistry(CHM)",
    "Civil Engineering(CE)",
    "Cognitive Science(CGS)",
    "Computer Science and Engineering(CSE)",
    "Design(DES)",
    "Earth Sciences(ES)",
    "Economics(ECO)",
    "Electrical Engineering(EE)",
    "Humanities and Social Sciences(HSS)",
    "Intelligent Systems",
    "Management Sciences(DoMS)",
    "Material Science and Engineering(MSE)",
    "Mathematics and Scientific Computing(MTH)",
    "Mechanical Engineering(ME)",
    "Nuclear Engineering and Technology(NET)",
    "Photonics Science and Engineering(PSE)",
    "Physics(PHY)",
    "Space, Planetary and Astronomical Sciences and Engineering(SPASE)",
    "Statistics and Data Science(SDS)",
    "Sustainable Energy Engineering(SEE)"
  ];
  const DESIGNATIONS = ["UG_STUDENT", "PG_STUDENT", "PHD", "POSTDOC"];

  useEffect(() => {
  if (!getToken()) {
    router.replace("/auth");
  }
  }, []);

  useEffect(() => {
    if (userSearchQuery.trim().length < 2) {
      setUserSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const results = await searchUsers(userSearchQuery);

        // Filter out users that are already selected
        const filteredResults = results.filter(
          (result) => !selectedUsers.some((selected) => selected.id === result.id)
        );

        setUserSearchResults(filteredResults);
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [userSearchQuery, selectedUsers]);

  const handleSelectUser = (user: UserSummary) => {
    setSelectedUsers((prev) => [...prev, user]);
    setUserSearchQuery("");
    setUserSearchResults([]);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  // Helpers
  const handleTypeSelect = (type: PostType) => {
    setPostType(type);
    setDropdownOpen(false);
  };

  const makeAdder = (setter: React.Dispatch<React.SetStateAction<Tag[]>>, promptText: string) => () => {
    const label = prompt(promptText);
    if (label?.trim())
      setter((prev) => [...prev, { id: Date.now().toString(), label: label.trim() }]);
  };

  const makeRemover = (setter: React.Dispatch<React.SetStateAction<Tag[]>>) => (id: string) =>
    setter((prev) => prev.filter((t) => t.id !== id));

  const handleTagsChange = (selectedOptions: any) => {
    const newTags = selectedOptions ? selectedOptions.map((opt: any) => ({ id: opt.value, label: opt.value })) : [];
    setTags(newTags);
  };

  const handlePrerequisitesChange = (selectedOptions: any) => {
    const newPrereqs = selectedOptions ? selectedOptions.map((opt: any) => ({ id: opt.value, label: opt.value })) : [];
    setPrerequisites(newPrereqs);
  };

  const handleDesignationsChange = (selectedOptions: any) => {
    const newDesignations = selectedOptions ? selectedOptions.map((opt: any) => ({ id: opt.value, label: opt.value })) : [];
    setAllowedDesignations(newDesignations);
  };

  const handleDepartmentsChange = (selectedOptions: any) => {
    const newDepartments = selectedOptions ? selectedOptions.map((opt: any) => ({ id: opt.value, label: opt.value })) : [];
    setAllowedDepartments(newDepartments);
  };

  const addLink = () =>
    setLinks((prev) => [...prev, { id: Date.now().toString(), value: "" }]);
  const updateLink = (id: string, value: string) =>
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, value } : l)));
  const removeLink = (id: string) =>
    setLinks((prev) => prev.filter((l) => l.id !== id));

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setUploadedFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
  };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files)
      setUploadedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
  };
  const removeFile = (index: number) =>
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));

  // Submit
  const handleSubmit = async () => {
    setSubmitError(null);

    // Basic validation
    if (!title.trim()) return setSubmitError("Please enter a title.");
    if (!details.trim()) return setSubmitError("Please enter the details.");
    if (postType === "Project" && !summary.trim()) return setSubmitError("Please enter a summary.");

    setIsSubmitting(true);
    try {
      const descriptionFormat = activeTab === "Markdown" ? "markdown" : "plain-text";
      const cleanLinks = links.map((l) => l.value).filter(Boolean);

      const selectedIds = selectedUsers.map(u => u.id)

      if (postType === "Project") {
        const created = await createProject({
          title: title.trim(),
          summary: summary.trim(),
          description: details.trim(),
          description_format: descriptionFormat,
          domains: tags.map((t) => t.label),
          links: cleanLinks,
          media_urls: [],
          team_member_ids: selectedIds,
        });

        if (uploadedFiles.length > 0) {
          await uploadProjectMedia(created.id, uploadedFiles);
        }

        router.push(`/projectPage?id=${created.id}`);

      } else {
        const created = await createRecruitment({
          title: title.trim(),
          description: details.trim(),
          description_format: descriptionFormat,
          domains: tags.map((t) => t.label),
          prerequisites: prerequisites.map((t) => t.label),
          allowed_designations: allowedDesignations.map((t) => t.label),
          allowed_departments: allowedDepartments.map((t) => t.label),
          links: cleanLinks,
          media_urls: [],
          status: "Open",
          recruiter_ids: selectedIds,
        });

        if (uploadedFiles.length > 0) {
          await uploadRecruitmentMedia(created.id, uploadedFiles);
        }
        
        router.push(`/recruitmentPage?id=${created.id}`);
      }

    } catch (err: any) {
      if (err.message === "Unauthorized") { router.replace("/loginPage"); return; }
      setSubmitError(err.message || "Failed to publish. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tag Block Component

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
      <button className="pcf-add-btn" onClick={onAdd}>
        <span className="pcf-add-icon">+</span> {addLabel}
      </button>
    </>
  );

  return (
    <div className="app-shell">
      <Header showEditProfile={false} />

      <div className="app-body">
        <Sidebar defaultActive="create" />

        <main className="pcf-main">
          <p className="pcf-faq-hint">
            In case of any query regarding post creation, please refer to the FAQs.
          </p>

          <div className="pcf-form-container">

            {/* Section 1 */}
            <section className="pcf-card">
              <div className="pcf-card-header">
                <div>
                  <p className="pcf-section-label">Section 1 of 3</p>
                  <h2 className="pcf-section-title">
                    {postType === "Project" ? "Project Details" : "Recruitment Details"}
                  </h2>
                </div>

                {/* Type dropdown */}
                <div className="pcf-dropdown-wrapper">
                  <button className="pcf-dropdown-btn" onClick={() => setDropdownOpen((v) => !v)}>
                    <span>{postType}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className={`pcf-chevron${dropdownOpen ? " pcf-chevron--open" : ""}`}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {dropdownOpen && (
                    <div className="pcf-dropdown-menu">
                      {(["Project", "Recruitment"] as PostType[]).map((type) => (
                        <button
                          key={type}
                          className={`pcf-dropdown-item${postType === type ? " pcf-dropdown-item--active" : ""}`}
                          onClick={() => handleTypeSelect(type)}
                        >
                          {type}
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
                <input
                  className="pcf-input"
                  placeholder="Eg. Generative AI for Healthcare Applications"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Summary — Project only */}
              {postType === "Project" && (
                <div className="pcf-field">
                  <label className="pcf-label">
                    Summary
                    <span className="pcf-label-hint">
                      (A concise summary of your work. This will be used on project posts on the discover page and search results.)
                    </span>
                  </label>
                  <textarea
                    className="pcf-textarea pcf-textarea--short"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                  />
                </div>
              )}

              {/* Details */}
              <div className="pcf-field">
                <label className="pcf-label">
                  Details
                  <span className="pcf-label-hint">
                    {postType === "Project"
                      ? "(A detailed description of your work. This will be displayed on the project page.)"
                      : "(A detailed description of recruitment requirements and criterion. This will be displayed on the recruitment page.)"}
                  </span>
                </label>
                <div className="pcf-tabs">
                  {(["Markdown", "Plain-Text"] as const).map((tab) => (
                    <button
                      key={tab}
                      className={`pcf-tab${activeTab === tab ? " pcf-tab--active" : ""}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                {activeTab === "Markdown" ? (
                <div className="pcf-split-pane">
                  <textarea
                    className="pcf-textarea pcf-textarea--tall pcf-split-editor"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Write markdown here..."
                  />
                  <div className="pcf-split-preview">
                    {details.trim()
                      ? <ReactMarkdown>{details}</ReactMarkdown>
                      : <span className="pcf-preview-placeholder">Preview will appear here...</span>
                    }
                  </div>
                </div>
              ) : (
                <textarea
                  className="pcf-textarea pcf-textarea--tall"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Write your description here..."
                />
              )}
              </div>

              {/* Domain Tags */}
              <div className="pcf-field">
                <label className="pcf-label">
                  Domains / Tags
                  <span className="pcf-label-hint">(Add tags that best describe the domains this post falls under.)</span>
                </label>
                <CreatableSelect
                  instanceId="post-domains-tags"
                  isMulti
                  options={SKILLS}
                  value={tags.map((tag) => ({ value: tag.label, label: tag.label }))}
                  onChange={handleTagsChange}
                  placeholder="Search or type to create a domain/tag..."
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </div>

              {/* Prerequisites — Recruitment only */}
              {postType === "Recruitment" && (
                <div className="pcf-field">
                  <label className="pcf-label">
                    Prerequisites
                    <span className="pcf-label-hint">(Add skills or technologies applicants should be familiar with.)</span>
                  </label>
                  <CreatableSelect
                    instanceId="post-prerequisites"
                    isMulti
                    options={SKILLS}
                    value={prerequisites.map((req) => ({ value: req.label, label: req.label }))}
                    onChange={handlePrerequisitesChange}
                    placeholder="Search or type to create a prerequisite..."
                    className="react-select-container"
                    classNamePrefix="react-select"
                  />
                </div>
              )}
            </section>

            {/* Section 2 */}
            <section className="pcf-card">
              <div className="pcf-card-header">
                <div>
                  <p className="pcf-section-label">Section 2 of 3</p>
                  <h2 className="pcf-section-title">
                    {postType === "Project" ? "Project Media and Links" : "Recruitment Media and Links"}
                  </h2>
                </div>
              </div>

              {/* Upload media */}
              <div className="pcf-field">
                <label className="pcf-label">
                  Upload media
                  <span className="pcf-label-hint">
                    {postType === "Project"
                      ? "(Add media relevant to your project.)"
                      : "(Add media relevant to your recruitment.)"}
                  </span>
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
                  <span className="pcf-upload-hint">
                    Upload images, videos or PDFs related to your {postType === "Project" ? "work" : "recruitment"}
                  </span>
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
                        <button className="pcf-file-remove" onClick={() => removeFile(i)}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Relevant Links */}
              <div className="pcf-field">
                <label className="pcf-label">
                  Relevant Links
                  <span className="pcf-label-hint">
                    {postType === "Project"
                      ? "(Add links to material, publications or code repositories.)"
                      : "(Add links to material, publications or recruitment tasks.)"}
                  </span>
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
                      <button className="pcf-link-remove" onClick={() => removeLink(link.id)}>×</button>
                    )}
                  </div>
                ))}
                <button className="pcf-add-btn" onClick={addLink}>
                  <span className="pcf-add-icon">+</span> Add Link
                </button>
              </div>
            </section>

            {/* Section 3 */}
            <section className="pcf-card">
              <div className="pcf-card-header">
                <div>
                  <p className="pcf-section-label">Section 3 of 3</p>
                  <h2 className="pcf-section-title">
                    {postType === "Project" ? "Project Team" : "Recruitment Specifications and Team"}
                  </h2>
                </div>
              </div>

              {/* Allowed Designations — Recruitment only */}
              {postType === "Recruitment" && (
                <div className="pcf-field">
                  <label className="pcf-label">
                    Allowed Designations
                    <span className="pcf-label-hint">(Only applicants with these designations will be able to apply.)</span>
                  </label>
                  <CreatableSelect
                    instanceId="post-allowed-designations"
                    isMulti
                    options={DESIGNATIONS.map(d => ({ value: d, label: d }))}
                    value={allowedDesignations.map((tag) => ({ value: tag.label, label: tag.label }))}
                    onChange={handleDesignationsChange}
                    placeholder="Select or type to create a designation..."
                    className="react-select-container"
                    classNamePrefix="react-select"
                  />
                </div>
              )}

              {/* Allowed Departments — Recruitment only */}
              {postType === "Recruitment" && (
                <div className="pcf-field">
                  <label className="pcf-label">
                    Allowed Departments
                    <span className="pcf-label-hint">(Only applicants from these departments will be able to apply.)</span>
                  </label>
                  <CreatableSelect
                    instanceId="post-allowed-departments"
                    isMulti
                    options={DEPARTMENTS.map(d => ({ value: d, label: d }))}
                    value={allowedDepartments.map((tag) => ({ value: tag.label, label: tag.label }))}
                    onChange={handleDepartmentsChange}
                    placeholder="Select or type to create a department..."
                    className="react-select-container"
                    classNamePrefix="react-select"
                  />
                </div>
              )}

              {/* Team Members / Fellow Recruiters Autocomplete */}
              <div className="pcf-field">
                <label className="pcf-label">
                  {postType === "Project" ? "Add Team Members" : "Add Fellow Recruiters"}
                  <span className="pcf-label-hint">
                    (Search for users to add them to your post.)
                  </span>
                </label>

                {/* Selected User Chips */}
                {selectedUsers.length > 0 && (
                  <div className="pcf-tags-row" style={{ marginBottom: "12px" }}>
                    {selectedUsers.map((user) => (
                      <span key={user.id} className="pcf-tag" style={{ background: "var(--primary-color)", color: "white" }}>
                        {user.fullname}
                        <button 
                          className="pcf-tag-remove" 
                          style={{ color: "white" }}
                          onClick={() => handleRemoveUser(user.id)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Search Input & Dropdown */}
                <div style={{ position: "relative" }}>
                  <div className="pcf-search-input-wrapper">
                    <span className="pcf-at-icon">@</span>
                    <input
                      className="pcf-input pcf-input--search"
                      placeholder={postType === "Project" ? "Search for team members..." : "Search for recruiters..."}
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Dropdown Results */}
                  {userSearchResults.length > 0 && (
                    <div 
                      className="pcf-dropdown-menu" 
                      style={{ 
                        display: "block", 
                        position: "absolute", 
                        top: "100%", 
                        left: 0, 
                        width: "100%", 
                        zIndex: 10,
                        marginTop: "4px",
                        maxHeight: "200px",
                        overflowY: "auto"
                      }}
                    >
                      {userSearchResults.map((user) => (
                        <button
                          key={user.id}
                          className="pcf-dropdown-item"
                          onClick={() => handleSelectUser(user)}
                          style={{ textAlign: "left", padding: "10px" }}
                        >
                          <strong>{user.fullname}</strong>
                          <span style={{ display: "block", fontSize: "11px", color: "gray" }}>
                            {user.designation}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {isSearchingUsers && (
                    <div style={{ position: "absolute", right: "12px", top: "12px", fontSize: "12px", color: "gray" }}>
                      Searching...
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Error message */}
            {submitError && (
              <p style={{ color: "#a53d2a", fontSize: 13, textAlign: "right" }}>
                {submitError}
              </p>
            )}

            {/* Submit */}
            <div className="pcf-submit-row">
              <button className="pcf-submit-btn" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Publishing..." : `Publish ${postType}`}
              </button>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}