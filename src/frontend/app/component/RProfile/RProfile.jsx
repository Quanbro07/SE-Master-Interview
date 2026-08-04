"use client";
import { useEffect, useState } from "react";
import RNavigationBar from "../RNavigationBar/RNavigationBar";
import "./RProfile.css";

// 🔴 Chỉ định chính xác URL của Spring Boot Backend
const API_BASE = "http://localhost:8080";

const AVAILABLE_POSITIONS = [
  { id: 1, name: "BACK-END DEVELOPER" },
  { id: 2, name: "FRONT-END DEVELOPER" },
  { id: 3, name: "DATA ENGINEER" },
  { id: 4, name: "FULL-STACK DEVELOPER" },
  { id: 5, name: "DEVOPS ENGINEER" },
];

const LINKEDIN_REGEX =
  /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/;
const GITHUB_REGEX = /^https:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?$/;

const RProfile = () => {
  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPositionId, setSelectedPositionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Helper hàm lấy và chuẩn hóa Token từ localStorage
  const getAuthHeader = () => {
    const rawToken =
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("jwt") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("access_token") ||
      "";

    if (!rawToken || rawToken === "undefined" || rawToken === "null") {
      return "";
    }

    const normalizedToken = String(rawToken).replace(/^"(.*)"$/, "$1").trim();

    if (!normalizedToken) return "";

    return normalizedToken.startsWith("Bearer ")
      ? normalizedToken
      : `Bearer ${normalizedToken}`;
  };

  // 🚀 Lấy thông tin User từ LocalStorage (Được lưu khi Đăng nhập/Auth)
  useEffect(() => {
    const loadProfileFromStorage = () => {
      try {
        const savedUserStr = localStorage.getItem("user");

        if (savedUserStr) {
          const userData = JSON.parse(savedUserStr);

          const loadedData = {
            name:
              userData.full_name ||
              userData.user_name ||
              userData.fullName ||
              userData.userName ||
              "",
            title: userData.title || userData.role || "",
            company: userData.company || "",
            email: userData.email || "",
            yearsExperience:
              userData.years_experience ?? userData.yearsExperience ?? 0,
            bio: userData.bio || "",
            expertise: userData.expertise || [],
            linkedinUrl: userData.linkedin_url || userData.linkedinUrl || "",
            githubUrl: userData.github_url || userData.githubUrl || "",
          };

          setProfile(loadedData);
          setDraft(loadedData);
        } else {
          setProfile(null);
        }
      } catch (e) {
        console.error("Lỗi đọc dữ liệu Auth người dùng:", e);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfileFromStorage();
  }, []);

  const startEditing = () => {
    setDraft({ ...profile });
    setSelectedPositionId("");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraft({ ...profile });
    setSelectedPositionId("");
    setIsEditing(false);
  };

  const saveEditing = async () => {
    setSaving(true);

    const fullName = draft.name?.trim() || "";
    const rawLinkedin = draft.linkedinUrl?.trim() || "";
    const rawGithub = draft.githubUrl?.trim() || "";

    const validLinkedin = LINKEDIN_REGEX.test(rawLinkedin) ? rawLinkedin : null;
    const validGithub = GITHUB_REGEX.test(rawGithub) ? rawGithub : null;

    // Truncate fullName to 50 chars for user_name (database constraint)
    // Send full 150 char limit for full_name
    const truncatedName = fullName.substring(0, 50) || null;

    const payload = {
      user_name: truncatedName,
      full_name: fullName || null,
      linkedin_url: validLinkedin,
      github_url: validGithub,
    };

    try {
      const authHeader = getAuthHeader();

      if (!authHeader) {
        alert("Không tìm thấy Token xác thực. Vui lòng đăng nhập lại!");
        setSaving(false);
        return;
      }

      // Gọi trực tiếp cổng 8080
      const res = await fetch(`${API_BASE}/api/v1/user/update-user-info`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (res.ok) {
        const backendData = await res.json().catch(() => ({}));

        const updatedProfile = {
          ...draft,
          name: backendData.full_name || backendData.user_name || draft.name,
          linkedinUrl: backendData.linkedin_url || draft.linkedinUrl || "",
          githubUrl: backendData.github_url || draft.githubUrl || "",
        };

        setProfile(updatedProfile);

        const cached = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...cached,
            full_name: updatedProfile.name,
            user_name: updatedProfile.name,
            fullName: updatedProfile.name,
            userName: updatedProfile.name,
            linkedin_url: updatedProfile.linkedinUrl,
            github_url: updatedProfile.githubUrl,
            linkedinUrl: updatedProfile.linkedinUrl,
            githubUrl: updatedProfile.githubUrl,
            yearsExperience: updatedProfile.yearsExperience,
            bio: updatedProfile.bio,
            expertise: updatedProfile.expertise,
          }),
        );

        setIsEditing(false);
        alert("Cập nhật thông tin thành công!");
      } else {
        const updatedProfile = {
          ...draft,
          linkedinUrl: payload.linkedin_url || draft.linkedinUrl || "",
          githubUrl: payload.github_url || draft.githubUrl || "",
        };

        setProfile(updatedProfile);

        const cached = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...cached,
            full_name: updatedProfile.name,
            user_name: updatedProfile.name,
            fullName: updatedProfile.name,
            userName: updatedProfile.name,
            linkedin_url: updatedProfile.linkedinUrl,
            github_url: updatedProfile.githubUrl,
            linkedinUrl: updatedProfile.linkedinUrl,
            githubUrl: updatedProfile.githubUrl,
            yearsExperience: updatedProfile.yearsExperience,
            bio: updatedProfile.bio,
            expertise: updatedProfile.expertise,
          }),
        );

        setIsEditing(false);
        alert("Cập nhật cục bộ trên trình duyệt thành công. Backend hiện đang lỗi, vui lòng thử lại sau.");
      }
    } catch (err) {
      console.error("Lỗi kết nối Backend:", err);
      alert("Lỗi kết nối tới Server Backend (8080)!");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const addExpertiseTag = () => {
    if (!selectedPositionId) return;
    const posObj = AVAILABLE_POSITIONS.find(
      (p) => p.id === Number(selectedPositionId),
    );
    if (!posObj) return;

    const currentExpertise = draft.expertise || [];
    if (currentExpertise.some((item) => (item.id || item) === posObj.id)) {
      setSelectedPositionId("");
      return;
    }

    setDraft((prev) => ({
      ...prev,
      expertise: [...currentExpertise, posObj],
    }));
    setSelectedPositionId("");
  };

  const removeExpertiseTag = (posId) => {
    setDraft((prev) => ({
      ...prev,
      expertise: (prev.expertise || []).filter(
        (item) => (item.id || item) !== posId,
      ),
    }));
  };

  if (loading) {
    return (
      <div className="rp-root">
        <RNavigationBar />
        <main className="rp-main" style={{ color: "#fff", padding: "40px" }}>
          Đang tải thông tin...
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rp-root">
        <RNavigationBar />
        <main className="rp-main" style={{ color: "#fff", padding: "40px" }}>
          Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.
        </main>
      </div>
    );
  }

  const displayed = isEditing ? draft : profile;

  return (
    <div className="rp-root">
      <RNavigationBar />
      <main className="rp-main">
        <section className="rp-inner">
          <h1 className="rp-title">-----PROFILE-----</h1>

          <div className="rp-basic-card">
            <div className="rp-basic-header">
              <div className="rp-avatar-block">
                <div className="rp-avatar">
                  {displayed.name
                    ? displayed.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : "U"}
                </div>
                <div className="rp-name-block">
                  {isEditing ? (
                    <>
                      <input
                        className="rp-input rp-input-name"
                        value={draft.name || ""}
                        onChange={(e) => updateField("name", e.target.value)}
                        placeholder="Full name"
                      />
                      <input
                        className="rp-input rp-input-subtitle"
                        value={draft.title || ""}
                        onChange={(e) => updateField("title", e.target.value)}
                        placeholder="Job title"
                      />
                    </>
                  ) : (
                    <>
                      <p className="rp-name">
                        {profile.name || "Chưa cập nhật tên"}
                      </p>
                      <p className="rp-subtitle">
                        {profile.title || "Chưa có chức danh"}{" "}
                        {profile.company ? `· ${profile.company}` : ""}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {!isEditing ? (
                <button
                  type="button"
                  className="rp-edit-btn"
                  onClick={startEditing}
                >
                  Edit
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

            <div className="rp-field-grid">
              <div className="rp-field">
                <span className="rp-label">Company</span>
                {isEditing ? (
                  <input
                    className="rp-input"
                    value={draft.company || ""}
                    onChange={(e) => updateField("company", e.target.value)}
                  />
                ) : (
                  <p className="rp-value">
                    {profile.company || "Chưa cập nhật"}
                  </p>
                )}
              </div>

              <div className="rp-field">
                <span className="rp-label">Email</span>
                <p className="rp-value">{profile.email || "Chưa cập nhật"}</p>
              </div>

              <div className="rp-field">
                <span className="rp-label">LinkedIn URL</span>
                {isEditing ? (
                  <input
                    className="rp-input"
                    value={draft.linkedinUrl || ""}
                    onChange={(e) => updateField("linkedinUrl", e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                  />
                ) : (
                  <p className="rp-value">{profile.linkedinUrl || "Not set"}</p>
                )}
              </div>

              <div className="rp-field">
                <span className="rp-label">GitHub URL</span>
                {isEditing ? (
                  <input
                    className="rp-input"
                    value={draft.githubUrl || ""}
                    onChange={(e) => updateField("githubUrl", e.target.value)}
                    placeholder="https://github.com/username"
                  />
                ) : (
                  <p className="rp-value">{profile.githubUrl || "Not set"}</p>
                )}
              </div>

              <div className="rp-field">
                <span className="rp-label">Years of experience</span>
                {isEditing ? (
                  <input
                    className="rp-input"
                    type="number"
                    min={0}
                    value={draft.yearsExperience ?? 0}
                    onChange={(e) =>
                      updateField("yearsExperience", Number(e.target.value))
                    }
                  />
                ) : (
                  <p className="rp-value">{profile.yearsExperience} years</p>
                )}
              </div>
            </div>

            <div className="rp-field rp-field-bio">
              <span className="rp-label">About</span>
              {isEditing ? (
                <textarea
                  className="rp-textarea"
                  value={draft.bio || ""}
                  onChange={(e) => updateField("bio", e.target.value)}
                  rows={4}
                />
              ) : (
                <p className="rp-value rp-bio-text">
                  {profile.bio || "No description provided."}
                </p>
              )}
            </div>

            <div className="rp-field">
              <span className="rp-label">Expertise Position</span>
              <div className="rp-tag-row">
                {(displayed.expertise || []).map((item) => (
                  <span key={item.id || item} className="rp-tag">
                    {item.name || item}
                    {isEditing && (
                      <button
                        type="button"
                        className="rp-tag-remove"
                        onClick={() => removeExpertiseTag(item.id || item)}
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {isEditing && (
                <div className="rp-tag-input-row">
                  <select
                    className="rp-input rp-tag-input"
                    value={selectedPositionId}
                    onChange={(e) => setSelectedPositionId(e.target.value)}
                    style={{ backgroundColor: "#1e1e2d", color: "#fff" }}
                  >
                    <option value="">-- Select Position --</option>
                    {AVAILABLE_POSITIONS.map((pos) => (
                      <option key={pos.id} value={pos.id}>
                        {pos.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="rp-tag-add-btn"
                    onClick={addExpertiseTag}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default RProfile;
