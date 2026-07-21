"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AdNavigationBar from "../AdNavigationBar/AdNavigationBar";
import "./UserManagement.css";

const initialUsers = [
  {
    id: "USR-001",
    name: "Nguyen Van A",
    email: "interviewee.a@gmail.com",
    role: "Interviewee",
    totalSpent: "$450.00",
    totalEarned: "$0.00",
    joinedDate: "2026-05-12",
    status: "Active",
    historyCount: 3,
  },
  {
    id: "USR-002",
    name: "Dr. Lê Hoàng",
    email: "interviewer.hoang@gmail.com",
    role: "Interviewer",
    totalSpent: "$0.00",
    totalEarned: "$1,200.00",
    joinedDate: "2026-02-20",
    status: "Active",
    historyCount: 3,
  },
  {
    id: "USR-003",
    name: "Trần Thị B",
    email: "interviewee.b@gmail.com",
    role: "Interviewee",
    totalSpent: "$120.00",
    totalEarned: "$0.00",
    joinedDate: "2026-07-01",
    status: "Suspended",
    historyCount: 2,
  },
];

const UserManagementPage = () => {
  const [users] = useState(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [expandedUserId, setExpandedUserId] = useState(null); // Quản lý ID dòng đang mở

  const toggleExpandHistory = (id) => {
    setExpandedUserId((prev) => (prev === id ? null : id));
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "All" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="admin-page-root">
      <AdNavigationBar />

      <main className="admin-main">
        <header className="admin-header">
          <h1>User Workspace Management</h1>
          <p className="demo-badge-banner">Finance & Activity Control Center</p>
        </header>

        {/* SEARCH & FILTER BAR */}
        <div className="admin-controls-bar">
          <div className="search-box-wrapper">
            <input
              type="text"
              placeholder="Search by ID, Name or Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-search-input"
            />
          </div>

          <div className="filter-box-wrapper">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="admin-filter-select"
            >
              <option value="All">All Roles</option>
              <option value="Interviewee">Interviewees (Ứng viên)</option>
              <option value="Interviewer">
                Interviewers (Người phỏng vấn)
              </option>
            </select>
          </div>
        </div>

        {/* DANH SÁCH BẢNG QUẢN LÝ DẠNG GRID/FLEX ĐỂ TRANSLATE MƯỢT MÀ */}
        <section className="admin-logs-section">
          <div className="ad-dashboard-table">
            {/* Header Bảng */}
            <div className="ad-dashboard-row ad-dashboard-header">
              <span>USER ID</span>
              <span>BASIC INFO</span>
              <span>ROLE</span>
              <span>THU VÀO (SPENT)</span>
              <span>CHI TRẢ (EARNED)</span>
              <span>STATUS</span>
              <span className="cell-action-header">ACTION</span>
            </div>

            {/* Thân Bảng hỗ trợ hiệu ứng layout của Framer Motion */}
            <AnimatePresence initial={false}>
              {filteredUsers.map((user) => {
                const isOpen = expandedUserId === user.id;

                return (
                  <motion.div
                    key={user.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      layout: { duration: 0.4, ease: "easeInOut" },
                    }}
                    className="ad-dashboard-row-wrap"
                  >
                    {/* Dòng dữ liệu chính */}
                    <div className="ad-dashboard-row ad-dashboard-data-row">
                      <span className="user-id-text">{user.id}</span>
                      <span className="user-info-cell">
                        <span className="user-profile-name">{user.name}</span>
                        <span className="user-profile-email">{user.email}</span>
                      </span>
                      <span>
                        <span className={`role-tag ${user.role.toLowerCase()}`}>
                          {user.role}
                        </span>
                      </span>
                      <span className="finance-in">
                        {user.totalSpent !== "$0.00" ? user.totalSpent : "—"}
                      </span>
                      <span className="finance-out">
                        {user.totalEarned !== "$0.00" ? user.totalEarned : "—"}
                      </span>
                      <span>
                        <span
                          className={`status-tag ${user.status.toLowerCase()}`}
                        >
                          {user.status}
                        </span>
                      </span>
                      <span className="cell-action">
                        <button
                          type="button"
                          className={`admin-action-btn ${isOpen ? "is-open" : ""}`}
                          onClick={() => toggleExpandHistory(user.id)}
                        >
                          {isOpen
                            ? "Hide History"
                            : `History (${user.historyCount})`}
                        </button>
                      </span>
                    </div>

                    {/* Panel trượt xuống hiển thị lịch sử (Dropdown Accordion) */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          key="history-panel"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: "easeInOut" }}
                          className="history-panel-wrap"
                        >
                          <div className="history-dropdown-panel">
                            <h3 className="panel-inner-title">
                              Activity Log Details — {user.name} ({user.role})
                            </h3>

                            <div className="panel-financial-overview">
                              <p>
                                <strong>Account Registration Date:</strong>{" "}
                                {user.joinedDate}
                              </p>
                              <p>
                                <strong>Financial Statement:</strong>{" "}
                                <span className="finance-in">
                                  {user.totalSpent} In
                                </span>
                                {" | "}
                                <span className="finance-out">
                                  {user.totalEarned} Out
                                </span>
                              </p>
                            </div>

                            <div className="ad-mock-timeline">
                              <div className="ad-timeline-item">
                                <span className="ad-timeline-date">
                                  2026-07-18 14:00
                                </span>
                                <span className="ad-timeline-desc">
                                  {user.role === "Interviewee"
                                    ? "Successfully paid $50.00 via Stripe for Mock Interview Session #883"
                                    : "Finished hosting Session #883 - Transferred $40.00 to balance"}
                                </span>
                              </div>
                              <div className="ad-timeline-item">
                                <span className="ad-timeline-date">
                                  2026-07-10 09:30
                                </span>
                                <span className="ad-timeline-desc">
                                  Logged into system dashboard via desktop
                                  client.
                                </span>
                              </div>
                              <div className="ad-timeline-item">
                                <span className="ad-timeline-date">
                                  {user.joinedDate}
                                </span>
                                <span className="ad-timeline-desc">
                                  Account created and assigned to security
                                  group.
                                </span>
                              </div>
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
                No users matched your current workspace search filters.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default UserManagementPage;
