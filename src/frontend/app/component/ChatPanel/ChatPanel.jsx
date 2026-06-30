"use client";
import React, { useState } from "react";
import "./ChatPanel.css"; // Đảm bảo đường dẫn file CSS chính xác

const ChatPanel = () => {
  // Mock dữ liệu tin nhắn khớp với ảnh mẫu
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "user",
      text: "Give me some questions about Back-end developement when being interviewed.",
    },
    {
      id: 2,
      sender: "agent",
      text: "Sure! Here are your questions about Back-end development.\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    },
    {
      id: 3,
      sender: "user",
      text: "Show me the key answer",
    },
    {
      id: 4,
      sender: "agent",
      text: "Sure!\n-Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n-Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    },
  ]);

  const [input, setInput] = useState("");

  const handleSendMessage = (e) => {
    if (e.key === "Enter" && input.trim() !== "") {
      setMessages([
        ...messages,
        { id: Date.now(), sender: "user", text: input },
      ]);
      setInput("");
    }
  };

  return (
    <aside className="chat-panel">
      {/* Chat Header */}
      <div className="chat-header">
        <span className="user-name">John</span>
        <div className="user-avatar">
          <img src="/user.png" alt="User Avatar" />
        </div>
      </div>

      {/* Khu vực hiển thị tin nhắn */}
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
      </div>

      {/* Ô nhập liệu tin nhắn phía dưới */}
      <div className="chat-input-wrapper">
        <input
          type="text"
          className="chat-input"
          placeholder="Let's Master Interview help you !"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleSendMessage}
        />
      </div>
    </aside>
  );
};

export default ChatPanel;
