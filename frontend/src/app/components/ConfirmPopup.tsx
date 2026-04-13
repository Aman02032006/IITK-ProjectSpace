"use client";
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./ConfirmPopup.css";

// Props for confirm popup component
type ConfirmPopupProps = {
  heading: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
};

// Confirmation modal component
const ConfirmPopup = ({
  heading,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isDestructive = false,
}: ConfirmPopupProps) => {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Prevents background scrolling while modal is open
  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        onConfirm();
      }
    };

    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => cancelButtonRef.current?.focus());
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalStyle;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onCancel, onConfirm]);

  // Render modal using React portal
  return createPortal(
    <div className="confirm-backdrop" role="presentation">
      <div className="confirm-card" role="dialog" aria-modal="true" aria-labelledby="confirm-popup-title">
        <h2 id="confirm-popup-title" className="confirm-heading">{heading}</h2>
        <p className="confirm-message">{message}</p>

        {/* Action buttons */}
        <div className="confirm-actions">
          <button ref={cancelButtonRef} className="confirm-btn confirm-btn--cancel" onClick={onCancel}>
            {cancelLabel}
          </button>

          <button
            className={`confirm-btn ${isDestructive ? "confirm-btn--destructive" : "confirm-btn--primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default ConfirmPopup;
