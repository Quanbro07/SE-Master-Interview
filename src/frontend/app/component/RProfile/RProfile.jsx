"use client";
import { useEffect, useRef, useState } from "react";
import RNavigationBar from "../RNavigationBar/RNavigationBar";
import "./RProfile.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const RProfile = () => {
  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // State lưu danh sách Expertise/Position
  const [approvedExpertises, setApprovedExpertises] = useState([]);

  // State Stripe Connection
  const [isStripeConnected, setIsStripeConnected] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);

  // State Autocomplete Position
  const [positionQuery, setPositionQuery] = useState("");
  const [positionSuggestions, setPositionSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const positionWrapperRef = useRef(null);

  // Form Đăng ký Expertise
  const [expPosition, setExpPosition] = useState("");
  const [expLevel, setExpLevel] = useState("INTERN");
  const [expYears, setExpYears] = useState(1);
  const [expHourlyFee, setExpHourlyFee] = useState(5.0);
  const [expFile, setExpFile] = useState(null);
  const [submittingExpertise, setSubmittingExpertise] = useState(false);

  const fileInputRef = useRef(null);

  const getAuthHeader = () => {
    const rawToken =
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("jwt") ||
      localStorage.getItem("authToken") ||
      "";

    if (!rawToken || rawToken === "undefined" || rawToken === "null") return "";

    const normalizedToken = String(rawToken)
      .replace(/^"(.*)"$/, "$1")
      .trim();
    return normalizedToken.startsWith("Bearer ")
      ? normalizedToken
      : `Bearer ${normalizedToken}`;
  };

  // Trích xuất tên Position từ đối tượng DTO hoặc database
  const extractPositionName = (item) => {
    if (typeof item === "string") return item;
    if (!item) return "N/A";

    return (
      item.positionName ||
      item.position_name ||
      item.name ||
      (item.position &&
        (item.position.positionName ||
          item.position.position_name ||
          item.position.name)) ||
      "N/A"
    );
  };

  // Chuẩn hóa và lấy toàn bộ danh sách Chuyên môn / Vị trí theo schema Database
  const processExpertises = (userData) => {
    const rawList =
      userData.expertises ||
      userData.expertiseList ||
      userData.interviewerExpertises ||
      userData.interviewer_expertises ||
      userData.positions ||
      [];

    if (!Array.isArray(rawList)) return [];

    return rawList.map((item) => {
      // Map theo các column: is_certified, hourly_fee, experience_year
      const isCert =
        item.is_certified ?? item.isCertified ?? item.certified ?? false;
      const posName = extractPositionName(item);

      return {
        ...item,
        displayPositionName: String(posName).toUpperCase(),
        hourlyFee: item.hourly_fee ?? item.hourlyFee,
        experienceYear: item.experience_year ?? item.experienceYear,
        isCertified: Boolean(
          isCert === true ||
          isCert === "t" ||
          isCert === "true" ||
          isCert === 1 ||
          item.status === "APPROVED" ||
          item.status === "CERTIFIED",
        ),
      };
    });
  };

  // 1. Fetch Profile
  useEffect(() => {
    const fetchProfileFromAPI = async () => {
      try {
        const authHeader = getAuthHeader();
        if (!authHeader) {
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE}/api/v1/user/me`, {
          headers: { Authorization: authHeader },
        });

        if (res.ok) {
          const userData = await res.json();
          const loadedData = {
            name:
              userData.fullName ||
              userData.full_name ||
              userData.userName ||
              userData.user_name ||
              "",
            email: userData.email || "",
            linkedinUrl: userData.linkedinUrl || userData.linkedin_url || "",
            githubUrl: userData.githubUrl || userData.github_url || "",
          };
          setProfile(loadedData);
          setDraft(loadedData);

          // Cập nhật danh sách Position/Expertise
          const expertisesList = processExpertises(userData);
          setApprovedExpertises(expertisesList);

          // Cập nhật Stripe Status
          const stripeStatus = Boolean(
            userData.isStripeConnected ||
            userData.is_stripe_connected ||
            userData.stripeAccountId ||
            userData.stripe_account_id ||
            localStorage.getItem("is_stripe_connected") === "true",
          );
          setIsStripeConnected(stripeStatus);

          const cached = JSON.parse(localStorage.getItem("user") || "{}");
          localStorage.setItem(
            "user",
            JSON.stringify({ ...cached, ...userData }),
          );
        }
      } catch (e) {
        console.error("Lỗi fetch profile từ Server:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileFromAPI();
  }, []);

  // 2. Position Search Autocomplete
  useEffect(() => {
    if (!positionQuery.trim()) {
      setPositionSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const authHeader = getAuthHeader();
        const headers = authHeader ? { Authorization: authHeader } : {};

        const res = await fetch(
          `${API_BASE}/api/v1/position/search?q=${encodeURIComponent(positionQuery)}`,
          { headers },
        );

        if (res.ok) {
          const data = await res.json();
          setPositionSuggestions(data || []);
        }
      } catch (err) {
        console.error("Lỗi tìm kiếm position:", err);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [positionQuery]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        positionWrapperRef.current &&
        !positionWrapperRef.current.contains(e.target)
      ) {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePositionInputChange = (e) => {
    const value = e.target.value;
    setPositionQuery(value);
    setSuggestionsOpen(true);
    setExpPosition(value);
  };

  const handleSelectPosition = (name) => {
    setPositionQuery(name);
    setExpPosition(name);
    setSuggestionsOpen(false);
  };

  // 3. Connect Stripe
  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      const authHeader = getAuthHeader();
      if (!authHeader) return;

      const res = await fetch(`${API_BASE}/api/v1/stripe/create-account-link`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        const redirectUrl = data.url || data.accountLink || data.link;
        if (redirectUrl) window.location.href = redirectUrl;
      }
    } catch (err) {
      console.error("Lỗi kết nối Stripe:", err);
    } finally {
      setConnectingStripe(false);
    }
  };

  // 4. Update Profile Info
  const startEditing = () => {
    setDraft({ ...profile });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraft({ ...profile });
    setIsEditing(false);
  };

  const saveEditing = async () => {
    setSaving(true);
    const fullName = draft.name?.trim() || "";

    const payload = {
      user_name: fullName.substring(0, 50) || null,
      full_name: fullName || null,
      linkedin_url: draft.linkedinUrl?.trim() || null,
      github_url: draft.githubUrl?.trim() || null,
    };

    try {
      const authHeader = getAuthHeader();
      const res = await fetch(`${API_BASE}/api/v1/user/update-user-info`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setProfile({ ...draft });
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Lỗi cập nhật profile:", err);
    } finally {
      setSaving(false);
    }
  };

  // 5. Submit Expertise Request (Khớp với các tên cột DB: experience_year, hourly_fee, level)
  const handleRequestExpertise = async (e) => {
    e.preventDefault();
    if (!expPosition.trim() || !expFile) return;

    setSubmittingExpertise(true);
    try {
      const authHeader = getAuthHeader();
      const formData = new FormData();
      formData.append("file", expFile);
      formData.append("position", expPosition.trim());
      formData.append("level", expLevel);
      formData.append("experience_year", expYears);
      formData.append("hourly_fee", expHourlyFee);

      const res = await fetch(
        `${API_BASE}/api/v1/expertise/position-expertise-request`,
        {
          method: "POST",
          headers: { Authorization: authHeader },
          body: formData,
        },
      );

      if (res.ok) {
        setExpFile(null);
        setPositionQuery("");
        setExpPosition("");
      }
    } catch (err) {
      console.error("Lỗi gửi yêu cầu Expertise:", err);
    } finally {
      setSubmittingExpertise(false);
    }
  };

  if (loading) return <div className="rp-loading">Loading profile...</div>;

  return (
    <div className="rp-root">
      <RNavigationBar />
      <main className="rp-main">
        <section className="rp-inner">
          <h1 className="rp-title">----- PROFILE & EXPERTISE -----</h1>

          {/* BASIC INFO CARD */}
          <div className="rp-basic-card">
            <div className="rp-basic-header">
              <div className="rp-avatar-block">
                <div className="rp-avatar">
                  {profile?.name ? profile.name[0].toUpperCase() : "U"}
                </div>
                <div className="rp-name-block">
                  {isEditing ? (
                    <input
                      className="rp-input rp-input-name"
                      value={draft.name || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, name: e.target.value })
                      }
                      placeholder="Full name"
                    />
                  ) : (
                    <p className="rp-name">
                      {profile?.name || "Chưa cập nhật tên"}
                    </p>
                  )}
                </div>
              </div>

              {!isEditing ? (
                <button
                  type="button"
                  className="rp-edit-btn"
                  onClick={startEditing}
                >
                  Edit Profile
                </button>
              ) : (
                <div className="rp-edit-actions">
                  <button
                    type="button"
                    className="rp-cancel-btn"
                    onClick={cancelEditing}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rp-save-btn"
                    onClick={saveEditing}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>

            <div className="rp-field-grid rp-field-grid-mt">
              <div className="rp-field">
                <span className="rp-label">Email</span>
                <p className="rp-value">{profile?.email || "Chưa cập nhật"}</p>
              </div>

              <div className="rp-field">
                <span className="rp-label">LinkedIn URL</span>
                {isEditing ? (
                  <input
                    className="rp-input"
                    value={draft.linkedinUrl || ""}
                    onChange={(e) =>
                      setDraft({ ...draft, linkedinUrl: e.target.value })
                    }
                  />
                ) : (
                  <p className="rp-value">
                    {profile?.linkedinUrl || "Not set"}
                  </p>
                )}
              </div>

              <div className="rp-field">
                <span className="rp-label">GitHub URL</span>
                {isEditing ? (
                  <input
                    className="rp-input"
                    value={draft.githubUrl || ""}
                    onChange={(e) =>
                      setDraft({ ...draft, githubUrl: e.target.value })
                    }
                  />
                ) : (
                  <p className="rp-value">{profile?.githubUrl || "Not set"}</p>
                )}
              </div>
            </div>

            {/* EXPERTISE / POSITIONS LIST */}
            <div className="rp-expertise-tags-container">
              <span className="rp-label">APPROVED EXPERTISES / POSITIONS</span>
              <div className="rp-expertise-tags-wrapper">
                {approvedExpertises.length === 0 ? (
                  <span className="rp-no-expertise">
                    Chưa có Position / Expertise nào được ghi nhận.
                  </span>
                ) : (
                  approvedExpertises.map((item, idx) => {
                    const level = (item.level || "VERIFIED").toUpperCase();
                    const fee = item.hourlyFee;

                    return (
                      <div key={idx} className="rp-expertise-badge">
                        <span>{item.displayPositionName}</span>
                        <span className="rp-expertise-level">{level}</span>
                        {fee && (
                          <span className="rp-expertise-fee">${fee}/h</span>
                        )}
                        {item.isCertified && (
                          <span
                            style={{ color: "#4ade80", fontSize: "0.8rem" }}
                          >
                            ✓ Certified
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* STRIPE CARD */}
          <div className="rp-basic-card">
            <div className="rp-stripe-flex-header">
              <div>
                <h2 className="rp-card-title">Stripe Payment Account</h2>
                <p className="rp-card-subtitle">
                  {isStripeConnected
                    ? "Tài khoản Stripe đã kết nối. Bạn sẵn sàng nhận thù lao phỏng vấn."
                    : "Yêu cầu kết nối Stripe để nhận thù lao phỏng vấn trước khi đăng ký cấp Expertise."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleConnectStripe}
                disabled={connectingStripe || isStripeConnected}
                className={`rp-stripe-btn ${isStripeConnected ? "connected" : ""}`}
              >
                {isStripeConnected
                  ? "✓ Stripe Connected"
                  : connectingStripe
                    ? "Connecting..."
                    : "Connect with Stripe"}
              </button>
            </div>
          </div>

          {/* EXPERTISE REQUEST FORM */}
          <div className="rp-basic-card">
            <h2 className="rp-section-subtitle">
              Request Expertise Certification
            </h2>
            <form onSubmit={handleRequestExpertise} className="rp-field-grid">
              <div
                className="rp-field"
                style={{ position: "relative" }}
                ref={positionWrapperRef}
              >
                <span className="rp-label">POSITION / SPECIALTY</span>
                <input
                  type="text"
                  className="rp-input"
                  placeholder="e.g. Backend Developer, Java, Frontend..."
                  value={positionQuery}
                  onChange={handlePositionInputChange}
                  onFocus={() => setSuggestionsOpen(true)}
                  disabled={!isStripeConnected}
                  required
                />

                {suggestionsOpen && positionSuggestions.length > 0 && (
                  <ul className="rp-autocomplete-dropdown">
                    {positionSuggestions.map((p, idx) => (
                      <li
                        key={p.id || idx}
                        onClick={() => handleSelectPosition(p.name || p)}
                        className="rp-autocomplete-item"
                      >
                        {p.name || p}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rp-field">
                <span className="rp-label">LEVEL</span>
                <select
                  className="rp-select"
                  value={expLevel}
                  onChange={(e) => setExpLevel(e.target.value)}
                  disabled={!isStripeConnected}
                >
                  <option value="INTERN">INTERN</option>
                  <option value="FRESHER">FRESHER</option>
                  <option value="JUNIOR">JUNIOR</option>
                  <option value="MIDDLE">MIDDLE</option>
                  <option value="SENIOR">SENIOR</option>
                  <option value="LEAD">LEAD</option>
                </select>
              </div>

              <div className="rp-field">
                <span className="rp-label">YEARS OF EXPERIENCE</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="rp-input"
                  value={expYears}
                  onChange={(e) => setExpYears(Number(e.target.value))}
                  disabled={!isStripeConnected}
                  required
                />
              </div>

              <div className="rp-field">
                <span className="rp-label">HOURLY FEE ($)</span>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  className="rp-input"
                  value={expHourlyFee}
                  onChange={(e) => setExpHourlyFee(Number(e.target.value))}
                  disabled={!isStripeConnected}
                  required
                />
              </div>

              <div className="rp-field rp-field-full">
                <span className="rp-label">
                  CERTIFICATION / PROOF DOCUMENT (PDF/IMAGE)
                </span>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,image/*"
                  onChange={(e) => setExpFile(e.target.files[0] || null)}
                  disabled={!isStripeConnected}
                  style={{ display: "none" }}
                />
                <div className="rp-file-row">
                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current && fileInputRef.current.click()
                    }
                    disabled={!isStripeConnected}
                    className="rp-file-btn"
                  >
                    📂 Insert CV / Certificate
                  </button>
                  <span
                    className={`rp-file-status ${expFile ? "selected" : ""}`}
                  >
                    {expFile
                      ? `File selected: ${expFile.name}`
                      : "No file chosen"}
                  </span>
                </div>
              </div>

              <div className="rp-submit-btn-wrapper">
                <button
                  type="submit"
                  disabled={submittingExpertise || !isStripeConnected}
                  className="rp-submit-btn"
                >
                  {submittingExpertise
                    ? "SUBMITTING..."
                    : "SUBMIT REQUEST TO ADMIN"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default RProfile;
