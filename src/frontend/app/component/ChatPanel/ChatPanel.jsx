"use client";
import React, { useState, useEffect, useRef } from "react";
import "./ChatPanel.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

// Helper lấy JWT token an toàn từ localStorage
const getAccessToken = () => {
  if (typeof window === "undefined") return "";
  const keys = ["accessToken", "token", "jwt", "authToken", "access_token"];
  let token = "";

  for (const key of keys) {
    const val = localStorage.getItem(key);
    if (val) {
      token = val;
      break;
    }
  }

  if (!token) {
    try {
      const userObj = JSON.parse(localStorage.getItem("user") || "{}");
      token = userObj.token || userObj.accessToken || userObj.jwt || "";
    } catch (e) {
      console.error("Lỗi parse thông tin user:", e);
    }
  }

  if (!token) return "";
  return token.replace(/^"(.*)"$/, "$1").trim();
};

const ChatPanel = ({ isCollapsed }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "agent",
      text: "Xin chào! Tôi là AI Assistant. Bạn muốn đặt lịch phỏng vấn hay tìm hiểu thông tin gì?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!isCollapsed) {
      scrollToBottom();
    }
  }, [messages, loading, isCollapsed]);

  // Hàm xử lý gửi tin nhắn tới AI Agent Backend
  const handleSend = async () => {
    const userText = input.trim();
    if (!userText || loading) return;

    // 1. Thêm tin nhắn của User vào giao diện
    const userMessage = {
      id: Date.now(),
      sender: "user",
      text: userText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const token = getAccessToken();
      const headers = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // 2. Gọi API POST /api/v1/agent/prompt
      const res = await fetch(`${API_BASE}/api/v1/agent/prompt`, {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt: userText }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!");
        }
        throw new Error(`Lỗi server (${res.status})`);
      }

      const data = await res.json();

      // Trích xuất phản hồi từ ChatResponse<?> của Backend
      let replyText = "";
      if (typeof data === "string") {
        replyText = data;
      } else if (data?.response) {
        replyText =
          typeof data.response === "string"
            ? data.response
            : JSON.stringify(data.response);
      } else if (data?.message) {
        replyText = data.message;
      } else {
        replyText = "Đã thực hiện xong yêu cầu của bạn!";
      }

      // 3. Hiển thị tin nhắn phản hồi từ AI Agent
      const agentMessage = {
        id: Date.now() + 1,
        sender: "agent",
        text: replyText,
      };

      setMessages((prev) => [...prev, agentMessage]);
    } catch (err) {
      console.error("[AGENT CHAT ERROR]:", err);
      const errorMessage = {
        id: Date.now() + 1,
        sender: "agent",
        text: `⚠️ Lỗi: ${err.message || "Không thể kết nối đến AI Agent."}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <aside className={`chat-panel ${isCollapsed ? "collapsed" : ""}`}>
      {/* Thân tin nhắn */}
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-row ${msg.sender}`}>
            <div className="message-bubble">
              {msg.text.split("\n").map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
        ))}

        {/* Trạng thái đang chờ AI xử lý */}
        {loading && (
          <div className="message-row agent">
            <div className="message-bubble loading">
              <p>AI đang xử lý yêu cầu...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Ô nhập liệu */}
      <div className="chat-input-wrapper">
        <input
          type="text"
          placeholder="Nhập yêu cầu (VD: Đặt lịch phỏng vấn với Java Mentor...)"
          value={input}
          disabled={loading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}>
          Gửi
        </button>
      </div>
    </aside>
  );
};

export default ChatPanel;
