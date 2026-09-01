"use client";
import { useRef, useState, useEffect } from "react";
import NavigationBar from "../NavigationBar/NavigationBar";
import ChatPanel from "../ChatPanel/ChatPanel";
import UserHeader from "../UserHeader/UserHeader";
import "./CVAssessmentPage.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

// ✅ Hàm lấy Access Token chuẩn hoá triệt để
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

  // Xóa sạch ngoặc kép và chữ Bearer nếu bị lưu thừa trong localStorage
  return token
    .replace(/^"+|"+$/g, "")
    .replace(/^Bearer\s+/i, "")
    .trim();
};

// ✅ Helper tạo Authorization Header chuẩn
const authHeaders = () => {
  const token = getAccessToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
};

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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const [position, setPosition] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchPositions("");
  }, []);

  const handleToggleChat = () => {
    setIsChatOpen((prev) => !prev);
  };

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) setCurrentUser(JSON.parse(userStr));
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPositions = async (query) => {
    try {
      const endpoint = query.trim()
        ? `${API_BASE}/api/v1/position/search?q=${encodeURIComponent(query)}`
        : `${API_BASE}/api/v1/position/get-all`;

      const res = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(), // ✅ Sử dụng authHeaders mới
        },
      });

      if (res.ok) {
        const data = await res.json();
        setSuggestions(data || []);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error("Failed to fetch positions:", err);
      setSuggestions([]);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (showDropdown) {
        fetchPositions(position);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [position, showDropdown]);

  const handlePositionChange = (e) => {
    const value = e.target.value;
    setPosition(value);
    setShowDropdown(true);
    fetchPositions(value);
  };

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

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("position", position.trim());

      const res = await fetch(`${API_BASE}/api/v1/cv-assessment/assess-cv`, {
        method: "POST",
        headers: {
          ...authHeaders(), // ✅ Sử dụng authHeaders mới
        },
        body: formData,
      });

      if (res.status === 401) {
        setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
        setLoading(false);
        return;
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
      <UserHeader
        user={currentUser}
        isChatOpen={isChatOpen}
        onToggleChat={handleToggleChat}
      />
      <ChatPanel isCollapsed={!isChatOpen} onBookFromChat={() => {}} />
      <main className={`cv-main ${isChatOpen ? "with-chat" : ""}`}>
        <section className="cv-inner">
          <h1 className="cvassessment-title">CV ASSESSMENT</h1>

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
                textTransform: "uppercase", // ✅ Chuyển giao diện hiển thị trong ô nhập thành IN HOA
              }}
            />

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
                      textTransform: "uppercase", // ✅ Chuyển giao diện các item gợi ý thành IN HOA
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
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <div key={idx} className="dot" />
                  ))}
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
