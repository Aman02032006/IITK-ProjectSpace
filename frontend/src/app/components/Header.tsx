"use client";
import React, { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import "./Header.css";

/* ── Types ── */
export interface HeaderProps {
  showEditProfile?: boolean;
  editHref?: string;
  editLabel?: string;
  searchTags?: string[];
  searchQuery?: string;
  searchSuggestions?: string[];
  onTagAdd?: (tag: string) => void;
  onTagRemove?: (tag: string) => void;
  onSearchQueryChange?: (q: string) => void;
  onSearchKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/* ── Icons ── */
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);


const XSmall = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const XMedium = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/* ── Component ── */
const Header: React.FC<HeaderProps> = ({
  showEditProfile = false,
  editHref,           
  editLabel = "Edit",
  searchTags,
  searchQuery = "",
  searchSuggestions = [],
  onTagAdd,
  onTagRemove,
  onSearchQueryChange,
  onSearchKeyDown,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const currentParams = useSearchParams();

  const isSearchMode = searchTags !== undefined;
  const [localValue, setLocalValue] = useState("");
  const [showDrop, setShowDrop] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const submitSearch = useCallback((rawQuery: string) => {
    const query = rawQuery.trim();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    const currentTab = currentParams.get("tab");
    if (currentTab) params.set("tab", currentTab);
    const target = params.toString() ? `/searchPage?${params.toString()}` : "/searchPage";
    if (pathname === "/searchPage") router.replace(target);
    else router.push(target);
  }, [currentParams, pathname, router]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node))
        setShowDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (isSearchMode || pathname === "/searchPage") return;
    const query = localValue.trim();
    if (!query) return;
    const timer = setTimeout(() => submitSearch(query), 300);
    return () => clearTimeout(timer);
  }, [isSearchMode, pathname, localValue, submitSearch]);

  const filteredSuggestions = searchSuggestions.filter(
    (t) => t.toLowerCase().includes(searchQuery.toLowerCase()) && !(searchTags ?? []).includes(t)
  );

  const hasTags = (searchTags ?? []).length > 0;

  return (
    <header className="header">
      {/* Logo */}
      <div className="header__logo">
        <img src="/Logo.png" alt="Logo" />
      </div>

      {/* Search */}
      <div className="header__search-wrapper" ref={wrapperRef}>
        <span className="header__search-icon"><SearchIcon /></span>

        <div className={`header__search-bar${isSearchMode && hasTags ? " header__search-bar--has-tags" : ""}`}>
          {/* Tag pills */}
          {isSearchMode && (searchTags ?? []).map((tag) => (
            <span key={tag} className="header__tag-pill">
              {tag}
              <button className="header__tag-remove"
                onMouseDown={(e) => { e.preventDefault(); onTagRemove?.(tag); }}
                aria-label={`Remove ${tag}`}>
                <XSmall />
              </button>
            </span>
          ))}

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            className="header__search-input"
            placeholder={
              isSearchMode
                ? hasTags ? "Add more tags…" : "Search"
                : "Search"
            }
            value={isSearchMode ? searchQuery : localValue}
            onChange={(e) => {
              if (isSearchMode) { onSearchQueryChange?.(e.target.value); setShowDrop(true); }
              else setLocalValue(e.target.value);
            }}
            onFocus={() => isSearchMode && setShowDrop(true)}
            onKeyDown={onSearchKeyDown}
            onKeyUp={(e) => {
              if (onSearchKeyDown || e.key !== "Enter") return;
              submitSearch((isSearchMode ? searchQuery : localValue) ?? "");
            }}
            autoComplete="off"
            spellCheck={false}
          />

          {/* Clear */}
          {isSearchMode && (hasTags || searchQuery) && (
            <button className="header__search-clear"
              onMouseDown={(e) => {
                e.preventDefault();
                (searchTags ?? []).forEach((t) => onTagRemove?.(t));
                onSearchQueryChange?.("");
                inputRef.current?.focus();
              }}
              aria-label="Clear all">
              <XMedium />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {isSearchMode && showDrop && filteredSuggestions.length > 0 && (
          <div className="header__suggestions">
            <p className="header__suggestions-label">Suggested Tags</p>
            {filteredSuggestions.map((tag) => (
              <button key={tag} className="header__suggestions-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onTagAdd?.(tag);
                  onSearchQueryChange?.("");
                  setShowDrop(false);
                  inputRef.current?.focus();
                }}>
                <span className="header__suggestions-dot" />{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Profile page edit button */}
      {/* Edit Profile */}
      {showEditProfile && (
        <Link href="/profilePage/editProfilePage" className="header__edit-btn">
          Edit Profile
        </Link>
      )}

      {/* edit button for project / recruitment pages */}
      {editHref && (
        <Link href={editHref} className="header__edit-btn">
          {editLabel}
        </Link>
      )}
    </header>
  );
};

export default Header;
