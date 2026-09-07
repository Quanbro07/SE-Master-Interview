"use client";
import AdNavigationBar from "../AdNavigationBar/AdNavigationBar";
import "./AdDashboard.css"; // Optional custom styling for this dashboard layout

const AdminDashboard = () => {
  // Demo stat data
  const stats = [
    { label: "Active Interviewees", count: "1,240", change: "+12% this week" },
    {
      label: "Verified Interviewers",
      count: "84",
      change: "+3 new applications",
    },
    {
      label: "Total Completed Matches",
      count: "3,892",
      change: "98% satisfaction rate",
    },
    { label: "Pending Issues/Tickets", count: "4", change: "Action required" },
  ];

  return (
    <div className="admin-page-root">
      <AdNavigationBar />
      <main className="admin-main">
        <header className="admin-header">
          <h1>Admin Command Dashboard</h1>
          <p className="demo-badge-banner">Demo Mode · System Access Granted</p>
        </header>

        <section className="admin-grid">
          {stats.map((stat, i) => (
            <div key={i} className="admin-stat-card">
              <h3>{stat.label}</h3>
              <p className="stat-number">{stat.count}</p>
              <span className="stat-subtext">{stat.change}</span>
            </div>
          ))}
        </section>

        <section className="admin-logs-section">
          <h2>System Operations Log (Recent Activity)</h2>
          <div className="log-table-wrapper">
            <table className="log-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action Event</th>
                  <th>User Role</th>
                  <th>Status Code</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>2026-07-20 09:42:11</td>
                  <td>System Route Re-routed to Admin Workspace</td>
                  <td>Developer Switch</td>
                  <td className="status-success">200 OK</td>
                </tr>
                <tr>
                  <td>2026-07-20 08:15:34</td>
                  <td>Database Fetch: /api/v1/question/question</td>
                  <td>Interviewee</td>
                  <td className="status-success">200 OK</td>
                </tr>
                <tr>
                  <td>2026-07-19 23:59:01</td>
                  <td>Automated System Backup Cycle</td>
                  <td>System Daemon</td>
                  <td className="status-success">Success</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
