"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import "./UserHeader.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const UserHeader = ({ user, onToggleChat, isChatOpen }) => {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  // Hàm xử lý Logout
  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      // 1. Lấy Token & RefreshToken
      const accessToken =
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt") ||
        "";
      const refreshToken =
        localStorage.getItem("refreshToken") ||
        localStorage.getItem("refresh_token") ||
        "";

      const cleanAccess = accessToken.replace(/^Bearer\s+/i, "").trim();
      const cleanRefresh = refreshToken.replace(/^Bearer\s+/i, "").trim();

      // 2. Gọi API Logout Backend (AuthenticationController)
      if (cleanAccess) {
        await fetch(`${API_BASE}/api/v1/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cleanAccess}`,
          },
          body: JSON.stringify({ refreshToken: cleanRefresh }),
        }).catch((err) => console.warn("Backend logout error:", err));
      }
    } catch (e) {
      console.error("Logout exception:", e);
    } finally {
      // 3. Dọn dẹp sạch sẽ localStorage
      const keysToRemove = [
        "accessToken",
        "token",
        "jwt",
        "authToken",
        "access_token",
        "refreshToken",
        "refresh_token",
        "user",
        "interviewerSchedule",
        "interviewerBookings",
      ];
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      // 4. Điều hướng về Landing Page (Trang chủ `/`)
      router.push("/");
    }
  };

  return (
    <div className={`user-header-container ${isChatOpen ? "expanded" : ""}`}>
      {/* Nút Chatbot / Profile User nằm bên TAY TRÁI nút Logout */}
      <div className="chat-trigger-header" onClick={onToggleChat}>
        <div className="chatbot-icon">
          <img src="/logo.png" alt="Chatbot Icon" />
        </div>
        <span className="user-name">
          {user?.fullName || user?.userName || "Interviewee"}
        </span>
        <div className="user-avatar">
          <img src={user?.avatar || "/user.png"} alt="User Avatar" />
        </div>
      </div>

      {/* Nút LOGOUT ngoài cùng bên TAY PHẢI (Màu xanh tím) */}
      <button
        className="logout-btn"
        onClick={handleLogout}
        disabled={loggingOut}
      >
        {loggingOut ? "LOGGING OUT..." : "LOGOUT"}
      </button>
    </div>
  );
};

export default UserHeader;
