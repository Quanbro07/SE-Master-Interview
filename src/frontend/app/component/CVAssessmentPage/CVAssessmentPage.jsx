"use client";
import { useRef, useState } from "react";
import NavigationBar from "../NavigationBar/NavigationBar";
import "./CVAssessmentPage.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

// Helper lấy Access Token ưu tiên key chuẩn
const getAccessToken = () => {
  if (typeof window === "undefined") return "";

  // Ưu tiên theo thứ tự tên key chuẩn thường dùng
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

// Cập nhật lại tất cả token key trong LocalStorage để giữ đồng bộ
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

// Hàm Refresh Token (Sửa lại hỗ trợ cả gửi Body JSON lẫn Header)
const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  // Xử lý làm sạch token
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
      body: JSON.stringify({ refreshToken: cleanRefreshToken }), // Gửi kèm Body đề phòng AuthController yêu cầu Body
    });

    if (!res.ok) {
      // Nếu Refresh Token cũng bị 401 -> Xóa cờ đăng nhập và bắt User Login lại
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

  const [position, setPosition] = useState("");

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
    if (!position) {
      setError("Please select a position before submitting your CV.");
      return;
    }

    setLoading(true);
    setError(null);

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
        formData.append("position", position);

        // Làm sạch chuỗi token trước khi ghép vào header Bearer
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

      // Xử lý khi bị 401 Unauthorized
      if (res.status === 401) {
        console.warn(
          "Token expired or invalid (401). Attempting token refresh...",
        );
        const newToken = await refreshAccessToken();

        if (newToken) {
          // Gửi lại request với token mới tạo thành công
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

          <div className="cv-position-picker">
            <select
              id="position-select"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            >
              <option value="">Select a position…</option>
              <option value="Backend Developer">Backend Developer</option>
              <option value="Frontend Developer">Frontend Developer</option>
              <option value="Data Engineer">Data Engineer</option>
              <option value="Full-Stack Developer">Full-Stack Developer</option>
              <option value="DevOps Engineer">DevOps Engineer</option>
            </select>
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
