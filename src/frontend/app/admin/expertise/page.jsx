"use client";
import { useEffect, useState } from "react";
import AdNavigationBar from "@/app/component/AdNavigationBar/AdNavigationBar";
import "@/app/component/UserManagement/UserManagement.css";
import "./ExpertiseManagement.css";

const ExpertiseManagementPage = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🛠️ Hàm lấy Token chuẩn từ SelfPracticePage (Loại bỏ ngoặc bọc "..." và bóc tách Bearer trùng)
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

  // Convert URL MinIO/Docker về localhost cho trình duyệt mở CV
  const getBrowserCvUrl = (url) => {
    if (!url) return "#";
    return url.replace("host.docker.internal", "localhost");
  };

  // 1. Fetch danh sách Pending Expertise Requests từ Backend
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
        console.log("🔥 DỮ LIỆU THỰC TẾ TỪ BACKEND:", data);

        const listData =
          data.content || data.data || (Array.isArray(data) ? data : []);
        setPendingRequests(listData);
      } else {
        console.error("Lỗi API Status:", res.status);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách Expertise:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  // 2. Gọi API Duyệt Chứng Nhận
  const handleApprove = async (interviewerId, positionId) => {
    if (!interviewerId || !positionId) {
      alert("Thiếu ID của Interviewer hoặc Position!");
      return;
    }

    if (!confirm("Bạn có chắc chắn muốn duyệt cấp Expertise này?")) return;

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
        alert("Duyệt thành công!");
        fetchPendingRequests();
      } else {
        alert(`Có lỗi xảy ra khi duyệt! (Mã lỗi: ${res.status})`);
      }
    } catch (err) {
      console.error(err);
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
              <span className="cell-action-header">ACTION</span>
            </div>

            {loading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  color: "#888",
                  fontSize: "1.1rem",
                  fontWeight: 500,
                }}
              >
                Đang tải danh sách...
              </div>
            ) : pendingRequests.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "50px 20px",
                  color: "#9ca3af",
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  letterSpacing: "0.5px",
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
                const email = req.email || "Chưa cập nhật";
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
                      <strong>{positionName}</strong>
                    </span>
                    <span>{level}</span>
                    <span>{experience} Years</span>
                    <span className="finance-in">${fee}/h</span>
                    <span className="cell-action">
                      {cv && (
                        <a
                          href={getBrowserCvUrl(cv)}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            marginRight: "10px",
                            color: "#3b82f6",
                            textDecoration: "underline",
                          }}
                        >
                          View CV
                        </a>
                      )}
                      <button
                        type="button"
                        className="admin-action-btn"
                        style={{ backgroundColor: "#10b981", color: "#fff" }}
                        onClick={() => handleApprove(id, positionId)}
                      >
                        Approve
                      </button>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ExpertiseManagementPage;
