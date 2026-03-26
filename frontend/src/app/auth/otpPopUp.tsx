"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import "./otpPopUp.css";

type OtpPopUpProps = {
  message: string;
  onVerify: (otp: string) => void;
  onClose: () => void;
};

const OtpPopUp = ({ message, onVerify, onClose }: OtpPopUpProps) => {
  const [otp, setOtp] = useState("");

  const handleVerifyClick = () => {
    if(otp.length !== 6) return;
    onVerify(otp);
  }
  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalStyle;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="otp-backdrop">
      <div className="otp-card">
        <h2 className="otp-heading">OTP Verification</h2>
        <p className="otp-message">{message}</p>

        <label>Enter OTP</label>
        <input
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="6-digit OTP"
        />

        <button className="primary-btn" onClick={handleVerifyClick}>
          Verify
        </button>
      </div>
    </div>,
    document.body
  );
};

export default OtpPopUp;
