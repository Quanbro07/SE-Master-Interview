"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./RNavigationBar.css";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/interviewer/dashboard" },
  { label: "Booking requests", href: "/interviewer/booking-requests" },
  { label: "Calendar", href: "/interviewer/calendar" },
  { label: "Profile", href: "/interviewer/profile" },
];

const RNavigationBar = () => {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleNavbar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const isActive = (href) =>
    pathname === href ||
    (href === "/interviewer/dashboard" && pathname === "/interviewer");

  return (
    <aside className={`i-nav-bar ${isCollapsed ? "collapsed" : ""}`}>
      <div className="i-nav-brand">
        {/* Click the logo to reopen the navbar when collapsed */}
        <div
          className="i-nav-brand-icon"
          onClick={isCollapsed ? toggleNavbar : undefined}
          style={{ cursor: isCollapsed ? "pointer" : "default" }}
        >
          <img src="/logo.png" alt="Logo" className="i-nav-logo-image" />
        </div>

        {/* Only show brand name and close button when not collapsed */}
        {!isCollapsed && (
          <>
            <div className="i-nav-brand-text">
              <p className="i-nav-brand-title">Master Interview</p>
            </div>
            <div className="i-nav-close-icon" onClick={toggleNavbar}>
              <img src="/close.png" alt="Close" className="i-nav-close-image" />
            </div>
          </>
        )}
      </div>

      <nav className="i-nav-list">
        {navItems.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`i-nav-item ${active ? "i-nav-item--active" : ""}`}
            >
              {isCollapsed ? (
                <span className="i-nav-collapsed-icon-text">
                  {item.label.charAt(0)}
                </span>
              ) : (
                <span>{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default RNavigationBar;
