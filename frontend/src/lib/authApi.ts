const API = "http://127.0.0.1:8000/auth";

export async function requestOTP(email: string, fullname: string) {
  const res = await fetch(`${API}/request-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      iitk_email: email,
      fullname: fullname,
    }),
  });

  return res.json();
}
export async function checkOTP(email: string, otp: string) {
  const res = await fetch(`${API}/check-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      iitk_email: email,
      otp_code: otp,
      purpose: "register",
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail);
  }

  return data;
}

export async function registerUser(
  email: string,
  fullname: string,
  password: string
) {
  const res = await fetch(`${API}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fullname: fullname,
      iitk_email: email,
      password: password,
    }),
  });

  return res.json();
}
export async function verifyOTP(email: string, otp: string) {
  const res = await fetch(`${API}/verify-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      iitk_email: email,
      otp_code: otp,
    }),
  });

  return res.json();
}