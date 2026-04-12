"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SEARCH_INPUT_SELECTOR = ".header__search-input";
const FIELD_SELECTOR =
  'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"]';

const isEditableElement = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"]'
    )
  );
};

const isVisible = (element: HTMLElement) =>
  element.getClientRects().length > 0 &&
  getComputedStyle(element).visibility !== "hidden";

const isHeaderSearchInput = (element: HTMLElement) =>
  element.classList.contains("header__search-input");

const pickVisibleField = (
  selector: string,
  includeHeaderSearch: boolean
) => {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return (
    candidates.find(
      (element) =>
        isVisible(element) &&
        (includeHeaderSearch || !isHeaderSearchInput(element))
    ) ?? null
  );
};

const focusPreferredInput = (pathname: string) => {
  const prefersSearch = pathname === "/home-page" || pathname === "/search-page";
  const preferredSearchInput = prefersSearch
    ? document.querySelector<HTMLInputElement>(SEARCH_INPUT_SELECTOR)
    : null;

  const target =
    preferredSearchInput ??
    pickVisibleField(`main ${FIELD_SELECTOR}`, false) ??
    pickVisibleField(FIELD_SELECTOR, false);
  if (!target) return;

  target.focus();
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    target.select();
  }
};

const GlobalKeyboardShortcuts = () => {
  const pathname = usePathname();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      const key = event.key;
      const editable = isEditableElement(event.target);

      if (
        key === "/" &&
        !editable &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        event.preventDefault();
        focusPreferredInput(pathname);
        return;
      }

      if (editable || event.metaKey || event.ctrlKey || event.altKey) return;

      if (key === "ArrowDown") {
        event.preventDefault();
        window.scrollBy({ top: 72, behavior: "smooth" });
        return;
      }

      if (key === "ArrowUp") {
        event.preventDefault();
        window.scrollBy({ top: -72, behavior: "smooth" });
        return;
      }

      if (key === "PageDown") {
        event.preventDefault();
        window.scrollBy({ top: window.innerHeight, behavior: "smooth" });
        return;
      }

      if (key === "PageUp") {
        event.preventDefault();
        window.scrollBy({ top: -window.innerHeight, behavior: "smooth" });
        return;
      }

      if (key === "Home") {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      if (key === "End") {
        event.preventDefault();
        const maxHeight = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight
        );
        window.scrollTo({ top: maxHeight, behavior: "smooth" });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pathname]);

  return null;
};

export default GlobalKeyboardShortcuts;
