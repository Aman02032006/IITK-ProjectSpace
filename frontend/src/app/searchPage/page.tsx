"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import "./SearchPage.css";
import "../profilePage/ProfilePage.css";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import ProjectsCard from "../components/cards/ProjectsCard";
import RecruitmentCard from "../components/cards/RecruitmentCard";
import UserCard from "../components/cards/UserCard";
import skillsSeed from "@/data/seed_skills.json";
import {
  searchProjects,
  searchRecruitments,
  searchUsers,
  SearchProjectResult,
  SearchRecruitmentResult,
  SearchUserResult,
} from "@/lib/searchApi";

type TabType = "recruitment" | "project" | "user";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const toAbsoluteUrl = (url?: string | null) => {
  if (!url) return undefined;
  return url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
};

const normalizeTab = (tab: string | null): TabType => {
  if (tab === "project" || tab === "user" || tab === "recruitment") return tab;
  return "recruitment";
};

const sameStringArray = (a: string[], b: string[]) =>
  a.length === b.length && a.every((item, idx) => item === b[idx]);

const SKILL_OPTIONS = Array.from(
  new Set(
    (skillsSeed as Array<{ value: string; label: string }>)
      .map((item) => (item.label || item.value || "").trim())
      .filter(Boolean)
  )
).sort((a, b) => a.localeCompare(b));

const PREREQUISITE_OPTIONS = SKILL_OPTIONS;

const DOMAIN_OPTIONS = [
  "Artificial Intelligence",
  "Machine Learning",
  "Data Science",
  "Software Development",
  "Web Development",
  "Robotics",
  "Computer Vision",
  "Natural Language Processing",
  "Cybersecurity",
  "Finance",
  "Systems",
  "Signal Processing",
  "Embedded Systems",
  "Cloud Computing",
  "Human Computer Interaction",
];

const DESIGNATION_OPTIONS = [
  "Undergraduate Student",
  "Postgraduate Student",
  "Ph.D Scholar",
  "Post-Doctoral Researcher",
  "Assistant Professor",
  "Associate Professor",
  "Professor",
  "Higher Academic Grade Professor",
];

const DEGREE_OPTIONS = [
  "B.Tech",
  "BS",
  "M.Tech",
  "MS",
  "MS by Research",
  "B.Tech/M.Tech Dual",
  "B.Tech/MS Dual",
  "B.Tech/MBA Dual",
  "BS/MS Dual",
  "BS/M.Tech Dual",
  "BS/MBA Dual",
  "MDes",
  "MBA",
  "MS/Ph.D Dual",
  "Ph.D",
];

const DEPARTMENT_OPTIONS = [
  "Aerospace Engineering",
  "Biological Sciences and Bioengineering",
  "Chemical Engineering",
  "Chemistry",
  "Civil Engineering",
  "Cognitive Sciences",
  "Computer Science and Engineering",
  "Design",
  "Earth Sciences",
  "Economics",
  "Electrical Engineering",
  "Humanities and Social Sciences",
  "Intelligent Systems",
  "Materials Science and Engineering",
  "Mathematics",
  "Mechanical Engineering",
  "Nuclear Engineering and Technology",
  "Management Sciences",
  "Physics",
  "Space, Planetary and Astronomical Sciences and Engineering",
  "Statistics and Data Science",
  "Sustainable Energy Engineering",
];

const RecruitIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const ProjectIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);

const UserIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const SearchPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlQuery = searchParams.get("q") ?? "";
  const urlTab = normalizeTab(searchParams.get("tab"));
  const urlDesignations = searchParams.getAll("designation").map((v) => v.trim()).filter(Boolean);
  const urlDegrees = searchParams.getAll("degree").map((v) => v.trim()).filter(Boolean);
  const urlDepartments = searchParams.getAll("department").map((v) => v.trim()).filter(Boolean);
  const urlSkills = searchParams.getAll("skill").map((v) => v.trim()).filter(Boolean);
  const urlPrerequisites = searchParams.getAll("prerequisite").map((v) => v.trim()).filter(Boolean);
  const urlDomains = searchParams.getAll("domain").map((v) => v.trim()).filter(Boolean);

  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [activeTab, setActiveTab] = useState<TabType>(urlTab);
  const [selectedDesignations, setSelectedDesignations] = useState<string[]>(urlDesignations);
  const [selectedDegrees, setSelectedDegrees] = useState<string[]>(urlDegrees);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(urlDepartments);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(urlSkills);
  const [selectedPrerequisites, setSelectedPrerequisites] = useState<string[]>(urlPrerequisites);
  const [selectedDomains, setSelectedDomains] = useState<string[]>(urlDomains);

  const [designationPicker, setDesignationPicker] = useState("");
  const [degreePicker, setDegreePicker] = useState("");
  const [departmentPicker, setDepartmentPicker] = useState("");
  const [skillPicker, setSkillPicker] = useState("");
  const [prerequisitePicker, setPrerequisitePicker] = useState("");
  const [domainPicker, setDomainPicker] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const [recruitmentResults, setRecruitmentResults] = useState<SearchRecruitmentResult[]>([]);
  const [projectResults, setProjectResults] = useState<SearchProjectResult[]>([]);
  const [userResults, setUserResults] = useState<SearchUserResult[]>([]);

  const trimmedQuery = useMemo(() => searchQuery.trim(), [searchQuery]);
  const designations = useMemo(
    () => Array.from(new Set(selectedDesignations.map((s) => s.trim()).filter(Boolean))),
    [selectedDesignations]
  );
  const degrees = useMemo(
    () => Array.from(new Set(selectedDegrees.map((s) => s.trim()).filter(Boolean))),
    [selectedDegrees]
  );
  const departments = useMemo(
    () => Array.from(new Set(selectedDepartments.map((s) => s.trim()).filter(Boolean))),
    [selectedDepartments]
  );
  const skills = useMemo(
    () => Array.from(new Set(selectedSkills.map((s) => s.trim()).filter(Boolean))),
    [selectedSkills]
  );
  const prerequisites = useMemo(
    () => Array.from(new Set(selectedPrerequisites.map((s) => s.trim()).filter(Boolean))),
    [selectedPrerequisites]
  );
  const domains = useMemo(
    () => Array.from(new Set(selectedDomains.map((s) => s.trim()).filter(Boolean))),
    [selectedDomains]
  );

  const hasUserFilters =
    designations.length > 0 || degrees.length > 0 || departments.length > 0 || skills.length > 0;
  const hasRecruitmentFilters =
    designations.length > 0 ||
    departments.length > 0 ||
    skills.length > 0 ||
    prerequisites.length > 0;
  const hasProjectFilters = domains.length > 0;
  const hasActiveFilters =
    activeTab === "user"
      ? hasUserFilters
      : activeTab === "recruitment"
      ? hasRecruitmentFilters
      : hasProjectFilters;

  useEffect(() => {
    if (urlQuery !== searchQuery) setSearchQuery(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    if (urlTab !== activeTab) setActiveTab(urlTab);
  }, [urlTab]);

  useEffect(() => {
    if (!sameStringArray(urlDesignations, designations)) setSelectedDesignations(urlDesignations);
    if (!sameStringArray(urlDegrees, degrees)) setSelectedDegrees(urlDegrees);
    if (!sameStringArray(urlDepartments, departments)) setSelectedDepartments(urlDepartments);
    if (!sameStringArray(urlSkills, skills)) setSelectedSkills(urlSkills);
    if (!sameStringArray(urlPrerequisites, prerequisites))
      setSelectedPrerequisites(urlPrerequisites);
    if (!sameStringArray(urlDomains, domains)) setSelectedDomains(urlDomains);
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (trimmedQuery) params.set("q", trimmedQuery);
    params.set("tab", activeTab);
    designations.forEach((value) => params.append("designation", value));
    degrees.forEach((value) => params.append("degree", value));
    departments.forEach((value) => params.append("department", value));
    skills.forEach((value) => params.append("skill", value));
    prerequisites.forEach((value) => params.append("prerequisite", value));
    domains.forEach((value) => params.append("domain", value));
    const next = `/searchPage?${params.toString()}`;
    const current = `/searchPage?${searchParams.toString()}`;
    if (next !== current) router.replace(next, { scroll: false });
  }, [
    trimmedQuery,
    activeTab,
    designations,
    degrees,
    departments,
    skills,
    prerequisites,
    domains,
    searchParams,
    router,
  ]);

  useEffect(() => {
    if (!trimmedQuery && !hasActiveFilters) {
      setError(null);
      setLoading(false);
      setTotal(0);
      setRecruitmentResults([]);
      setProjectResults([]);
      setUserResults([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        if (activeTab === "user") {
          const data = await searchUsers(trimmedQuery, 0, 30, {
            designations: designations.length ? designations : undefined,
            degrees: degrees.length ? degrees : undefined,
            departments: departments.length ? departments : undefined,
            skills: skills.length ? skills : undefined,
          });
          if (!cancelled) {
            setUserResults(data.results);
            setTotal(data.total);
          }
        } else if (activeTab === "recruitment") {
          const data = await searchRecruitments(trimmedQuery, 0, 30, {
            designations: designations.length ? designations : undefined,
            departments: departments.length ? departments : undefined,
            skills: skills.length ? skills : undefined,
            prerequisites: prerequisites.length ? prerequisites : undefined,
          });
          if (!cancelled) {
            setRecruitmentResults(data.results);
            setTotal(data.total);
          }
        } else {
          const data = await searchProjects(trimmedQuery, 0, 30, {
            domains: domains.length ? domains : undefined,
          });
          if (!cancelled) {
            setProjectResults(data.results);
            setTotal(data.total);
          }
        }
      } catch (err: any) {
        if (err.message === "Unauthorized") {
          router.replace("/auth");
          return;
        }
        if (!cancelled) setError(err.message || "Search failed. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    activeTab,
    trimmedQuery,
    hasActiveFilters,
    designations,
    degrees,
    departments,
    skills,
    prerequisites,
    domains,
    router,
  ]);

  const addUnique = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const normalized = value.trim();
    if (!normalized) return;
    setter((prev) => (prev.includes(normalized) ? prev : [...prev, normalized]));
  };

  const removeItem = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter((prev) => prev.filter((item) => item !== value));
  };

  return (
    <div className="app-shell">
      <Header
        showEditProfile={false}
        searchTags={[]}
        searchQuery={searchQuery}
        searchSuggestions={[]}
        onSearchQueryChange={setSearchQuery}
      />

      <div className="app-body">
        <Sidebar defaultActive="search" />

        <main className="search-page">
          <div className="search-filters">
            <div className="search-filter-row">
              {activeTab === "user" && (
                <>
                  <label className="search-filter">
                    <span>Designation</span>
                    <select
                      value={designationPicker}
                      onChange={(e) => {
                        addUnique(e.target.value, setSelectedDesignations);
                        setDesignationPicker("");
                      }}
                    >
                      <option value="">Add Designation</option>
                      {DESIGNATION_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="search-filter">
                    <span>Degree</span>
                    <select
                      value={degreePicker}
                      onChange={(e) => {
                        addUnique(e.target.value, setSelectedDegrees);
                        setDegreePicker("");
                      }}
                    >
                      <option value="">Add Degree</option>
                      {DEGREE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="search-filter">
                    <span>Department</span>
                    <select
                      value={departmentPicker}
                      onChange={(e) => {
                        addUnique(e.target.value, setSelectedDepartments);
                        setDepartmentPicker("");
                      }}
                    >
                      <option value="">Add Department</option>
                      {DEPARTMENT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="search-filter">
                    <span>Skill</span>
                    <select
                      value={skillPicker}
                      onChange={(e) => {
                        addUnique(e.target.value, setSelectedSkills);
                        setSkillPicker("");
                      }}
                    >
                      <option value="">Add Skill</option>
                      {SKILL_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              {activeTab === "recruitment" && (
                <>
                  <label className="search-filter">
                    <span>Designation</span>
                    <select
                      value={designationPicker}
                      onChange={(e) => {
                        addUnique(e.target.value, setSelectedDesignations);
                        setDesignationPicker("");
                      }}
                    >
                      <option value="">Add Designation</option>
                      {DESIGNATION_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="search-filter">
                    <span>Department</span>
                    <select
                      value={departmentPicker}
                      onChange={(e) => {
                        addUnique(e.target.value, setSelectedDepartments);
                        setDepartmentPicker("");
                      }}
                    >
                      <option value="">Add Department</option>
                      {DEPARTMENT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="search-filter">
                    <span>Skill</span>
                    <select
                      value={skillPicker}
                      onChange={(e) => {
                        addUnique(e.target.value, setSelectedSkills);
                        setSkillPicker("");
                      }}
                    >
                      <option value="">Add Skill</option>
                      {SKILL_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="search-filter">
                    <span>Prerequisite</span>
                    <select
                      value={prerequisitePicker}
                      onChange={(e) => {
                        addUnique(e.target.value, setSelectedPrerequisites);
                        setPrerequisitePicker("");
                      }}
                    >
                      <option value="">Add Prerequisite</option>
                      {PREREQUISITE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              {activeTab === "project" && (
                <label className="search-filter">
                  <span>Domain</span>
                  <select
                    value={domainPicker}
                    onChange={(e) => {
                      addUnique(e.target.value, setSelectedDomains);
                      setDomainPicker("");
                    }}
                  >
                    <option value="">Add Domain</option>
                    {DOMAIN_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="search-selected">
              {activeTab === "user" && (
                <>
                  {designations.length > 0 && (
                    <div className="search-selected-line">
                      {designations.map((item) => (
                        <span key={`designation-${item}`} className="search-chip">
                          Designation: {item}
                          <button
                            onClick={() => removeItem(item, setSelectedDesignations)}
                            aria-label={`Remove ${item}`}
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {degrees.length > 0 && (
                    <div className="search-selected-line">
                      {degrees.map((item) => (
                        <span key={`degree-${item}`} className="search-chip">
                          Degree: {item}
                          <button
                            onClick={() => removeItem(item, setSelectedDegrees)}
                            aria-label={`Remove ${item}`}
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {departments.length > 0 && (
                    <div className="search-selected-line">
                      {departments.map((item) => (
                        <span key={`department-${item}`} className="search-chip">
                          Department: {item}
                          <button
                            onClick={() => removeItem(item, setSelectedDepartments)}
                            aria-label={`Remove ${item}`}
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {skills.length > 0 && (
                    <div className="search-selected-line">
                      {skills.map((item) => (
                        <span key={`skill-${item}`} className="search-chip">
                          Skill: {item}
                          <button
                            onClick={() => removeItem(item, setSelectedSkills)}
                            aria-label={`Remove ${item}`}
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === "recruitment" && (
                <>
                  {designations.length > 0 && (
                    <div className="search-selected-line">
                      {designations.map((item) => (
                        <span key={`designation-${item}`} className="search-chip">
                          Designation: {item}
                          <button
                            onClick={() => removeItem(item, setSelectedDesignations)}
                            aria-label={`Remove ${item}`}
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {departments.length > 0 && (
                    <div className="search-selected-line">
                      {departments.map((item) => (
                        <span key={`department-${item}`} className="search-chip">
                          Department: {item}
                          <button
                            onClick={() => removeItem(item, setSelectedDepartments)}
                            aria-label={`Remove ${item}`}
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {skills.length > 0 && (
                    <div className="search-selected-line">
                      {skills.map((item) => (
                        <span key={`skill-${item}`} className="search-chip">
                          Skill: {item}
                          <button
                            onClick={() => removeItem(item, setSelectedSkills)}
                            aria-label={`Remove ${item}`}
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {prerequisites.length > 0 && (
                    <div className="search-selected-line">
                      {prerequisites.map((item) => (
                        <span key={`prerequisite-${item}`} className="search-chip">
                          Prerequisite: {item}
                          <button
                            onClick={() => removeItem(item, setSelectedPrerequisites)}
                            aria-label={`Remove ${item}`}
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === "project" && domains.length > 0 && (
                <div className="search-selected-line">
                  {domains.map((item) => (
                    <span key={`domain-${item}`} className="search-chip">
                      Domain: {item}
                      <button
                        onClick={() => removeItem(item, setSelectedDomains)}
                        aria-label={`Remove ${item}`}
                      >
                        x
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="search-tabs" role="tablist">
            {([
              { key: "recruitment" as TabType, label: "Recruitments", icon: <RecruitIcon /> },
              { key: "project" as TabType, label: "Projects", icon: <ProjectIcon /> },
              { key: "user" as TabType, label: "Users", icon: <UserIcon /> },
            ]).map(({ key, label, icon }) => (
              <button
                key={key}
                role="tab"
                aria-selected={activeTab === key}
                className={`search-tabs__btn${activeTab === key ? " search-tabs__btn--active" : ""}`}
                onClick={() => setActiveTab(key)}
              >
                {icon} {label}
                {activeTab === key && (trimmedQuery || hasActiveFilters) && (
                  <span className="search-tabs__count">({total})</span>
                )}
              </button>
            ))}
          </div>

          <div className="cards-grid" role="tabpanel">
            {!trimmedQuery && !hasActiveFilters ? (
              <div className="search-empty">
                <p className="search-empty__text">
                  Type in the search bar or choose filters to find recruitments, projects, and users.
                </p>
              </div>
            ) : loading ? (
              <p style={{ color: "#888", gridColumn: "1 / -1" }}>Searching...</p>
            ) : error ? (
              <p style={{ color: "#c0392b", gridColumn: "1 / -1" }}>{error}</p>
            ) : activeTab === "recruitment" ? (
              recruitmentResults.length === 0 ? (
                <p style={{ color: "#888", gridColumn: "1 / -1" }}>
                  No recruitment posts match your search.
                </p>
              ) : (
                recruitmentResults.map((r) => (
                  <RecruitmentCard
                    key={r.id}
                    id={r.id}
                    title={r.title}
                    recruiter={r.creator_name || "Unknown Recruiter"}
                    designation={r.status === "Open" ? "Open Recruitment" : "Closed Recruitment"}
                    fields={r.domains}
                    prerequisites={r.prerequisites}
                  />
                ))
              )
            ) : activeTab === "project" ? (
              projectResults.length === 0 ? (
                <p style={{ color: "#888", gridColumn: "1 / -1" }}>
                  No projects match your search.
                </p>
              ) : (
                projectResults.map((p) => (
                  <ProjectsCard
                    key={p.id}
                    id={p.id}
                    title={p.title}
                    author={p.creator_name || "Unknown Author"}
                    designation="Project Lead"
                    fields={p.domains}
                    description={p.summary}
                  />
                ))
              )
            ) : userResults.length === 0 ? (
              <p style={{ color: "#888", gridColumn: "1 / -1" }}>
                No users match your search.
              </p>
            ) : (
              userResults.map((u) => (
                <Link
                  key={u.id}
                  href={`/profilePage?id=${u.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <UserCard
                    name={u.fullname || u.iitk_email}
                    designation={u.designation}
                    department={u.department}
                    organisation="IIT Kanpur"
                    image={toAbsoluteUrl(u.profile_picture_url)}
                  />
                </Link>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SearchPage;
