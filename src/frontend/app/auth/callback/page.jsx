"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "./AuthCallbackPage.css";

// TODO: confirm this matches wherever the backend is actually reachable
// from the browser (same value used elsewhere).
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

// TODO: confirm the real interviewer dashboard route once that page exists.
const ROLE_REDIRECTS = {
  Interviewee: "/interview-booking",
  Interviewer: "/interviewer/dashboard",
  Admin: "/interview-booking", // TODO: confirm admin landing page
};

// Decodes the middle segment of a JWT for DISPLAY ONLY (prefilling the
// email field). This does not verify the signature — the backend is the
// only place that actually validates the temp token's authenticity.
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

// TODO: confirm storage strategy (localStorage vs httpOnly cookie) matches
// how the rest of the app reads auth state / attaches Authorization headers
// on subsequent API calls.
const storeAuthResponse = (data) => {
  localStorage.setItem("accessToken", data.accessToken);
  localStorage.setItem("refreshToken", data.refreshToken);
  localStorage.setItem(
    "user",
    JSON.stringify({
      email: data.email,
      userName: data.userName,
      fullName: data.fullName,
      role: data.role,
    }),
  );
};

const redirectForRole = (router, role) => {
  const target = ROLE_REDIRECTS[role] || "/interview-booking";
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
    role: "Interviewee",
  });
  const [displayEmail, setDisplayEmail] = useState("");

  const handleLogin = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Login failed (${res.status})`);
      const data = await res.json();
      storeAuthResponse(data);
      redirectForRole(router, data.role);
    } catch (err) {
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
      // RegisterRequest has no `email` field — backend derives email from
      // the temp token's `sub` claim, so it isn't sent here.
      const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`Registration failed (${res.status})`);
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

// useSearchParams requires a Suspense boundary in the app router.
const AuthCallbackPage = () => (
  <Suspense fallback={<div className="auth-callback-root" />}>
    <AuthCallbackInner />
  </Suspense>
);

export default AuthCallbackPage;
