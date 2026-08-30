"use client";
import { useEffect, useState } from "react";
import AdNavigationBar from "@/app/component/AdNavigationBar/AdNavigationBar";
import "@/app/component/UserManagement/UserManagement.css";
import "./ExpertiseManagement.css";

const ExpertiseManagementPage = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null); // State lưu trữ Toast message { text, type }
  const [processingId, setProcessingId] = useState(null); // Quản lý trạng thái loading từng nút

  // Hàm hiển thị Toast tự động ẩn sau 3s
  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

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
    return token
      .replace(/^"(.*)"$/, "$1")
      .replace(/^Bearer\s+/i, "")
      .trim();
  };

  const getBrowserCvUrl = (url) => {
    if (!url) return "#";
    return url.replace("host.docker.internal", "localhost");
  };

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const cleanToken = getAccessToken();

      const res = await fetch(
        "/api/v1/expertise/get-pending-expertise-request?page=0&size=10",
        {
          headers: {
            "Content-Type": "application/json",
            ...(cleanToken ? { Authorization: `Bearer ${cleanToken}` } : {}),
          },
        },
      );

      if (res.ok) {
        const data = await res.json();
        const listData =
          data.content || data.data || (Array.isArray(data) ? data : []);
        setPendingRequests(listData);
      } else {
        showToast(`Lỗi khi tải danh sách: HTTP ${res.status}`, "error");
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách Expertise:", err);
      showToast("Không thể kết nối đến máy chủ", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const handleApprove = async (interviewerId, positionId) => {
    if (!interviewerId || !positionId) {
      showToast("Thiếu ID thông tin Interviewer hoặc Position!", "error");
      return;
    }

    setProcessingId(interviewerId + "-" + positionId);

    try {
      const cleanToken = getAccessToken();

      const res = await fetch(
        `/api/v1/expertise/certify-expertise?interviewer_id=${interviewerId}&position_id=${positionId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(cleanToken ? { Authorization: `Bearer ${cleanToken}` } : {}),
          },
        },
      );

      if (res.ok) {
        showToast("Duyệt cấp chứng nhận Expertise thành công!", "success");
        fetchPendingRequests();
      } else {
        showToast(`Duyệt thất bại! (Mã lỗi: ${res.status})`, "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Có lỗi xảy ra trong quá trình xử lý!", "error");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="admin-page-root">
      <AdNavigationBar />

      <main className="admin-main">
        <header className="admin-header">
          <h1>Expertise Certification Requests</h1>
          <p className="demo-badge-banner">Pending Review & Verification</p>
        </header>

        <section className="admin-logs-section">
          <div className="ad-dashboard-table">
            <div className="ad-dashboard-row ad-dashboard-header">
              <span>INTERVIEWER ID</span>
              <span>NAME / EMAIL</span>
              <span>POSITION</span>
              <span>LEVEL</span>
              <span>EXPERIENCE</span>
              <span>HOURLY FEE</span>
              <span style={{ textAlign: "right" }}>ACTION</span>
            </div>

            {loading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "50px 20px",
                  color: "#9ca3af",
                  fontSize: "1rem",
                }}
              >
                Đang tải danh sách...
              </div>
            ) : pendingRequests.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  color: "#9ca3af",
                  fontSize: "1.1rem",
                  fontWeight: "500",
                }}
              >
                Không có yêu cầu cấp Expertise nào đang chờ duyệt.
              </div>
            ) : (
              pendingRequests.map((req, idx) => {
                const id =
                  req.interviewerId ||
                  req.interviewer_id ||
                  req.userId ||
                  req.user_id ||
                  req.id ||
                  "N/A";
                const positionId =
                  req.positionId || req.position_id || req.position?.id;
                const name =
                  req.interviewerName ||
                  req.interviewer_name ||
                  req.fullName ||
                  req.full_name ||
                  req.name ||
                  "N/A";
                const email =
                  req.email || req.interviewerEmail || "Chưa cập nhật";
                const positionName =
                  req.positionName ||
                  req.position_name ||
                  req.position ||
                  "N/A";
                const level = req.level || "N/A";
                const experience =
                  req.experienceYear ??
                  req.experience_year ??
                  req.experience ??
                  0;
                const fee = req.hourlyFee ?? req.hourly_fee ?? req.fee ?? 0;
                const cv = req.cvUrl || req.cv_url || req.fileUrl;

                const isApproving = processingId === id + "-" + positionId;

                return (
                  <div
                    key={id + "-" + idx}
                    className="ad-dashboard-row ad-dashboard-data-row"
                  >
                    <span className="user-id-text">#{id}</span>
                    <span className="user-info-cell">
                      <span className="user-profile-name">{name}</span>
                      <span className="user-profile-email">{email}</span>
                    </span>
                    <span>
                      <strong style={{ color: "#e4e4e7" }}>
                        {positionName}
                      </strong>
                    </span>
                    <span style={{ color: "#a1a1aa", fontWeight: 600 }}>
                      {level}
                    </span>
                    <span>{experience} Years</span>
                    <span className="finance-in">${fee}/h</span>
                    <span className="cell-action">
                      {cv && (
                        <a
                          href={getBrowserCvUrl(cv)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-view-cv"
                        >
                          View CV
                        </a>
                      )}
                      <button
                        type="button"
                        className="btn-approve"
                        disabled={isApproving}
                        onClick={() => handleApprove(id, positionId)}
                      >
                        {isApproving ? "Approving..." : "Approve"}
                      </button>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Component Render Toast Toast Message */}
        {toast && (
          <div className={`admin-toast ${toast.type}`}>
            <span>{toast.type === "success" ? "✓" : "✕"}</span>
            <span>{toast.text}</span>
          </div>
        )}
      </main>
    </div>
  );
};

export default ExpertiseManagementPage;
