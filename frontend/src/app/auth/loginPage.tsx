"use client";
import React, { useState } from "react";
import "./loginPage.css";
import OtpPopUp from "./otpPopUp";
import { requestOTP,checkOTP, verifyOTP, registerUser } from "../../lib/authApi";



type Mode =
  | "login"
  | "register-step1"
  | "register-password"
  | "forgot-email"
  | "forgot-reset";

const loginPage = () => {
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verifiedOtp, setVerifiedOtp] = useState("");
  const [mode, setMode] = useState<Mode>("login");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpPurpose, setOtpPurpose] =
    useState<"register" | "forgot" | null>(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const showTabs =
    mode === "login" ||
    mode === "register-step1" ||
    mode === "register-password";

  const openOtp = async (purpose: "register" | "forgot") => {
  try {
    if (!email || !fullname) {
      alert("Please enter email and name first");
      return;
    }

    const res = await requestOTP(email, fullname);

    if (res.message) {
      setOtpPurpose(purpose);
      setShowOtpModal(true);
    }

  } catch (err) {
    console.error(err);
    alert("Failed to send OTP");
  }
};

  const handleOtpVerify = async (otp: string) => {
  try {
    const res = await checkOTP(email, otp);

    if (res.message === "OTP is valid.") {
      setShowOtpModal(false);
      setVerifiedOtp(otp);
      if (otpPurpose === "register") {
        setMode("register-password");
      } else {
        setMode("forgot-reset");
      }
    }

  } catch (err) {
    alert("Invalid or expired OTP");
  }
};
const handleRegister = async () => {
  try {
    const res = await registerUser(email, fullname, password);

    if (res) {
      await verifyOTP(email, verifiedOtp);

      alert("Account created successfully!");
      setMode("login");
    }
  } catch (err) {
    console.error(err);
    alert("Registration failed");
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
            <input placeholder="Enter your full name" value={fullname} onChange={(e) => setFullname(e.target.value)}/>

            <label>IITK Email ID</label>
            <input placeholder="Enter your IITK Email ID" value={email} onChange={(e) => setEmail(e.target.value)} />

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
            <input value={fullname} disabled />

            <label>IITK Email ID</label>
            <input value={email} disabled />

            <label>New Password</label>
            <input type="password" placeholder="Create a strong password" value={password} onChange={(e) => setPassword(e.target.value)} />

            <label>Confirm Password</label>
            <input  type="password" placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}/>
            <button className="primary-btn" onClick={handleRegister}>
  Register
</button>
          </>
        )}

        {/* Forgot Password #1 */}
        {mode === "forgot-email" && (
          <>
            <h1 className = "section-title">Verify Email</h1>
            <p className = "instruction-text">Enter your IITK email to proceed.</p>
            
            <label>IITK Email ID</label>
            <input type="email" placeholder="username@iitk.ac.in" />

            <button className = "primary-btn" onClick={ () => openOtp("forgot")}>
              Next
            </button>
            
            <p className="link" onClick={() => setMode("login")}>
              Go Back
            </p>
          </>
        )}

        {/* Forgot PAssword #2 */}
        {mode === "forgot-reset" && (
          <>
            <h3 className="section-title">Set New Password</h3>
            
            <label>New Password</label>
            <input type="password" placeholder="Enter new password" />

            <label>Confirm Password</label>
            <input type="password" placeholder="Confirm new password" />

            <button className="primary-btn" onClick={() => alert("Password Changed!")}>
              Update Password
            </button>
            
            <p className="link" onClick={() => setMode("login")}>
              Back to Login
            </p>
          </>
        )}

        {/* OTP PopUp */}
        {showOtpModal && (
          <OtpPopUp
            message={
              otpPurpose === "register"
                ? "An OTP has been sent to your entered email address."
                : "Enter the OTP sent to your registered mail to reset your password."
            }
            onVerify={handleOtpVerify}
            onClose={() => setShowOtpModal(false)}
          />
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