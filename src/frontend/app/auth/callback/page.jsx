"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "./AuthCallbackPage.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const ROLE_REDIRECTS = {
  Interviewee: "/interview-booking",
  INTERVIEWEE: "/interview-booking",
  Interviewer: "/interviewer/dashboard",
  INTERVIEWER: "/interviewer/dashboard",
  Admin: "/admin/users",
  ADMIN: "/admin/users",
};

const normalizeRole = (roleStr) => {
  if (!roleStr) return "Interviewee";
  const cleanRole = roleStr.replace("ROLE_", "");
  if (cleanRole.toLowerCase() === "interviewer") return "Interviewer";
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

// 1. CHỈ TÌM ACCESS TOKEN (Không lấy nhầm Refresh Token)
const extractAccessToken = (data = {}) => {
  const candidates = [
    data.accessToken,
    data.access_token,
    data.token,
    data.jwt,
    data.authToken,
    data.authorization,
  ];

  const token = candidates.find(
    (value) => typeof value === "string" && value.trim(),
  );

  return token
    ? String(token)
        .replace(/^"(.*)"$/, "$1")
        .trim()
    : "";
};

// 2. CHỈ TÌM REFRESH TOKEN
const extractRefreshToken = (data = {}) => {
  const candidates = [
    data.refreshToken,
    data.refresh_token,
    data.refreshTokenValue,
  ];

  const token = candidates.find(
    (value) => typeof value === "string" && value.trim(),
  );

  return token
    ? String(token)
        .replace(/^"(.*)"$/, "$1")
        .trim()
    : "";
};

// 3. LƯU TOKEN RÕ RÀNG, CHÍNH XÁC VÀO LOCALSTORAGE
const storeAuthResponse = (data = {}) => {
  const accessToken = extractAccessToken(data);
  const refreshToken = extractRefreshToken(data);

  if (accessToken) {
    // Lưu Access Token thống nhất vào các key chuẩn
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("token", accessToken);
    localStorage.setItem("jwt", accessToken);
    localStorage.setItem("authToken", accessToken);
    localStorage.setItem("access_token", accessToken);
  }

  if (refreshToken) {
    // CHỈ lưu đúng Refresh Token vào key refreshToken
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("refresh_token", refreshToken);
  } else {
    // Nếu response đăng nhập không trả lại refreshToken mới, giữ nguyên hoặc không đè Access Token lên!
    console.warn("No refreshToken provided in auth response");
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
};

// 4. LẤY ACCESS TOKEN SẠCH ĐỂ GỬI REQUEST
const getStoredAccessToken = () => {
  if (typeof window === "undefined") return "";

  const savedToken =
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("access_token") ||
    "";

  return String(savedToken)
    .replace(/^"(.*)"$/, "$1")
    .trim();
};

const authHeaders = (token) => {
  const normalizedToken = String(token || getStoredAccessToken()).trim();

  if (!normalizedToken) {
    return {};
  }

  return {
    Authorization: normalizedToken.startsWith("Bearer ")
      ? normalizedToken
      : `Bearer ${normalizedToken}`,
  };
};

const isInterviewerProfileIncomplete = (profile) => {
  if (!profile) return true;
  return (
    !profile.title?.trim() || !profile.company?.trim() || !profile.bio?.trim()
  );
};

const InterviewerDetailsFields = ({ values, onChange }) => (
  <fieldset className="auth-interviewer-fieldset">
    <legend>Interviewer details</legend>
    <p className="auth-interviewer-note">
      This information will be shown to candidates browsing mentors.
    </p>

    <label>
      Job title
      <input
        type="text"
        value={values.title}
        onChange={onChange("title")}
        placeholder="e.g. Senior Backend Developer"
        required
      />
    </label>

    <label>
      Company
      <input
        type="text"
        value={values.company}
        onChange={onChange("company")}
        placeholder="e.g. FPT Software"
        required
      />
    </label>

    <label>
      Years of experience
      <input
        type="number"
        min={0}
        value={values.yearsExperience}
        onChange={onChange("yearsExperience")}
      />
    </label>

    <label>
      About you
      <textarea
        rows={4}
        value={values.bio}
        onChange={onChange("bio")}
        placeholder="Tell candidates a bit about your background and interview style."
      />
    </label>
  </fieldset>
);

const AuthCallbackInner = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const purpose = searchParams.get("purpose");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [mode, setMode] = useState(null);
  const [displayEmail, setDisplayEmail] = useState("");

  const [form, setForm] = useState({
    userName: "",
    fullName: "",
    linkedinUrl: "",
    githubUrl: "",
    role: "Interviewer",
    title: "",
    company: "",
    yearsExperience: "",
    bio: "",
  });

  const [sessionAccessToken, setSessionAccessToken] = useState(null);

  const handleFieldChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const redirectForRole = (role) => {
    const target =
      ROLE_REDIRECTS[role] ||
      ROLE_REDIRECTS[normalizeRole(role)] ||
      "/interview-booking";
    router.replace(target);
  };

  const loadAndCacheSchedule = useCallback(async (token) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/schedule/get`, {
        headers: authHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("interviewerSchedule", JSON.stringify(data));
      }
    } catch (err) {
      console.warn("Could not load schedule:", err.message);
    }
  }, []);

  const loadAndCacheBookingData = useCallback(async (token) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/booking/all-bookings`, {
        headers: authHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("interviewerBookings", JSON.stringify(data));
      }
    } catch (err) {
      console.warn("Could not load booking data:", err.message);
    }
  }, []);

  const checkInterviewerProfileAndProceed = useCallback(
    async (accessToken, role) => {
      const effectiveToken = accessToken || getStoredAccessToken();

      if (effectiveToken) {
        setSessionAccessToken(effectiveToken);
        if (
          role === "Interviewer" ||
          role === "INTERVIEWER" ||
          normalizeRole(role) === "Interviewer"
        ) {
          await loadAndCacheSchedule(effectiveToken);
          await loadAndCacheBookingData(effectiveToken);
        }
      }

      redirectForRole(role);
    },
    [loadAndCacheSchedule, loadAndCacheBookingData],
  );

  const handleLogin = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cleanToken = token ? token.trim() : "";
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...authHeaders(cleanToken),
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Login failed (${res.status})`);
      const data = await res.json();

      storeAuthResponse(data);
      const accessToken = extractAccessToken(data);
      await checkInterviewerProfileAndProceed(accessToken, data.role);
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Login failed. Please try again.");
      setLoading(false);
    }
  }, [token, checkInterviewerProfileAndProceed]);

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
      setMode("register");
      setLoading(false);
      return;
    }

    setError("Unknown login purpose.");
    setLoading(false);
  }, [token, purpose, handleLogin]);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const cleanToken = token ? token.trim() : "";

      const payload = {
        userName: form.userName,
        fullName: form.fullName,
        linkedinUrl: form.linkedinUrl,
        githubUrl: form.githubUrl,
        role: form.role,
        ...(form.role === "Interviewer" && {
          title: form.title,
          company: form.company,
          yearsExperience: form.yearsExperience
            ? Number(form.yearsExperience)
            : null,
          bio: form.bio,
        }),
      };

      const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...authHeaders(cleanToken),
        },
        body: JSON.stringify(payload),
        credentials: "include",
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
      const accessToken = extractAccessToken(data);
      if (accessToken) {
        setSessionAccessToken(accessToken);
      }
      redirectForRole(data.role);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteProfileSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: form.title,
        company: form.company,
        years_experience: form.yearsExperience
          ? Number(form.yearsExperience)
          : null,
        bio: form.bio,
      };

      const res = await fetch(`${API_BASE}/api/v1/user/update-user-info`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...authHeaders(sessionAccessToken),
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) throw new Error(`Failed to save profile (${res.status})`);

      redirectForRole("Interviewer");
    } catch (err) {
      setError(err.message || "Could not save your profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const skipProfileCompletion = () => {
    redirectForRole("Interviewer");
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

  if (error && mode === null) {
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

  if (mode === "register") {
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

          {form.role === "Interviewer" && (
            <InterviewerDetailsFields
              values={form}
              onChange={handleFieldChange}
            />
          )}

          {error && <p className="auth-register-error">{error}</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? "Creating account..." : "Complete sign up"}
          </button>
        </form>
      </div>
    );
  }

  if (mode === "complete-profile") {
    return (
      <div className="auth-callback-root">
        <form
          className="auth-register-form"
          onSubmit={handleCompleteProfileSubmit}
        >
          <h2>Finish setting up your profile</h2>
          <p className="auth-register-subtitle">
            A few details are missing — candidates will see this on your mentor
            profile.
          </p>

          <InterviewerDetailsFields
            values={form}
            onChange={handleFieldChange}
          />

          {error && <p className="auth-register-error">{error}</p>}

          <div className="auth-complete-profile-actions">
            <button
              type="button"
              className="auth-skip-btn"
              onClick={skipProfileCompletion}
              disabled={submitting}
            >
              Skip for now
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save and continue"}
            </button>
          </div>
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
