"use client";
import { useEffect, useState, useCallback, Suspense, useRef } from "react";
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
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return null;
  }
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

const clearAllAuthData = () => {
  if (typeof window === "undefined") return;
  const authKeys = [
    "accessToken",
    "token",
    "jwt",
    "authToken",
    "access_token",
    "refreshToken",
    "refresh_token",
    "user",
    "interviewerSchedule",
    "interviewerBookings",
  ];
  authKeys.forEach((key) => localStorage.removeItem(key));
};

const extractAccessToken = (data = {}) => {
  if (!data) return "";
  const candidate =
    data.accessToken || data.access_token || data.token || data.jwt;
  return candidate
    ? String(candidate)
        .replace(/^"(.*)"$/, "$1")
        .trim()
    : "";
};

const extractRefreshToken = (data = {}) => {
  if (!data) return "";
  const candidate = data.refreshToken || data.refresh_token;
  return candidate
    ? String(candidate)
        .replace(/^"(.*)"$/, "$1")
        .trim()
    : "";
};

const storeAuthResponse = (data = {}) => {
  clearAllAuthData();

  const accessToken = extractAccessToken(data);
  const refreshToken = extractRefreshToken(data);

  if (accessToken) {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("token", accessToken);
    localStorage.setItem("jwt", accessToken);
    localStorage.setItem("access_token", accessToken);
  }

  if (refreshToken) {
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("refresh_token", refreshToken);
  }

  localStorage.setItem(
    "user",
    JSON.stringify({
      email: data.email,
      userName: data.user_name || data.userName,
      fullName: data.full_name || data.fullName,
      role: data.role,
      isStripeConnected:
        data.is_stripe_connected ?? data.isStripeConnected ?? false,
      stripeAccountId: data.stripe_id || data.stripeAccountId || null,
    }),
  );
};

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
  const tokenFromUrl =
    searchParams.get("regToken") || searchParams.get("token");
  const purpose = searchParams.has("regToken")
    ? "REGISTRATION"
    : searchParams.get("purpose");

  const token = tokenFromUrl;
  const isProcessingRef = useRef(false);

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

  const handleFieldChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const redirectForRole = useCallback(
    (role) => {
      const target =
        ROLE_REDIRECTS[role] ||
        ROLE_REDIRECTS[normalizeRole(role)] ||
        "/interview-booking";
      router.replace(target);
    },
    [router],
  );

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
    [loadAndCacheSchedule, loadAndCacheBookingData, redirectForRole],
  );

  useEffect(() => {
    if (!token) {
      setError("Missing login information. Please try signing in again.");
      setLoading(false);
      return;
    }

    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const authenticate = async () => {
      setLoading(true);
      setError(null);

      try {
        const cleanToken = token.trim().replace(/ /g, "+");

        // Gọi API Login
        const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            ...authHeaders(cleanToken),
          },
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          storeAuthResponse(data);
          const accessToken = extractAccessToken(data);
          await checkInterviewerProfileAndProceed(accessToken, data.role);
          return;
        }

        // Nếu người dùng mới -> Bật form Đăng ký bổ sung thông tin
        if (purpose === "REGISTRATION" || searchParams.has("regToken")) {
          clearAllAuthData();
          const claims = decodeJwtPayload(cleanToken);
          setDisplayEmail(claims?.sub || "");
          setMode("register");
        } else {
          setError("Login failed. Invalid token or session expired.");
        }
      } catch (err) {
        console.error("Auth error:", err);
        setError("An error occurred during authentication.");
      } finally {
        setLoading(false);
      }
    };

    authenticate();
  }, [token, purpose, searchParams, checkInterviewerProfileAndProceed]);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const cleanToken = token ? token.trim().replace(/ /g, "+") : "";
      const payload = {
        email: displayEmail,
        user_name: form.userName,
        full_name: form.fullName,
        linkedin_url: form.linkedinUrl,
        github_url: form.githubUrl,
        role: form.role,
        ...(form.role === "Interviewer" && {
          title: form.title,
          company: form.company,
          yearsExperience: form.yearsExperience
            ? parseInt(form.yearsExperience, 10) || 0
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
          clearAllAuthData();
          throw new Error(
            "Registration session expired or invalid token (401). Please try logging in again.",
          );
        }
        throw new Error(`Registration failed (${res.status})`);
      }

      const data = await res.json();
      storeAuthResponse(data);
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
          ? parseInt(form.yearsExperience, 10) || 0
          : null,
        bio: form.bio,
      };

      const res = await fetch(`${API_BASE}/api/v1/user/update-user-info`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...authHeaders(getStoredAccessToken()),
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
          <button
            onClick={() => {
              clearAllAuthData();
              router.replace("/login");
            }}
          >
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
