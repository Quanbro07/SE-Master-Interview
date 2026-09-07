"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = "http://localhost:8080";

export default function SuccessPage() {
  const [checking, setChecking] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const router = useRouter();

  const getAuthHeader = () => {
    const rawToken =
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("jwt") ||
      localStorage.getItem("authToken") ||
      "";
    if (!rawToken || rawToken === "undefined" || rawToken === "null") return "";
    const normalizedToken = String(rawToken)
      .replace(/^"(.*)"$/, "$1")
      .trim();
    return normalizedToken.startsWith("Bearer ")
      ? normalizedToken
      : `Bearer ${normalizedToken}`;
  };

  useEffect(() => {
    let timer;
    let attempts = 0;
    const maxAttempts = 5;

    const verifyStripeStatus = async () => {
      try {
        const authHeader = getAuthHeader();
        if (!authHeader) {
          setChecking(false);
          return;
        }

        const res = await fetch(`${API_BASE}/api/v1/user/me`, {
          headers: { Authorization: authHeader },
        });

        if (res.ok) {
          const userData = await res.json();
          const status = Boolean(
            userData.is_stripe_connected || userData.isStripeConnected,
          );

          if (status) {
            setIsConnected(true);
            setChecking(false);

            const cached = JSON.parse(localStorage.getItem("user") || "{}");
            localStorage.setItem(
              "user",
              JSON.stringify({
                ...cached,
                ...userData,
                is_stripe_connected: true,
              }),
            );
            return;
          }
        }
      } catch (err) {
        console.error("Lỗi xác minh kết nối Stripe:", err);
      }

      attempts++;
      if (attempts < maxAttempts) {
        timer = setTimeout(verifyStripeStatus, 2000);
      } else {
        // Hết thời gian chờ nhưng vẫn đánh dấu local để không block user
        localStorage.setItem("is_stripe_connected", "true");
        setChecking(false);
      }
    };

    verifyStripeStatus();

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#0d0d12",
        color: "#fff",
        fontFamily: "sans-serif",
      }}
    >
      {/* Sửa lại render chuỗi trực tiếp, không dùng Object */}
      <h2 style={{ fontSize: "1.5rem", marginBottom: "12px" }}>
        {checking
          ? "Đang đồng bộ tài khoản Stripe..."
          : isConnected
            ? "Stripe Setup Complete 🎉"
            : "Hoàn tất thao tác trên Stripe!"}
      </h2>

      <p style={{ color: "#aaa", marginBottom: "24px" }}>
        {checking
          ? "Vui lòng chờ trong giây lát để hệ thống xác nhận dữ liệu..."
          : isConnected
            ? "Tài khoản Stripe của bạn đã kết nối thành công với hệ thống."
            : "Quá trình cập nhật trạng thái có thể mất vài giây do độ trễ của Webhook. Bạn có thể quay lại Profile để tiếp tục."}
      </p>

      <Link
        href="/interviewer/profile"
        style={{
          color: "#8b5cf6",
          textDecoration: "underline",
          fontWeight: "500",
          fontSize: "1rem",
        }}
      >
        Quay lại trang Profile
      </Link>
    </div>
  );
}
