"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "./AuthCallbackPage.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

// Chuẩn hóa đường dẫn Redirect cho các role
const ROLE_REDIRECTS = {
  Interviewee: "/interview-booking",
  INTERVIEWEE: "/interview-booking",
  Interviewer: "/interviewer/dashboard",
  INTERVIEWER: "/interviewer/dashboard",
  Admin: "/admin/users",
  ADMIN: "/admin/users",
};

// SỬA LỖI 1: Hàm chuẩn hóa tên Role (Thay equalsIgnoreCase bằng toLowerCase)
const normalizeRole = (roleStr) => {
  if (!roleStr) return "Interviewee";
  const cleanRole = roleStr.replace("ROLE_", "");
  if (cleanRole.toLowerCase() === "interviewer") {
    return "Interviewer";
  }
  return cleanRole;
};

const decodeJwtPayload = (token) => {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

// SỬA LỖI 2: Lưu Token an toàn vào LocalStorage cho tất cả các trang đọc được
const storeAuthResponse = (data) => {
  // Lấy token từ mọi field có thể có của Backend
  const tokenValue = data.accessToken || data.token || data.jwt;

  if (tokenValue) {
    localStorage.setItem("accessToken", tokenValue);
    localStorage.setItem("token", tokenValue); // Lưu thêm key dự phòng
  }

  if (data.refreshToken) {
    localStorage.setItem("refreshToken", data.refreshToken);
  }

  localStorage.setItem(
    "user",
    JSON.stringify({
      email: data.email,
      userName: data.userName,
      fullName: data.fullName,
      role: data.role,
      isStripeConnected: data.isStripeConnected || false,
      stripeAccountId: data.stripeAccountId || null,
    }),
  );

  console.log(
    "✅ [AuthCallback] Đã lưu thành công Token vào LocalStorage:",
    tokenValue,
  );
};

const redirectForRole = (router, role) => {
  const target =
    ROLE_REDIRECTS[role] ||
    ROLE_REDIRECTS[normalizeRole(role)] ||
    "/interview-booking";
  router.replace(target);
};

const AuthCallbackInner = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const purpose = searchParams.get("purpose");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    userName: "",
    fullName: "",
    linkedinUrl: "",
    githubUrl: "",
    role: "Interviewer",
  });
  const [displayEmail, setDisplayEmail] = useState("");

  const handleLogin = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cleanToken = token ? token.trim() : "";
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          Authorization: cleanToken.startsWith("Bearer ")
            ? cleanToken
            : `Bearer ${cleanToken}`,
        },
      });

      if (!res.ok) throw new Error(`Login failed (${res.status})`);
      const data = await res.json();

      // Lưu auth data & token
      storeAuthResponse(data);
      redirectForRole(router, data.role);
    } catch (err) {
      console.error("❌ Login error:", err);
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => {
    if (!token || !purpose) {
      setError("Missing login information. Please try signing in again.");
      setLoading(false);
      return;
    }

    if (purpose === "AUTHENTICATION") {
      handleLogin();
      return;
    }

    if (purpose === "REGISTRATION") {
      const claims = decodeJwtPayload(token);
      setDisplayEmail(claims?.sub || "");
      setShowRegisterForm(true);
      setLoading(false);
      return;
    }

    setError("Unknown login purpose.");
    setLoading(false);
  }, [token, purpose, handleLogin]);

  const handleFieldChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const cleanToken = token ? token.trim() : "";
      const authHeader = cleanToken.startsWith("Bearer ")
        ? cleanToken
        : `Bearer ${cleanToken}`;

      const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error(
            "Registration session expired or invalid token (401). Please try logging in again.",
          );
        }
        throw new Error(`Registration failed (${res.status})`);
      }

      const data = await res.json();
      storeAuthResponse(data);
      redirectForRole(router, data.role);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-callback-root">
        <div className="auth-callback-loader">
          <div className="auth-callback-spinner" />
          <p>Signing you in…</p>
        </div>
      </div>
    );
  }

  if (error && !showRegisterForm) {
    return (
      <div className="auth-callback-root">
        <div className="auth-callback-error-box">
          <p>{error}</p>
          <button onClick={() => router.replace("/login")}>
            Back to login
          </button>
        </div>
      </div>
    );
  }

  if (showRegisterForm) {
    return (
      <div className="auth-callback-root">
        <form className="auth-register-form" onSubmit={handleRegisterSubmit}>
          <h2>Complete your profile</h2>
          <p className="auth-register-subtitle">
            Welcome! Tell us a bit more about yourself.
          </p>

          <label>
            Email
            <input type="email" value={displayEmail} disabled />
          </label>

          <label>
            Username
            <input
              type="text"
              value={form.userName}
              onChange={handleFieldChange("userName")}
              required
            />
          </label>

          <label>
            Full name
            <input
              type="text"
              value={form.fullName}
              onChange={handleFieldChange("fullName")}
              required
            />
          </label>

          <label>
            LinkedIn URL
            <input
              type="url"
              value={form.linkedinUrl}
              onChange={handleFieldChange("linkedinUrl")}
              placeholder="https://linkedin.com/in/..."
            />
          </label>

          <label>
            GitHub URL
            <input
              type="url"
              value={form.githubUrl}
              onChange={handleFieldChange("githubUrl")}
              placeholder="https://github.com/..."
            />
          </label>

          <fieldset className="auth-role-fieldset">
            <legend>I am joining as a...</legend>
            <label className="auth-role-option">
              <input
                type="radio"
                name="role"
                value="Interviewee"
                checked={form.role === "Interviewee"}
                onChange={handleFieldChange("role")}
              />
              Interviewee (looking for mock interviews)
            </label>
            <label className="auth-role-option">
              <input
                type="radio"
                name="role"
                value="Interviewer"
                checked={form.role === "Interviewer"}
                onChange={handleFieldChange("role")}
              />
              Interviewer (offering mock interviews)
            </label>
          </fieldset>

          {error && <p className="auth-register-error">{error}</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? "Creating account..." : "Complete sign up"}
          </button>
        </form>
      </div>
    );
  }

  return null;
};

const AuthCallbackPage = () => (
  <Suspense fallback={<div className="auth-callback-root" />}>
    <AuthCallbackInner />
  </Suspense>
);

export default AuthCallbackPage;
