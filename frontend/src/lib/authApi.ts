import { saveToken, removeToken } from "@/lib/token";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const API = `${BASE_URL}/auth`;

type ApiErrorData = {
  detail?: string | Array<{ msg?: string }>;
} | null;

const extractError = (data: ApiErrorData, fallbackMsg: string) => {
  if (!data || !data.detail) return fallbackMsg;
  if (typeof data.detail === "string") return data.detail; // Custom HTTPExceptions
  if (Array.isArray(data.detail) && data.detail[0]?.msg) {
    let msg = data.detail[0].msg;
    if (msg.startsWith("Value error, ")) {
      msg = msg.replace("Value error, ", "");
    }
    return msg;
  } // Pydantic validation errors
  return fallbackMsg;
};

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ iitk_email: email, password: password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error("Login failed");

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
  if (!res.ok) throw new Error(extractError(data, "Failed to send OTP"));
  return data;
}

export async function requestResetOTP(email: string) {
  const res = await fetch(`${API}/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ iitk_email: email }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Failed to send OTP"));
  return data;
}

export async function checkOTP(email: string, otp: string, purpose: "register" | "reset") {
  const res = await fetch(`${API}/check-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ iitk_email: email, otp_code: otp, purpose: purpose }),
  });
  
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Invalid OTP"));
  return data;
}

export async function finalizeRegistration(email: string, otp: string, password: string) {
  const res = await fetch(`${API}/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ iitk_email: email, otp_code: otp, password: password }),
  });
  
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Registration failed"));
  return data;
}

export async function finalizePasswordReset(email: string, otp: string, newPassword: string) {
  const res = await fetch(`${API}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ iitk_email: email, otp_code: otp, new_password: newPassword }),
  });
  
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data, "Password reset failed"));
  return data;
}
