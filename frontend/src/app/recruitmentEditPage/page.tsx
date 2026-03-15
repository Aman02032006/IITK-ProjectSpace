"use client";

import "./editRecruitmentPage.css";

import { useState } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { Recruitment } from "../recruitmentPage/page"; // adjust path as needed

interface Tag {
  id: string;
  label: string;
}

interface EditRecruitmentPageProps {
  recruitment: Recruitment;
  onSave?: (updated: Partial<Recruitment>) => void;
}

export default function EditRecruitmentPage({ recruitment, onSave }: EditRecruitmentPageProps) {
  const [activeTab, setActiveTab] = useState<"Markdown" | "Plain-Text">(
    recruitment.description_format === "markdown" ? "Markdown" : "Plain-Text"
  );

  // ── Pre-populate all fields from the recruitment prop ──
  const [title, setTitle]     = useState(recruitment.title);
  const [details, setDetails] = useState(recruitment.description);
  const [status, setStatus]   = useState<"Open" | "Closed">(recruitment.status);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const [domains, setDomains] = useState<Tag[]>(
    recruitment.domains.map((d, i) => ({ id: String(i), label: d }))
  );
  const [prerequisites, setPrerequisites] = useState<Tag[]>(
    recruitment.prerequisites.map((p, i) => ({ id: String(i), label: p }))
  );
  const [allowedDesignations, setAllowedDesignations] = useState<Tag[]>(
    recruitment.allowed_designations.map((d, i) => ({ id: String(i), label: d }))
  );
  const [allowedDepartments, setAllowedDepartments] = useState<Tag[]>(
    recruitment.allowed_departments.map((d, i) => ({ id: String(i), label: d }))
  );

  // Recruiters — pre-fill as comma-separated names
  const [fellowRecruiters, setFellowRecruiters] = useState(
    recruitment.recruiters?.map((r) => r.name).join(", ") ?? ""
  );

  // ── Tag helpers ──
  const makeAdder = (setter: React.Dispatch<React.SetStateAction<Tag[]>>, prompt_text: string) => () => {
    const label = prompt(prompt_text);
    if (label?.trim())
      setter((prev) => [...prev, { id: Date.now().toString(), label: label.trim() }]);
  };
  const makeRemover = (setter: React.Dispatch<React.SetStateAction<Tag[]>>) => (id: string) =>
    setter((prev) => prev.filter((t) => t.id !== id));

  const addDomain          = makeAdder(setDomains,             "Enter domain tag:");
  const removeDomain       = makeRemover(setDomains);
  const addPrerequisite    = makeAdder(setPrerequisites,        "Enter prerequisite:");
  const removePrerequisite = makeRemover(setPrerequisites);
  const addDesignation     = makeAdder(setAllowedDesignations,  "Enter allowed designation (e.g. UG, PG, PhD):");
  const removeDesignation  = makeRemover(setAllowedDesignations);
  const addDepartment      = makeAdder(setAllowedDepartments,   "Enter allowed department (e.g. CSE, EE):");
  const removeDepartment   = makeRemover(setAllowedDepartments);

  // ── Save ──
  const handleSave = () => {
    const updated: Partial<Recruitment> = {
      title,
      description: details,
      description_format: activeTab === "Markdown" ? "markdown" : "plain-text",
      domains:              domains.map((t) => t.label),
      prerequisites:        prerequisites.map((t) => t.label),
      allowed_designations: allowedDesignations.map((t) => t.label),
      allowed_departments:  allowedDepartments.map((t) => t.label),
      status,
    };
    onSave?.(updated);
  };

  // ── Shared tag block ──
  const TagBlock = ({
    tags, onAdd, onRemove, addLabel,
  }: {
    tags: Tag[];
    onAdd: () => void;
    onRemove: (id: string) => void;
    addLabel: string;
  }) => (
    <>
      <div className="pcf-tags-row">
        {tags.map((t) => (
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
            Edit your recruitment details below. Changes will be saved once you click Save Changes.
          </p>

          <div className="pcf-form-container">

            {/* ── Section 1: Recruitment Details ── */}
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
                  <span className="pcf-label-hint">
                    (This will be displayed everywhere, make sure it is catchy :))
                  </span>
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
                  <span className="pcf-label-hint">
                    (A detailed description of recruitment requirements and criteria.)
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
                  <span className="pcf-label-hint">
                    (Add tags that best describe the domains this recruitment falls under.)
                  </span>
                </label>
                <TagBlock tags={domains} onAdd={addDomain} onRemove={removeDomain} addLabel="Add Domain" />
              </div>

              {/* Prerequisites */}
              <div className="pcf-field">
                <label className="pcf-label">
                  Prerequisites
                  <span className="pcf-label-hint">
                    (Add skills or technologies applicants should be familiar with.)
                  </span>
                </label>
                <TagBlock tags={prerequisites} onAdd={addPrerequisite} onRemove={removePrerequisite} addLabel="Add Prerequisite" />
              </div>
            </section>

            {/* ── Section 2: Specifications and Team ── */}
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
                  <span className="pcf-label-hint">
                    (Only applicants with these designations will be able to apply.)
                  </span>
                </label>
                <TagBlock tags={allowedDesignations} onAdd={addDesignation} onRemove={removeDesignation} addLabel="Add Designation" />
              </div>

              {/* Allowed Departments */}
              <div className="pcf-field">
                <label className="pcf-label">
                  Allowed Departments
                  <span className="pcf-label-hint">
                    (Only applicants from these departments will be able to apply.)
                  </span>
                </label>
                <TagBlock tags={allowedDepartments} onAdd={addDepartment} onRemove={removeDepartment} addLabel="Add Department" />
              </div>

              {/* Fellow Recruiters */}
              <div className="pcf-field">
                <label className="pcf-label">
                  Fellow Recruiters
                  <span className="pcf-label-hint">
                    (Verification request will be sent to users you add. Only users who verify will
                    be displayed on the recruitment page.)
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

            {/* Save */}
            <div className="pcf-submit-row">
              <button className="pcf-submit-btn" onClick={handleSave}>
                Save Changes
              </button>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}