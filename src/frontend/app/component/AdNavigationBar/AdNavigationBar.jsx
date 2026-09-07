"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./AdNavigationBar.css";
import { useState } from "react";

const navItems = [{ label: "Expertise Requests", href: "/admin/expertise" }];

const AdNavigationBar = () => {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleNavbar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const isActive = (href) =>
    pathname === href || (href === "/admin" && pathname === "/admin/expertise");

  return (
    <aside className={`ad-navigation-bar ${isCollapsed ? "collapsed" : ""}`}>
      <div className="ad-nav-brand">
        <div
          className="ad-brand-icon"
          onClick={isCollapsed ? toggleNavbar : undefined}
          style={{ cursor: isCollapsed ? "pointer" : "default" }}
        >
          <img src="/logo.png" alt="Logo" className="ad-logo-image" />
        </div>

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
      {/* Đã gỡ bỏ toàn bộ sticker switch role tại đây */}
    </aside>
  );
};

export default AdNavigationBar;
