"use client";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./otpPopUp.css";

// Props for OTP popup component
type OtpPopUpProps = {
  message: string;
  onVerify: (otp: string) => void;
  onClose: () => void;
};

// OTP verification modal component
const OtpPopUp = ({ message, onVerify, onClose }: OtpPopUpProps) => {
  // Stores OTP input value
  const [otp, setOtp] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Handles verify button click
  const handleVerifyClick = () => {
    if(otp.length !== 6) return;
    onVerify(otp);
  }

  // Disables background scroll and adds Escape key listener
  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (otp.length === 6) {
          onVerify(otp);
        }
      }
    };
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => inputRef.current?.focus());
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalStyle;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, onVerify, otp]);

  // Render popup using React portal
  return createPortal(
    <div className="otp-backdrop">
      <form className="otp-card" onSubmit={(e) => { e.preventDefault(); handleVerifyClick(); }}>
        <h2 className="otp-heading">OTP Verification</h2>
        <p className="otp-message">{message}</p>

        <label>Enter OTP</label>
        <input
          ref={inputRef}
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="6-digit OTP"
          autoFocus
        />

        <button type="submit" className="primary-btn">
          Verify
        </button>
      </form>
    </div>,
    document.body
  );
};

export default OtpPopUp;
