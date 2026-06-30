"use client";
import "./NavigationBar.css";
import { useState } from "react";
const navItems = [
  { label: "Interview booking", active: true },
  { label: "Mock interview" },
  { label: "Self-practice" },
  { label: "CV assessment" },
  { label: "Feedback" },
  { label: "Booking history" },
];

const NavigationBar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const toggleNavbar = () => {
    setIsCollapsed(!isCollapsed);
  };
  return (
    <aside className={`navigation-bar ${isCollapsed ? "collapsed" : ""}`}>
      <div className="nav-brand">
        <div
          className="brand-icon"
          onClick={isCollapsed ? toggleNavbar : undefined}
          style={{ cursor: isCollapsed ? "pointer" : "default" }}
        >
          <img src="/logo.png" alt="Logo" className="logo-image" />
        </div>
        <div className="brand-text">
          <p className="brand-title">Master Interview</p>
        </div>
        <div className="close-icon" onClick={toggleNavbar}>
          <img src="/close.png" alt="Close" className="close-image" />
        </div>
      </div>

      <nav className="nav-list">
        {navItems.map((item) => (
          <div
            key={item.label}
            className={`nav-item${item.active ? " nav-item--active" : ""}`}
          >
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default NavigationBar;
