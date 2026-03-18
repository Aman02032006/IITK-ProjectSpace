"use client";

import "./editRecruitmentPage.css";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import { getRecruitment, updateRecruitment, deleteRecruitment } from "@/lib/recruitmentApi";
import ConfirmPopUp from "../../components/confirmPopUp";

interface Tag {
  id: string;
  label: string;
}

export default function EditRecruitmentPage() {
  const params        = useParams();
  const router        = useRouter();
  const recruitmentId = params?.id as string;

  // Page states
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError]   = useState<string | null>(null);
  const [showConfirm, setShowConfirm]   = useState(false);

  // Form states
  const [activeTab, setActiveTab]           = useState<"Markdown" | "Plain-Text">("Markdown");
  const [title, setTitle]                   = useState("");
  const [details, setDetails]               = useState("");
  const [status, setStatus]                 = useState<"Open" | "Closed">("Open");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [domains, setDomains]               = useState<Tag[]>([]);
  const [prerequisites, setPrerequisites]   = useState<Tag[]>([]);
  const [allowedDesignations, setAllowedDesignations] = useState<Tag[]>([]);
  const [allowedDepartments, setAllowedDepartments]   = useState<Tag[]>([]);
  const [fellowRecruiters, setFellowRecruiters]       = useState("");

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
        setFellowRecruiters(raw.recruiters.map((r) => r.fullname).join(", "));
      } catch (err: any) {
        if (err.message === "Unauthorized") { router.replace("/loginPage"); return; }
        setError("Failed to load recruitment. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchRecruitment();
  }, [recruitmentId]);

  // Helpers
  const makeAdder = (setter: React.Dispatch<React.SetStateAction<Tag[]>>, promptText: string) => () => {
    const label = prompt(promptText);
    if (label?.trim())
      setter((prev) => [...prev, { id: Date.now().toString(), label: label.trim() }]);
  };

  const makeRemover = (setter: React.Dispatch<React.SetStateAction<Tag[]>>) => (id: string) =>
    setter((prev) => prev.filter((t) => t.id !== id));

  const addDomain          = makeAdder(setDomains,              "Enter domain tag:");
  const removeDomain       = makeRemover(setDomains);
  const addPrerequisite    = makeAdder(setPrerequisites,         "Enter prerequisite:");
  const removePrerequisite = makeRemover(setPrerequisites);
  const addDesignation     = makeAdder(setAllowedDesignations,   "Enter allowed designation:");
  const removeDesignation  = makeRemover(setAllowedDesignations);
  const addDepartment      = makeAdder(setAllowedDepartments,    "Enter allowed department:");
  const removeDepartment   = makeRemover(setAllowedDepartments);

  const handleDelete = async () => {
    try {
      await deleteRecruitment(recruitmentId);
      router.replace("/homePage");
    } catch (err: any) {
      if (err.message === "Unauthorized") { router.replace("/loginPage"); return; }
      setSubmitError(err.message || "Failed to delete recruitment. Please try again.");
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
      await updateRecruitment(recruitmentId, {
        title:                title.trim(),
        description:          details.trim(),
        description_format:   activeTab === "Markdown" ? "markdown" : "plain-text",
        domains:              domains.map((t) => t.label),
        prerequisites:        prerequisites.map((t) => t.label),
        allowed_designations: allowedDesignations.map((t) => t.label),
        allowed_departments:  allowedDepartments.map((t) => t.label),
        status,
      });
      router.push(`/recruitmentPage/${recruitmentId}`);
    } catch (err: any) {
      if (err.message === "Unauthorized") { router.replace("/loginPage"); return; }
      setSubmitError(err.message || "Failed to save changes. Please try again.");
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

          {/* Loading */}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {[1, 2].map((i) => (
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
              <p className="pcf-faq-hint">
                Edit your recruitment details below. Changes will be saved once you click Save Changes.
              </p>

              <div className="pcf-form-container">

                {/* Section 1 */}
                <section className="pcf-card">
                  <div className="pcf-card-header">
                    <div>
                      <p className="pcf-section-label">Section 1 of 2</p>
                      <h2 className="pcf-section-title">Recruitment Details</h2>
                    </div>

                    {/* Status dropdown */}
                    <div className="pcf-dropdown-wrapper">
                      <button
                        className="pcf-dropdown-btn"
                        onClick={() => setStatusDropdownOpen((v) => !v)}
                      >
                        <span>{status}</span>
                        <svg
                          width="16" height="16" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" strokeWidth="2"
                          className={`pcf-chevron${statusDropdownOpen ? " pcf-chevron--open" : ""}`}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                      {statusDropdownOpen && (
                        <div className="pcf-dropdown-menu">
                          {(["Open", "Closed"] as const).map((s) => (
                            <button
                              key={s}
                              className={`pcf-dropdown-item${status === s ? " pcf-dropdown-item--active" : ""}`}
                              onClick={() => { setStatus(s); setStatusDropdownOpen(false); }}
                            >
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
                    <input
                      className="pcf-input"
                      placeholder="Eg. Generative AI for Healthcare Applications"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  {/* Details */}
                  <div className="pcf-field">
                    <label className="pcf-label">
                      Details
                      <span className="pcf-label-hint">(A detailed description of recruitment requirements and criteria.)</span>
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
                    <textarea
                      className="pcf-textarea pcf-textarea--tall"
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                    />
                  </div>

                  {/* Domains */}
                  <div className="pcf-field">
                    <label className="pcf-label">
                      Domains / Tags
                      <span className="pcf-label-hint">(Add tags that best describe the domains this recruitment falls under.)</span>
                    </label>
                    <TagBlock tags={domains} onAdd={addDomain} onRemove={removeDomain} addLabel="Add Domain" />
                  </div>

                  {/* Prerequisites */}
                  <div className="pcf-field">
                    <label className="pcf-label">
                      Prerequisites
                      <span className="pcf-label-hint">(Add skills or technologies applicants should be familiar with.)</span>
                    </label>
                    <TagBlock tags={prerequisites} onAdd={addPrerequisite} onRemove={removePrerequisite} addLabel="Add Prerequisite" />
                  </div>
                </section>

                {/* Section 2 */}
                <section className="pcf-card">
                  <div className="pcf-card-header">
                    <div>
                      <p className="pcf-section-label">Section 2 of 2</p>
                      <h2 className="pcf-section-title">Recruitment Specifications and Team</h2>
                    </div>
                  </div>

                  {/* Allowed Designations */}
                  <div className="pcf-field">
                    <label className="pcf-label">
                      Allowed Designations
                      <span className="pcf-label-hint">(Only applicants with these designations will be able to apply.)</span>
                    </label>
                    <TagBlock tags={allowedDesignations} onAdd={addDesignation} onRemove={removeDesignation} addLabel="Add Designation" />
                  </div>

                  {/* Allowed Departments */}
                  <div className="pcf-field">
                    <label className="pcf-label">
                      Allowed Departments
                      <span className="pcf-label-hint">(Only applicants from these departments will be able to apply.)</span>
                    </label>
                    <TagBlock tags={allowedDepartments} onAdd={addDepartment} onRemove={removeDepartment} addLabel="Add Department" />
                  </div>

                  {/* Fellow Recruiters */}
                  <div className="pcf-field">
                    <label className="pcf-label">
                      Fellow Recruiters
                      <span className="pcf-label-hint">
                        (Verification request will be sent to users you add. Only users who verify will be displayed on the recruitment page.)
                      </span>
                    </label>
                    <div className="pcf-search-input-wrapper">
                      <span className="pcf-at-icon">@</span>
                      <input
                        className="pcf-input pcf-input--search"
                        placeholder="Search for fellow recruiters"
                        value={fellowRecruiters}
                        onChange={(e) => setFellowRecruiters(e.target.value)}
                      />
                    </div>
                  </div>
                </section>

                {/* Error */}
                {submitError && (
                  <p style={{ color: "#a53d2a", fontSize: 13, textAlign: "right" }}>
                    {submitError}
                  </p>
                )}

                {/* Save / Delete */}
                <div className="pcf-submit-row" style={{ justifyContent: "space-between" }}>
                  <button
                    className="pcf-submit-btn"
                    style={{ background: "#a53d2a" }}
                    onClick={() => setShowConfirm(true)}
                    disabled={isSubmitting}
                  >
                    Delete Recruitment
                  </button>
                  <button className="pcf-submit-btn" onClick={handleSave} disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>

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