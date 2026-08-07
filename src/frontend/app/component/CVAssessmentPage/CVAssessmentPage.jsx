"use client";
import { useRef, useState, useEffect } from "react";
import NavigationBar from "../NavigationBar/NavigationBar";
import "./CVAssessmentPage.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

// Helper lấy Access Token
const getAccessToken = () => {
  if (typeof window === "undefined") return "";
  const keys = ["accessToken", "token", "jwt", "authToken", "access_token"];
  let token = "";
  for (const key of keys) {
    const val = localStorage.getItem(key);
    if (val) {
      token = val;
      break;
    }
  }
  if (!token) return "";
  return token.replace(/^"(.*)"$/, "$1").trim();
};

// Helper lấy Refresh Token
const getRefreshToken = () => {
  if (typeof window === "undefined") return "";
  const keys = ["refreshToken", "refresh_token"];
  let token = "";
  for (const key of keys) {
    const val = localStorage.getItem(key);
    if (val) {
      token = val;
      break;
    }
  }
  if (!token) return "";
  return token.replace(/^"(.*)"$/, "$1").trim();
};

// Cập nhật lại tất cả token key trong LocalStorage
const updateStoredTokens = (newAccessToken, newRefreshToken) => {
  if (newAccessToken) {
    localStorage.setItem("accessToken", newAccessToken);
    localStorage.setItem("token", newAccessToken);
    localStorage.setItem("jwt", newAccessToken);
  }
  if (newRefreshToken) {
    localStorage.setItem("refreshToken", newRefreshToken);
  }
};

// Hàm Refresh Token
const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const cleanRefreshToken = refreshToken
    .replace(/^Bearer\s+/i, "")
    .replace(/"/g, "")
    .trim();

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cleanRefreshToken}`,
      },
      body: JSON.stringify({ refreshToken: cleanRefreshToken }),
    });

    if (!res.ok) {
      localStorage.clear();
      return null;
    }

    const data = await res.json();
    const newAccessToken =
      data.accessToken || data.token || data.access_token || data.jwt;
    const newRefreshToken = data.refreshToken || data.refresh_token;

    if (newAccessToken) {
      updateStoredTokens(newAccessToken, newRefreshToken);
      return newAccessToken;
    }
  } catch (err) {
    console.error("Failed to refresh token:", err);
  }
  return null;
};

// Labels cho section names từ backend
const SECTION_LABELS = {
  EXPERIENCE: "Experience",
  SKILLS: "Skills",
  SKILL: "Skills",
  EDUCATION: "Education",
  PROJECT: "Project",
  GPA: "GPA",
  SCORE: "Overall",
};

const CVAssessmentPage = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  // States hỗ trợ Autocomplete Position
  const [position, setPosition] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Lấy toàn bộ vị trí khi mount component hoặc dùng search query
  useEffect(() => {
    fetchPositions("");
  }, []);

  // Đóng dropdown khi click bên ngoài khung search
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Gọi API Backend lấy danh sách gợi ý Position
  const fetchPositions = async (query) => {
    try {
      const token = getAccessToken();
      const cleanToken = token ? token.replace(/^Bearer\s+/i, "") : "";

      const endpoint = query.trim()
        ? `${API_BASE}/api/v1/position/search?q=${encodeURIComponent(query)}`
        : `${API_BASE}/api/v1/position/get-all`;

      const res = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(cleanToken ? { Authorization: `Bearer ${cleanToken}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        setSuggestions(data || []);
      } else {
        console.warn(`Position fetch failed with status: ${res.status}`);
        setSuggestions([]);
      }
    } catch (err) {
      console.error("Failed to fetch positions:", err);
      setSuggestions([]);
    }
  };

  // Xử lý khi gõ vào ô Input Position với Debounce nhẹ
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showDropdown) {
        fetchPositions(position);
      }
    }, 300); // Đợi 300ms sau khi ngừng gõ mới gọi API

    return () => clearTimeout(timer);
  }, [position, showDropdown]);

  // Xử lý khi gõ vào ô Input Position
  const handlePositionChange = (e) => {
    const value = e.target.value;
    setPosition(value);
    setShowDropdown(true);
    fetchPositions(value);
  };

  // Xử lý khi click chọn 1 Option từ danh sách thả xuống
  const handleSelectPosition = (selectedPos) => {
    setPosition(selectedPos);
    setShowDropdown(false);
  };

  const onPick = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFile(f);
    setReport(null);
    setError(null);
  };

  const onClickUpload = () => {
    inputRef.current?.click();
  };

  const onSubmit = async () => {
    if (!file) {
      setError("Please select a CV file.");
      return;
    }
    if (!position.trim()) {
      setError("Please select or enter a position before submitting your CV.");
      return;
    }

    setLoading(true);
    setError(null);

    // --- FIX Ở ĐÂY ---
    // Chuyển đổi định dạng chữ cho phù hợp với Backend (VD: "Backend Developer" -> "BACKEND_DEVELOPER")
    const formattedPosition = position.trim().toUpperCase().replace(/\s+/g, "_");

    try {
      let token = getAccessToken();

      if (!token) {
        throw new Error(
          "Phiên đăng nhập không tồn tại. Vui lòng đăng nhập lại!",
        );
      }

      const sendRequest = async (authToken) => {
        const formData = new FormData();
        formData.append("file", file);
        // Thay vì gửi `position` gốc, gửi `formattedPosition` đã được format
        formData.append("position", formattedPosition);

        const cleanToken = authToken.replace(/^Bearer\s+/i, "");
        const bearerHeader = `Bearer ${cleanToken}`;

        return await fetch(`${API_BASE}/api/v1/cv-assessment/assess-cv`, {
          method: "POST",
          headers: {
            Authorization: bearerHeader,
          },
          body: formData,
        });
      };

      let res = await sendRequest(token);

      if (res.status === 401) {
        console.warn(
          "Token expired or invalid (401). Attempting token refresh...",
        );
        const newToken = await refreshAccessToken();

        if (newToken) {
          res = await sendRequest(newToken);
        } else {
          throw new Error(
            "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!",
          );
        }
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        const serverMsg = errData?.message || `Lỗi từ Server (${res.status})`;
        throw new Error(serverMsg);
      }

      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.error("CV Assessment Error:", err);
      setError(err.message || "Đã xảy ra lỗi. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cv-page-root">
      <NavigationBar />
      <main className="cv-main">
        <section className="cv-inner">
          <h1 className="cvassessment-title">-----CV ASSESSMENT-----</h1>

          {/* Autocomplete Input Search */}
          <div
            className="cv-position-picker"
            ref={dropdownRef}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "400px",
              margin: "0 auto 20px",
            }}
          >
            <input
              type="text"
              className="position-input"
              placeholder="Type or select a position..."
              value={position}
              onChange={handlePositionChange}
              onFocus={() => setShowDropdown(true)}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid #444",
                backgroundColor: "#1e1e2d",
                color: "#fff",
                fontSize: "14px",
                outline: "none",
              }}
            />

            {/* Dropdown Options hiện bên dưới */}
            {showDropdown && suggestions.length > 0 && (
              <ul
                className="position-dropdown"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  backgroundColor: "#1e1e2d",
                  border: "1px solid #333",
                  borderRadius: "8px",
                  marginTop: "6px",
                  maxHeight: "200px",
                  overflowY: "auto",
                  zIndex: 1000,
                  listStyle: "none",
                  padding: "0",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                }}
              >
                {suggestions.map((item, index) => (
                  <li
                    key={index}
                    onClick={() => handleSelectPosition(item)}
                    style={{
                      padding: "10px 16px",
                      cursor: "pointer",
                      color: "#eee",
                      borderBottom:
                        index !== suggestions.length - 1
                          ? "1px solid #2a2a3d"
                          : "none",
                      textAlign: "left",
                      fontSize: "14px",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#2b2b3d")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="cv-dropzone">
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden-file"
              onChange={onPick}
            />
            {!file && (
              <div className="cv-upload-empty" onClick={onClickUpload}>
                <div className="cv-plus">+</div>
                <div className="cv-hint">Please insert your file!</div>
              </div>
            )}

            {file && (
              <div className="cv-file-block">
                <div className="file-icon">PDF</div>
                <div className="file-name">{file.name}</div>
                <button
                  className="btn-assess"
                  onClick={onSubmit}
                  disabled={loading}
                >
                  Assess
                </button>
              </div>
            )}
          </div>

          {error && <p className="cv-error">{error}</p>}

          <div className="cv-loading-area">
            {loading && (
              <div className="cv-loader">
                <div className="orbit">
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                </div>
                <div className="loading-text">
                  Your CV is being judged, please wait!
                </div>
              </div>
            )}
          </div>

          <div className="cv-report-area">
            {report && (
              <div className="cv-report-card">
                <div className="score-circle">
                  {report.overall_score ?? 0}
                  <span>/100</span>
                </div>
                <div className="report-content">
                  <div className="report-title">CV Assessment Report</div>
                  <ul className="report-list">
                    <li>
                      <strong>Match score:</strong> {report.match_score}/100 —{" "}
                      {report.match_comment}
                    </li>
                    <li>
                      <strong>Layout:</strong> {report.layout_comment}
                    </li>
                    <li>
                      <strong>Suggestions:</strong>{" "}
                      {report.improvement_suggestion}
                    </li>
                  </ul>

                  {report.section_feedbacks &&
                    report.section_feedbacks.length > 0 && (
                      <ul className="report-list report-sections">
                        {report.section_feedbacks.map((section, idx) => {
                          const sectionKey =
                            typeof section.section_name === "string"
                              ? section.section_name.toUpperCase()
                              : section.section_name;

                          return (
                            <li key={idx}>
                              <strong>
                                {SECTION_LABELS[sectionKey] ||
                                  section.section_name}{" "}
                                ({section.score}/100):
                              </strong>{" "}
                              {section.comment}
                            </li>
                          );
                        })}
                      </ul>
                    )}

                  <div className="report-actions">
                    <button className="ghost">Self-practice</button>
                    <button className="primary">AI mock interview</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default CVAssessmentPage;