"use client";
/* eslint-disable @next/next/no-img-element */
import React, { useState } from "react";
import "./loginPage.css";
import OtpPopUp from "./otpPopUp";
import AlertPopUp from "./AlertPopUp";

// SVG icons for password visibility toggle
const EyeShow = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path d="M3.26 11.6A6.97 6.97 0 0 1 10 6c3.2 0 6.06 2.33 6.74 5.6a.5.5 0 0 0 .98-.2A7.97 7.97 0 0 0 10 5a7.97 7.97 0 0 0-7.72 6.4.5.5 0 0 0 .98.2ZM9.99 8a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z"/>
  </svg>
);

const EyeHide = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path d="M2.85 2.15a.5.5 0 1 0-.7.7l3.5 3.5a8.1 8.1 0 0 0-3.37 5.05.5.5 0 1 0 .98.2 7.09 7.09 0 0 1 3.1-4.53l1.59 1.59a3.5 3.5 0 1 0 4.88 4.88l4.32 4.31a.5.5 0 0 0 .7-.7l-15-15ZM10.12 8l3.37 3.37A3.5 3.5 0 0 0 10.12 8ZM7.53 5.41l.8.8C8.87 6.07 9.43 6 10 6c3.2 0 6.06 2.33 6.74 5.6a.5.5 0 1 0 .98-.2A7.97 7.97 0 0 0 10 5c-.86 0-1.69.14-2.47.41Z"/>
  </svg>
);
import {
  loginUser,
  requestRegistrationOTP,
  requestResetOTP,
  checkOTP,
  finalizeRegistration,
  finalizePasswordReset,
} from "../../lib/authApi";
import { useRouter } from "next/navigation";

// Possible UI modes for authentication flow
type Mode = "login" | "register-step1" | "register-password" | "forgot-email" | "forgot-reset";

// Helper to extract readable error messages
const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

// Main login/register component
const LoginPage = () => {
  // Form field states
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verifiedOtp, setVerifiedOtp] = useState("");

  // UI state controls
  const [mode, setMode] = useState<Mode>("login");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpPurpose, setOtpPurpose] = useState<"register" | "reset" | null>(null);

  // Alert popup configuration
  const [alertConfig, setAlertConfig] = useState<{show: boolean, message: string, type: "success" | "error"}>({
    show: false,
    message: "",
    type: "success"
  });

  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Loading spinner state
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter();

  // Determines if login/register toggle should be visible
  const showTabs = mode === "login" || mode === "register-step1" || mode === "register-password";
  
  // Shows alert popup
  const triggerAlert = (message: string, type: "success" | "error") => {
    setAlertConfig({ show: true, message, type });
  };

  // Handles switching between modes and resets state
  const handleModeSwitch = (newMode: Mode) => {
    setMode(newMode);
    setIsLoading(false);
    setEmail("");
    setFullname("");
    setPassword("");
    setConfirmPassword("");
    setVerifiedOtp("");
    setShowOtpModal(false);
    setAlertConfig({ ...alertConfig, show: false });
    setShowLoginPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  // Login handler
  const handleLogin = async() => {
    setIsLoading(true);
    try {
      const res = await loginUser(email, password);
      if (res.access_token) {
        localStorage.setItem("access_token", res.access_token);
        triggerAlert("Login successful!", "success");
        router.replace("/profilePage");
      }
    } catch {
      setPassword("");
      triggerAlert("Invalid email or password", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Opens OTP modal for registration or password reset
  const openOtp = async (purpose: "register" | "reset") => {
    setIsLoading(true);
    try {
      if (!email) return triggerAlert("Please enter your email.", "error");
      if (purpose === "register" && !fullname) return triggerAlert("Please enter your name.", "error");

      if (purpose === "register") {
        await requestRegistrationOTP(email, fullname);
      } else {
        await requestResetOTP(email);
      }

      setOtpPurpose(purpose);
      setShowOtpModal(true);
    } catch (error: unknown) {
      triggerAlert(
        getErrorMessage(
          error,
          "Failed to send OTP. Ensure it is an @iitk.ac.in email."
        ),
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // OTP verification handler
  const handleOtpVerify = async (otp: string) => {
    if (!otpPurpose) {
      triggerAlert("OTP purpose is missing. Please request OTP again.", "error");
      return;
    }

    setIsLoading(true);
    try {
      await checkOTP(email, otp, otpPurpose); 
      setShowOtpModal(false);
      setVerifiedOtp(otp); 
      
      if (otpPurpose === "register") {
        setMode("register-password");
      } else {
        setMode("forgot-reset");
      }
    } catch {
      triggerAlert("Invalid or expired OTP", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Registration final step handler
  const handleRegister = async () => {
    setIsLoading(true);
    if (password !== confirmPassword) {
      setIsLoading(false)
      return triggerAlert("Passwords do not match!", "error");
    }
    try {
      await finalizeRegistration(email, verifiedOtp, password);
      triggerAlert("Account created successfully!", "success");
      router.replace("/profilePage");
      setPassword(""); setConfirmPassword("");
    } catch (error: unknown) {
      setPassword(""); setConfirmPassword("");
      triggerAlert(getErrorMessage(error, "Registration failed"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Password reset handler
  const handlePasswordReset = async () => {
    setIsLoading(true);
    if (password !== confirmPassword) {
      setIsLoading(false)
      return triggerAlert("Passwords do not match!", "error");
    }
    try {
      await finalizePasswordReset(email, verifiedOtp, password);
      triggerAlert("Password updated successfully!", "success");
      handleModeSwitch("login");
      setPassword(""); setConfirmPassword("");
    } catch (error: unknown) {
      setPassword(""); setConfirmPassword("");
      triggerAlert(getErrorMessage(error, "Failed to update password."), "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Background image */}
      <div className="bg-image"></div>
      {/* Overlay gradient */}
      <div className="bg-overlay"></div>

      {/* Auth card container */}
      <div className={`auth-card ${mode !== "login" ? "expanded" : ""}`}>
        <h1 className="welcome-title">Welcome</h1>

        {/* Login/Register toggle */}
        {showTabs && (
          <div className="toggle">
            <button className={mode === "login" ? "active" : ""} onClick={() => handleModeSwitch("login")}>Login</button>
            <button className={mode.startsWith("register") ? "active" : ""} onClick={() => handleModeSwitch("register-step1")}> Register </button>
          </div>
        )}

        {/* LOGIN */}
        {mode === "login" && (
          <>
            <label>Username / IITK Email</label>
            <input placeholder="Enter your username / IITK email" value={email} onChange={(e) => setEmail(e.target.value)} />
            
            <label>Password</label>
            <div className="password-wrapper">
              <input type={showLoginPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
              {password.length >= 1 && (
                <button type="button" className="password-toggle-btn" onClick={() => setShowLoginPassword(v => !v)} tabIndex={-1} title={showLoginPassword ? "Hide password" : "Show password"}>
                  {showLoginPassword ? <EyeHide /> : <EyeShow />}
                </button>
              )}
            </div>

            <button className="primary-btn" onClick={handleLogin} disabled={isLoading}>
              {isLoading ? <div className="button-spinner"></div> : "Login"}
            </button>
            <button className="google-btn">Sign in with Google</button>

            <p className="link" onClick={() => !isLoading && handleModeSwitch("forgot-email")}>Forgot Password?</p>
          </>
        )}

        {/* REGISTER STEP 1 */}
        {mode === "register-step1" && (
          <>
            <label>Full Name</label>
            <input placeholder="Enter your full name" value={fullname} onChange={(e) => setFullname(e.target.value)}/>

            <label>IITK Email ID</label>
            <input type="email" placeholder="username@iitk.ac.in" value={email} onChange={(e) => setEmail(e.target.value)}/>

            <button className="primary-btn" onClick={() => openOtp("register")} disabled={isLoading}>
              {isLoading ? <div className="button-spinner"></div> : "Next"}
            </button>
          </>
        )}

        {/* REGISTER PASSWORD STEP */}
        {mode === "register-password" && (
          <>
            <label>Full Name</label>
            <input value={fullname} disabled />

            <label>IITK Email ID</label>
            <input value={email} disabled />

            <label>New Password</label>
            <div className="password-wrapper">
              <input type={showNewPassword ? "text" : "password"} placeholder="Create a strong password" value={password} onChange={(e) => setPassword(e.target.value)} />
              {password.length >= 1 && (
                <button type="button" className="password-toggle-btn" onClick={() => setShowNewPassword(v => !v)} tabIndex={-1} title={showNewPassword ? "Hide password" : "Show password"}>
                  {showNewPassword ? <EyeHide /> : <EyeShow />}
                </button>
              )}
            </div>
            <p className="password-hint">Min. 8 characters with at least one uppercase, one lowercase, one number &amp; one special character.</p>

            <label>Confirm Password</label>
            <div className="password-wrapper">
              <input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              {confirmPassword.length >= 1 && (
                <button type="button" className="password-toggle-btn" onClick={() => setShowConfirmPassword(v => !v)} tabIndex={-1} title={showConfirmPassword ? "Hide password" : "Show password"}>
                  {showConfirmPassword ? <EyeHide /> : <EyeShow />}
                </button>
              )}
            </div>
            
            <button className="primary-btn" onClick={handleRegister} disabled={isLoading}>
              {isLoading ? <div className="button-spinner"></div> : "Register"}
            </button>
          </>
        )}

        {/* FORGOT EMAIL STEP */}
        {mode === "forgot-email" && (
          <>
            <h1 className = "section-title">Verify Email</h1>
            <p className = "instruction-text">Enter your IITK email to proceed.</p>
            
            <label>IITK Email ID</label>
            <input type="email" placeholder="username@iitk.ac.in" value={email} onChange={(e) => setEmail(e.target.value)} />

            <button className="primary-btn" onClick={() => openOtp("reset")} disabled={isLoading}>
              {isLoading ? <div className="button-spinner"></div> : "Next"}
            </button>
            
            <p className="link" onClick={() => !isLoading && handleModeSwitch("login")}>Go Back</p>
          </>
        )}

        {/* FORGOT RESET STEP */}
        {mode === "forgot-reset" && (
          <>
            <h3 className="section-title">Set New Password</h3>
            
            <label>New Password</label>
            <div className="password-wrapper">
              <input type={showNewPassword ? "text" : "password"} placeholder="Enter new password" value={password} onChange={(e) => setPassword(e.target.value)} />
              {password.length >= 1 && (
                <button type="button" className="password-toggle-btn" onClick={() => setShowNewPassword(v => !v)} tabIndex={-1} title={showNewPassword ? "Hide password" : "Show password"}>
                  {showNewPassword ? <EyeHide /> : <EyeShow />}
                </button>
              )}
            </div>
            <p className="password-hint">Min. 8 characters with at least one uppercase, one lowercase, one number &amp; one special character.</p>

            <label>Confirm Password</label>
            <div className="password-wrapper">
              <input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              {confirmPassword.length >= 1 && (
                <button type="button" className="password-toggle-btn" onClick={() => setShowConfirmPassword(v => !v)} tabIndex={-1} title={showConfirmPassword ? "Hide password" : "Show password"}>
                  {showConfirmPassword ? <EyeHide /> : <EyeShow />}
                </button>
              )}
            </div>

            <button className="primary-btn" onClick={handlePasswordReset} disabled={isLoading}>
              {isLoading ? <div className="button-spinner"></div> : "Update Password"}
            </button>
            
            <p className="link" onClick={() => !isLoading && handleModeSwitch("login")}>Back to Login</p>
          </>
        )}

        {/* OTP popup */}
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

        {/* Alert popup */}
        {alertConfig.show && (
          <AlertPopUp 
            message={alertConfig.message} 
            type={alertConfig.type} 
            onClose={() => setAlertConfig({ ...alertConfig, show: false })} 
          />
        )}
      </div>

      {/* Right side hero section */}
      <div className="hero-content">
        <img src="/Logo.png" alt="Logo" className="hero-image" />
        <h2>IITK ProjectSpace</h2>
        <p>A central stop for all project related tasks</p>
      </div>
    </div>
  );
};

export default LoginPage;
