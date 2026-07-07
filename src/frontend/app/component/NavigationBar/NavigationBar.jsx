"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import "./NavigationBar.css";
import { useState } from "react";

const navItems = [
  { label: "Interview booking", href: "/interview-booking" },
  { label: "Mock interview", href: "/mock-interview" },
  { label: "Self-practice", href: "/self-practice" },
  { label: "CV assessment", href: "/cv-assessment" },
  { label: "Feedback", href: "/feedback" },
  { label: "Booking history", href: "/booking-history" },
];

const NavigationBar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleNavbar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const isActive = (href) =>
    pathname === href || (href === "/feedback" && pathname === "/");

  // DEV-ONLY: swap to the interviewer side. Once the backend has a real
  // `type` field on the user, replace this with an actual role check /
  // account switch instead of a hardcoded route jump.
  const switchToInterviewer = () => {
    router.push("/interviewer/dashboard");
  };

  return (
    <aside className={`navigation-bar ${isCollapsed ? "collapsed" : ""}`}>
      <div className="nav-brand">
        {/* Click vào logo để mở lại Navbar khi đang thu gọn */}
        <div
          className="brand-icon"
          onClick={isCollapsed ? toggleNavbar : undefined}
          style={{ cursor: isCollapsed ? "pointer" : "default" }}
        >
          <img src="/logo.png" alt="Logo" className="logo-image" />
        </div>

        {/* Chỉ hiển thị Tên thương hiệu và Nút Đóng khi chưa bị thu gọn */}
        {!isCollapsed && (
          <>
            <div className="brand-text">
              <p className="brand-title">Master Interview</p>
            </div>
            <div className="close-icon" onClick={toggleNavbar}>
              <img src="/close.png" alt="Close" className="close-image" />
            </div>
          </>
        )}
      </div>

      <nav className="nav-list">
        {navItems.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`nav-item ${active ? "nav-item--active" : ""}`}
            >
              {isCollapsed ? (
                <span className="collapsed-icon-text">
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
      <button
        type="button"
        className="role-switch-fab change-to-interviewer"
        onClick={switchToInterviewer}
        title="Switch to Interviewer view (dev only)"
      >
        <span className="role-switch-fab-label">R</span>
        <span className="role-switch-tooltip">Switch to Interviewer</span>
      </button>
    </aside>
  );
};

export default NavigationBar;
