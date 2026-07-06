"use client";
import React, { useState, useEffect, useRef } from "react";
import "./ChatPanel.css";

const ChatPanel = ({ isCollapsed, onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "user",
      text: "Give me some questions about Back-end developement when being interviewed.",
    },
    {
      id: 2,
      sender: "agent",
      text: "Sure! Here are your questions about Back-end development.\nLorem ipsum...",
    },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!isCollapsed) {
      scrollToBottom();
    }
  }, [messages, isCollapsed]);

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
    <aside className={`chat-panel ${isCollapsed ? "collapsed" : ""}`}>
      {/* Chat Header nội bộ */}
      <div className="chat-header">
        <div className="chatbot-icon" onClick={onClose}>
          <img src="/logo.png" alt="Chatbot Icon" />
        </div>
        <span className="user-name">John</span>
        <div className="user-avatar">
          <img src="/user.png" alt="User Avatar" />
        </div>
      </div>

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
        <div ref={messagesEndRef} />
      </div>

      {/* Ô nhập liệu */}
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
