"use client";
import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import "./AlertPopup.css";

// Props for AlertPopup component
type AlertPopupProps = {
  message: string;
  type: "success" | "error";
  onClose: () => void;
};

// Modal alert popup component
const AlertPopup = ({ message, type, onClose }: AlertPopupProps) => {
  // Prevents background scrolling when popup is open
  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalStyle;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Renders popup using React portal
  return createPortal(
    <div className="alert-backdrop">
      <div className={`alert-card ${type}`}>
        <h2 className="alert-heading">
          {type === "success" ? "Success!" : "Wait a minute..."}
        </h2>
        <p className="alert-message">{message}</p>
        <button className="primary-btn" onClick={onClose}>
          Okay
        </button>
      </div>
    </div>,
    document.body
  );
};

export default AlertPopup;
