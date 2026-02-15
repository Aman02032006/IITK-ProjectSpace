import React, { useState } from "react";
import "./loginPage.css";

type Mode =
  | "login"
  | "register-step1"
  | "register-password"
  | "forgot-email"
  | "forgot-reset";

const loginPage = () => {
  const [mode, setMode] = useState<Mode>("login");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpPurpose, setOtpPurpose] =
    useState<"register" | "forgot" | null>(null);

  const showTabs =
    mode === "login" ||
    mode === "register-step1" ||
    mode === "register-password";

  const openOtp = (purpose: "register" | "forgot") => {
    setOtpPurpose(purpose);
    setShowOtpModal(true);
  };

  const handleOtpVerify = () => {
    setShowOtpModal(false);

    if (otpPurpose === "register") {
      setMode("register-password");
    } else {
      setMode("forgot-reset");
    }
  };

  return (
    <div className="auth-container">
      <div className="bg-image"></div>
      <div className="bg-overlay"></div>

      <div className={`auth-card ${mode !== "login" ? "expanded" : ""}`}>
        <h1 className="welcome-title">Welcome</h1>

        {showTabs && (
          <div className="toggle">
            <button
              className={mode === "login" ? "active" : ""}
              onClick={() => setMode("login")}
            >
              Login
            </button>
            <button
              className={mode.startsWith("register") ? "active" : ""}
              onClick={() => setMode("register-step1")}
            >
              Register
            </button>
          </div>
        )}

        {/* LOGIN */}
        {mode === "login" && (
          <>
            <label>Username / IITK Email</label>
            <input placeholder="Enter your username / IITK email" />

            <label>Password</label>
            <input type="password" placeholder="Enter your password" />

            <button className="primary-btn">Login</button>

            <button className="google-btn">
              Sign in with Google
            </button>

            <p
              className="link"
              onClick={() => setMode("forgot-email")}
            >
              Forgot Password?
            </p>
          </>
        )}

        {/* REGISTER #1 */}
        {mode === "register-step1" && (
          <>
            <label>Full Name</label>
            <input placeholder="Enter your full name" />

            <label>IITK Email ID</label>
            <input placeholder="Enter your IITK Email ID" />

            <button
              className="primary-btn"
              onClick={() => openOtp("register")}
            >
              Next
            </button>
          </>
        )}

        {/* REGISTER #2 PASSWORD */}
        {mode === "register-password" && (
          <>
            <label>Full Name</label>
            <input placeholder="Enter your full name" />

            <label>IITK Email ID</label>
            <input disabled placeholder="Verified Email" />

            <label>New Password</label>
            <input type="password" placeholder="Create a strong password" />

            <label>Confirm Password</label>
            <input type="password" placeholder="Confirm your password" />

            <button className="primary-btn">Register</button>
          </>
        )}
      </div>

      <div className="hero-content">
        <img src="/Logo.png" alt="Logo" className="hero-image" />
        <h2>IITK ProjectSpace</h2>
        <p>A central stop for all project related tasks</p>
      </div>
    </div>
  );
};

export default loginPage;