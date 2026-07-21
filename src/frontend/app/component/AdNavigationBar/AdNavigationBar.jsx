"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import "./AdNavigationBar.css";
import { useState } from "react";

const navItems = [
  { label: "Admin Dashboard", href: "/admin" },
  { label: "User Management", href: "/admin/users" },
  { label: "System Analytics", href: "/admin/analytics" },
  { label: "Global Settings", href: "/admin/settings" },
];

const AdNavigationBar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleNavbar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const isActive = (href) =>
    pathname === href || (href === "/admin" && pathname === "/admin/dashboard");

  // DEV-ONLY Role Switchers
  const switchToInterviewee = () => {
    router.push("/interview-booking");
  };

  const switchToInterviewer = () => {
    router.push("/interviewer/dashboard");
  };

  return (
    <aside className={`ad-navigation-bar ${isCollapsed ? "collapsed" : ""}`}>
      <div className="ad-nav-brand">
        {/* Click vào logo để mở lại Navbar khi đang thu gọn */}
        <div
          className="ad-brand-icon"
          onClick={isCollapsed ? toggleNavbar : undefined}
          style={{ cursor: isCollapsed ? "pointer" : "default" }}
        >
          <img src="/logo.png" alt="Logo" className="ad-logo-image" />
        </div>

        {/* Chỉ hiển thị Tên thương hiệu và Nút Đóng khi chưa bị thu gọn */}
        {!isCollapsed && (
          <>
            <div className="ad-brand-text">
              <p className="ad-brand-title">Master Interview</p>
              <span className="ad-admin-badge">ADMIN</span>
            </div>
            <div className="ad-close-icon" onClick={toggleNavbar}>
              <img src="/close.png" alt="Close" className="ad-close-image" />
            </div>
          </>
        )}
      </div>

      <nav className="ad-nav-list">
        {navItems.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`ad-nav-item ${active ? "ad-nav-item--active" : ""}`}
            >
              {isCollapsed ? (
                <span className="ad-collapsed-icon-text">
                  {item.label.charAt(0)}
                </span>
              ) : (
                <span>{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* DEV role switcher */}
      <div className="ad-role-switch-container">
        <button
          type="button"
          className="ad-role-switch-fab change-to-interviewee"
          onClick={switchToInterviewee}
          title="Switch to Interviewee view (dev only)"
        >
          <span className="ad-role-switch-fab-label">E</span>
          <span className="ad-role-switch-tooltip">To Interviewee</span>
        </button>

        <button
          type="button"
          className="ad-role-switch-fab change-to-interviewer"
          onClick={switchToInterviewer}
          title="Switch to Interviewer view (dev only)"
        >
          <span className="ad-role-switch-fab-label">R</span>
          <span className="ad-role-switch-tooltip">To Interviewer</span>
        </button>
      </div>
    </aside>
  );
};

export default AdNavigationBar;
