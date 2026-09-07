"use client";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AdNavigationBar from "../AdNavigationBar/AdNavigationBar";
import "./UserManagement.css";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";

const UserManagementPage = () => {
  const [activeTab, setActiveTab] = useState("Interviewer");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedUserId, setExpandedUserId] = useState(null);

  const [interviewers, setInterviewers] = useState([]);
  const [interviewees, setInterviewees] = useState([]);
  const [userBookings, setUserBookings] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Lấy danh sách Interviewer từ Backend dùng fetch
  const fetchInterviewerData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE_URL}/expertise/get-pending-expertise-request?page=0&size=50`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const content = data?.content || [];

      const mappedInterviewers = content.map((item) => ({
        id: `ITV-${item.interviewerId || item.id}`,
        rawId: item.interviewerId || item.id,
        name: item.interviewerName || "Interviewer",
        email: item.email || "N/A",
        position: `${item.position || ""} (${item.level || ""})`,
        role: "Interviewer",
        totalEarned: item.hourlyFee ? `$${item.hourlyFee}/h` : "N/A",
        status: "Pending",
        bookings: [],
      }));

      setInterviewers(mappedInterviewers);
    } catch (err) {
      console.error("Lỗi khi tải danh sách Interviewer:", err);
      setError(
        "Không thể tải danh sách Interviewer. Vui lòng kiểm tra quyền Admin hoặc kết nối mạng.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Lấy lịch sử Booking dùng fetch
  const fetchUserBookings = async (userId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/booking/all-bookings`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      setUserBookings((prev) => ({
        ...prev,
        [userId]: data || [],
      }));
    } catch (err) {
      console.error(`Lỗi tải lịch sử booking cho user ${userId}:`, err);
    }
  };

  useEffect(() => {
    if (activeTab === "Interviewer") {
      fetchInterviewerData();
    } else {
      setInterviewees([]);
    }
  }, [activeTab]);

  const toggleExpand = (user) => {
    const isOpening = expandedUserId !== user.id;
    setExpandedUserId(isOpening ? user.id : null);

    if (isOpening && !userBookings[user.id]) {
      fetchUserBookings(user.id);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setExpandedUserId(null);
  };

  const currentDataset =
    activeTab === "Interviewer" ? interviewers : interviewees;

  const filteredUsers = currentDataset.filter((user) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesName = user.name?.toLowerCase().includes(term);
    const matchesEmail = user.email?.toLowerCase().includes(term);
    const matchesId = user.id?.toLowerCase().includes(term);
    const pos = user.position || user.targetPosition || "";
    const matchesPosition = pos.toLowerCase().includes(term);

    return matchesName || matchesEmail || matchesId || matchesPosition;
  });

  return (
    <div className="admin-page-root">
      <AdNavigationBar />

      <main className="admin-main">
        <header className="admin-header">
          <h1 className="admin-pink-title">USER WORKSPACE MANAGEMENT</h1>
          <p className="admin-pink-subtitle">
            Quản lý danh sách thành viên & lịch sử đặt lịch hệ thống
          </p>
        </header>

        <div className="admin-controls-bar">
          <div className="pink-tab-switcher">
            <button
              type="button"
              className={`pink-tab-btn ${activeTab === "Interviewer" ? "active" : ""}`}
              onClick={() => handleTabChange("Interviewer")}
            >
              Interviewer ({interviewers.length})
            </button>
            <button
              type="button"
              className={`pink-tab-btn ${activeTab === "Interviewee" ? "active" : ""}`}
              onClick={() => handleTabChange("Interviewee")}
            >
              Interviewee ({interviewees.length})
            </button>
          </div>

          <div className="admin-search-wrapper">
            <input
              type="text"
              placeholder="Search by Name or Position..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-pink-search-input"
            />
          </div>
        </div>

        {loading && (
          <div className="admin-state-info">Đang tải dữ liệu từ server...</div>
        )}
        {error && <div className="admin-state-error">{error}</div>}

        {!loading && (
          <section className="admin-logs-section">
            <div className="ad-dashboard-table">
              <div className="ad-dashboard-row ad-dashboard-header">
                <span>USER ID</span>
                <span>NAME & EMAIL</span>
                <span>
                  {activeTab === "Interviewer"
                    ? "POSITION / EXPERTISE"
                    : "TARGET POSITION"}
                </span>
                <span>
                  {activeTab === "Interviewer" ? "HOURLY FEE" : "TOTAL SPENT"}
                </span>
                <span>STATUS</span>
                <span className="cell-action-header">ACTION</span>
              </div>

              <AnimatePresence initial={false}>
                {filteredUsers.map((user) => {
                  const isOpen = expandedUserId === user.id;
                  const bookings = userBookings[user.id] || [];

                  return (
                    <motion.div
                      key={user.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        layout: { duration: 0.3, ease: "easeInOut" },
                      }}
                      className="ad-dashboard-row-wrap"
                    >
                      <div className="ad-dashboard-row ad-dashboard-data-row">
                        <span className="user-id-pink">{user.id}</span>
                        <span className="user-info-cell">
                          <span className="user-profile-name">{user.name}</span>
                          <span className="user-profile-email">
                            {user.email}
                          </span>
                        </span>
                        <span className="user-position-text">
                          {user.position || user.targetPosition || "N/A"}
                        </span>
                        <span
                          className={
                            activeTab === "Interviewer"
                              ? "finance-out"
                              : "finance-in"
                          }
                        >
                          {user.totalEarned || user.totalSpent || "N/A"}
                        </span>
                        <span>
                          <span
                            className={`pink-status-tag ${user.status.toLowerCase()}`}
                          >
                            {user.status}
                          </span>
                        </span>
                        <span className="cell-action">
                          <button
                            type="button"
                            className={`admin-pink-action-btn ${isOpen ? "is-open" : ""}`}
                            onClick={() => toggleExpand(user)}
                          >
                            {isOpen ? "HIDE" : "VIEW"}
                          </button>
                        </span>
                      </div>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            key="booking-list-panel"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.28, ease: "easeInOut" }}
                            className="history-panel-wrap"
                          >
                            <div className="pink-booking-panel">
                              <div className="pink-panel-header">
                                <h3>
                                  BOOKING HISTORY — {user.name.toUpperCase()}
                                </h3>
                                <span className="pink-count-badge">
                                  {bookings.length} Bookings
                                </span>
                              </div>

                              <div className="nested-dashboard-table">
                                <div className="nested-dashboard-header">
                                  <span>BOOKING ID</span>
                                  <span>DATE</span>
                                  <span>TIME</span>
                                  <span>POSITION</span>
                                  <span>STATUS</span>
                                </div>

                                {bookings.map((bk) => (
                                  <div
                                    key={bk.bookingId || bk.id}
                                    className="nested-dashboard-row"
                                  >
                                    <span className="nested-id">
                                      #{bk.bookingId || bk.id}
                                    </span>
                                    <span>{bk.bookingDate || "N/A"}</span>
                                    <span>{bk.startTime || "N/A"}</span>
                                    <span className="nested-pos">
                                      {bk.position || "N/A"}
                                    </span>
                                    <span>
                                      <span
                                        className={`status-pill status-${(bk.status || "").toLowerCase()}`}
                                      >
                                        {bk.status || "UNKNOWN"}
                                      </span>
                                    </span>
                                  </div>
                                ))}

                                {bookings.length === 0 && (
                                  <div className="nested-empty">
                                    Không có lịch sử phỏng vấn nào recorded.
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {filteredUsers.length === 0 && (
                <div className="admin-table-empty">
                  {activeTab === "Interviewee"
                    ? "Hiện chưa có API lấy danh sách tổng Interviewee từ Backend."
                    : "Không tìm thấy người dùng nào phù hợp."}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default UserManagementPage;
