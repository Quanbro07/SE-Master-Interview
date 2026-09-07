"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./NavigationBar.css";
import { useState } from "react";

const navItems = [
  { label: "Interview booking", href: "/interview-booking" },
  { label: "Self-practice", href: "/self-practice" },
  { label: "CV assessment", href: "/cv-assessment" },
  { label: "Booking history", href: "/booking-history" },
];

const NavigationBar = () => {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleNavbar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const isActive = (href) => pathname === href;

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
    </aside>
  );
};

export default NavigationBar;
