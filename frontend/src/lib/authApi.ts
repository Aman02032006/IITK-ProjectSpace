import { saveToken, removeToken } from "@/lib/token";

const API = "http://127.0.0.1:8000/auth";

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ iitk_email: email, password: password }),
  });
  if (!res.ok) throw new Error("Login failed");
  const data = await res.json();

  // Persist token so all subsequent API calls can use it
  if (data.access_token) {
    saveToken(data.access_token);
  }

  return data;
}

export async function logoutUser() {
  removeToken();
}

export async function requestRegistrationOTP(email: string, fullname: string) {
  const res = await fetch(`${API}/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ iitk_email: email, fullname: fullname }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to send OTP");
  return data;
}

export async function requestResetOTP(email: string) {
  const res = await fetch(`${API}/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ iitk_email: email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to send OTP");
  return data;
}

export async function checkOTP(email: string, otp: string, purpose: "register") {
  const res = await fetch(`${API}/check-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ iitk_email: email, otp_code: otp, purpose: purpose }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Invalid OTP");
  return data;
}

export async function finalizeRegistration(email: string, otp: string, password: string) {
  const res = await fetch(`${API}/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ iitk_email: email, otp_code: otp, password: password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Registration failed");
  return data;
}

export async function finalizePasswordReset(email: string, otp: string, newPassword: string) {
  const res = await fetch(`${API}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ iitk_email: email, otp_code: otp, new_password: newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Password reset failed");
  return data;
}