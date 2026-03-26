"use client";
import React, { useState } from "react";
import "./loginPage.css";
import OtpPopUp from "./otpPopUp";
import AlertPopUp from "./AlertPopUp";
import {
  loginUser,
  requestRegistrationOTP,
  requestResetOTP,
  checkOTP,
  finalizeRegistration,
  finalizePasswordReset,
} from "../../lib/authApi";
import { useRouter } from "next/navigation";



type Mode = "login" | "register-step1" | "register-password" | "forgot-email" | "forgot-reset";

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const LoginPage = () => {
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verifiedOtp, setVerifiedOtp] = useState("");

  const [mode, setMode] = useState<Mode>("login");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpPurpose, setOtpPurpose] = useState<"register" | "reset" | null>(null);

  const [alertConfig, setAlertConfig] = useState<{show: boolean, message: string, type: "success" | "error"}>({
    show: false,
    message: "",
    type: "success"
  });

  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter();

  const showTabs = mode === "login" || mode === "register-step1" || mode === "register-password";
  
    const triggerAlert = (message: string, type: "success" | "error") => {
      setAlertConfig({ show: true, message, type });
    };

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
  };

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
      triggerAlert("Invalid email or password", "error");
    } finally {
      setIsLoading(false);
    }
  };

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
    } catch {
      triggerAlert("Registration failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

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
    } catch {
      triggerAlert("Failed to update password.", "error");
    } finally {
      setIsLoading(false);
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
            <input type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />

            <button className="primary-btn" onClick={handleLogin} disabled={isLoading}>
              {isLoading ? <div className="button-spinner"></div> : "Login"}
            </button>
            <button className="google-btn">Sign in with Google</button>

            <p className="link" onClick={() => !isLoading && handleModeSwitch("forgot-email")}>Forgot Password?</p>
          </>
        )}

        {/* REGISTER #1 */}
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
            
            <button className="primary-btn" onClick={handleRegister} disabled={isLoading}>
              {isLoading ? <div className="button-spinner"></div> : "Register"}
            </button>
          </>
        )}

        {/* Forgot Password #1 */}
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

        {/* Forgot PAssword #2 */}
        {mode === "forgot-reset" && (
          <>
            <h3 className="section-title">Set New Password</h3>
            
            <label>New Password</label>
            <input type="password" placeholder="Enter new password" value={password} onChange={(e) => setPassword(e.target.value)} />

            <label>Confirm Password</label>
            <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />

            <button className="primary-btn" onClick={handlePasswordReset} disabled={isLoading}>
              {isLoading ? <div className="button-spinner"></div> : "Update Password"}
            </button>
            
            <p className="link" onClick={() => !isLoading && handleModeSwitch("login")}>Back to Login</p>
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

        {/* NEW: Custom Alert PopUp */}
        {alertConfig.show && (
          <AlertPopUp 
            message={alertConfig.message} 
            type={alertConfig.type} 
            onClose={() => setAlertConfig({ ...alertConfig, show: false })} 
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

export default LoginPage;
