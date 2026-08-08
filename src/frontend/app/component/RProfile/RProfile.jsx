"use client";
import { useEffect, useRef, useState } from "react";
import RNavigationBar from "../RNavigationBar/RNavigationBar";
import "./RProfile.css";

const API_BASE = "http://localhost:8080";

const RProfile = () => {
  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // --- State Expertise Đã Duyệt ---
  const [approvedExpertises, setApprovedExpertises] = useState([]);

  // --- State Stripe Connection ---
  const [isStripeConnected, setIsStripeConnected] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);

  // --- State Autocomplete Position ---
  const [positionQuery, setPositionQuery] = useState("");
  const [positionSuggestions, setPositionSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const positionWrapperRef = useRef(null);

  // --- State Form Đăng ký Expertise ---
  const [expPosition, setExpPosition] = useState("");
  const [expLevel, setExpLevel] = useState("INTERN");
  const [expYears, setExpYears] = useState(1);
  const [expHourlyFee, setExpHourlyFee] = useState(5.0);
  const [expFile, setExpFile] = useState(null);
  const [submittingExpertise, setSubmittingExpertise] = useState(false);

  const fileInputRef = useRef(null);

  // Helper Lấy Auth Token
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

  // Helper lọc & chuẩn hóa danh sách expertise
  const processExpertises = (rawList) => {
    if (!Array.isArray(rawList)) return [];
    return rawList.filter((item) => {
      const isCert =
        item.isCertified ?? item.is_certified ?? item.certified ?? false;

      return (
        isCert === true ||
        isCert === "true" ||
        isCert === "t" ||
        isCert === 1 ||
        item.status === "APPROVED" ||
        item.status === "CERTIFIED"
      );
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

          // Lọc danh sách Expertise từ DTO userData
          const rawExpertises =
            userData.expertises ||
            userData.expertiseList ||
            userData.interviewerExpertises ||
            userData.interviewer_expertises ||
            [];

          setApprovedExpertises(processExpertises(rawExpertises));

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
        } else {
          loadProfileFromStorage();
        }
      } catch (e) {
        console.error("Lỗi fetch profile từ Server:", e);
        loadProfileFromStorage();
      } finally {
        setLoading(false);
      }
    };

    const loadProfileFromStorage = () => {
      try {
        const savedUserStr = localStorage.getItem("user");
        if (savedUserStr) {
          const userData = JSON.parse(savedUserStr);
          const loadedData = {
            name:
              userData.fullName ||
              userData.full_name ||
              userData.userName ||
              "",
            email: userData.email || "",
            linkedinUrl: userData.linkedinUrl || userData.linkedin_url || "",
            githubUrl: userData.githubUrl || userData.github_url || "",
          };
          setProfile(loadedData);
          setDraft(loadedData);

          const rawExpertises =
            userData.expertises ||
            userData.expertiseList ||
            userData.interviewerExpertises ||
            [];
          setApprovedExpertises(processExpertises(rawExpertises));

          setIsStripeConnected(
            Boolean(userData.isStripeConnected || userData.is_stripe_connected),
          );
        }
      } catch (e) {
        console.error("Lỗi đọc dữ liệu Auth:", e);
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
        } else {
          setPositionSuggestions([]);
        }
      } catch (err) {
        console.error("Lỗi tìm kiếm position:", err);
        setPositionSuggestions([]);
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

  // 3. Kết nối Stripe
  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      const authHeader = getAuthHeader();
      if (!authHeader) {
        alert("Vui lòng đăng nhập lại!");
        return;
      }

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

        if (redirectUrl) {
          window.location.href = redirectUrl;
        } else {
          alert("Khởi tạo liên kết Stripe thành công!");
        }
      } else {
        const errText = await res.text().catch(() => "");
        alert(`Lỗi kết nối Stripe (${res.status}): ${errText}`);
      }
    } catch (err) {
      console.error("Lỗi kết nối Stripe:", err);
      alert("Lỗi máy chủ khi kết nối Stripe!");
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
      if (!authHeader) {
        alert("Phiên đăng nhập hết hạn!");
        return;
      }

      const res = await fetch(`${API_BASE}/api/v1/user/update-user-info`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updatedProfile = { ...draft };
        setProfile(updatedProfile);

        const cached = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...cached,
            full_name: updatedProfile.name,
            user_name: updatedProfile.name,
            linkedin_url: updatedProfile.linkedinUrl,
            github_url: updatedProfile.githubUrl,
          }),
        );

        setIsEditing(false);
        alert("Cập nhật thông tin thành công!");
      } else {
        alert("Cập nhật thất bại. Mã lỗi: " + res.status);
      }
    } catch (err) {
      console.error("Lỗi cập nhật thông tin:", err);
      alert("Lỗi kết nối máy chủ!");
    } finally {
      setSaving(false);
    }
  };

  // 5. Submit Expertise Request
  const handleRequestExpertise = async (e) => {
    e.preventDefault();

    if (!expPosition.trim()) {
      alert("Vui lòng nhập hoặc chọn vị trí chuyên môn (Position)!");
      return;
    }
    if (!expFile) {
      alert("Vui lòng tải lên tài liệu/chứng chỉ/CV minh chứng!");
      return;
    }

    setSubmittingExpertise(true);

    try {
      const authHeader = getAuthHeader();
      if (!authHeader) {
        alert("Phiên đăng nhập không hợp lệ!");
        return;
      }

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
        alert("Gửi yêu cầu Expertise thành công và đang chờ Admin duyệt!");
        setExpFile(null);
        setPositionQuery("");
        setExpPosition("");
      } else {
        const errText = await res.text();
        alert(`Gửi yêu cầu thất bại (${res.status}): ${errText}`);
      }
    } catch (err) {
      console.error("Lỗi gửi yêu cầu Expertise:", err);
      alert("Lỗi kết nối máy chủ!");
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

          {/* BLOCK 1: USER INFO & APPROVED EXPERTISES */}
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

            {/* TAG EXPERTISE ĐÃ DUYỆT */}
            <div className="rp-expertise-tags-container">
              <span className="rp-label">APPROVED EXPERTISES</span>
              <div className="rp-expertise-tags-wrapper">
                {approvedExpertises.length === 0 ? (
                  <span className="rp-no-expertise">
                    Chưa có Expertise nào được chứng nhận.
                  </span>
                ) : (
                  approvedExpertises.map((item, idx) => {
                    const rawPosName =
                      item.positionName ||
                      item.position_name ||
                      item.position?.positionName ||
                      item.position?.position_name ||
                      item.position ||
                      "";

                    const posName = String(rawPosName).toUpperCase();
                    const level = (item.level || "VERIFIED").toUpperCase();
                    const fee = item.hourlyFee || item.hourly_fee;

                    return (
                      <div key={idx} className="rp-expertise-badge">
                        <span>{posName}</span>
                        <span className="rp-expertise-level">{level}</span>
                        {fee && (
                          <span className="rp-expertise-fee">${fee}/h</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* BLOCK 2: STRIPE KẾT NỐI */}
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

          {/* BLOCK 3: FORM REQUEST EXPERTISE */}
          <div className="rp-basic-card">
            <h2 className="rp-section-subtitle">
              Request Expertise Certification
            </h2>

            {!isStripeConnected && (
              <div className="rp-warning-box">
                ⚠️ <strong>Lưu ý:</strong> Bạn cần liên kết tài khoản Stripe
                thành công ở phía trên trước khi thực hiện gửi yêu cầu cấp chứng
                nhận Expertise.
              </div>
            )}

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
