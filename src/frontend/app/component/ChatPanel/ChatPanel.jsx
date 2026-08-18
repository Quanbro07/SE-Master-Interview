"use client";
import React, { useState, useEffect, useRef } from "react";
import "./ChatPanel.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

// Helper lấy JWT token an toàn
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
      console.error(e);
    }
  }
  if (!token) return "";
  return token.replace(/^"(.*)"$/, "$1").trim();
};

// ==========================================
// COMPONENT: LUỒNG PHỎNG VẤN MINI (MINI INTERVIEW)
// ==========================================
const MiniInterviewFlow = ({ questions }) => {
  const [isStarted, setIsStarted] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [evaluationResults, setEvaluationResults] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const isAllAnswered = questions.every(
    (q) => userAnswers[q.questionId] && userAnswers[q.questionId].trim() !== ""
  );

  const handleAnswerChange = (qId, text) => {
    setUserAnswers((prev) => ({ ...prev, [qId]: text }));
  };

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    try {
      const token = getAccessToken();
      
      const payload = {
        answers: questions.map((q) => ({
          questionId: q.questionId,
          userAnswer: userAnswers[q.questionId],
        }))
      };

      const res = await fetch(`${API_BASE}/api/v1/question/evaluate-questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Lỗi khi chấm điểm!");
      
      const data = await res.json();
      setEvaluationResults(data);
    } catch (error) {
      console.error(error);
      alert("Chấm điểm thất bại, vui lòng thử lại!");
    } finally {
      setIsEvaluating(false);
    }
  };

  if (!isStarted) {
    return (
      <div className="mini-interview-start">
        <p>Tôi đã tìm thấy {questions.length} câu hỏi. Bạn đã sẵn sàng trả lời chưa?</p>
        <button className="btn-start-interview" onClick={() => setIsStarted(true)}>
          Bắt đầu trả lời
        </button>
      </div>
    );
  }

  return (
    <div className="mini-interview-container">
      {questions.map((q, index) => {
        const evalData = evaluationResults?.find(
          (res) => res.questionId === q.questionId
        );

        return (
          <div key={q.questionId} className="question-block">
            <p className="question-content">
              <strong>Câu {index + 1}:</strong> {q.content} 
              <span className="question-diff"> ({q.difficulty})</span>
            </p>
            
            <textarea
              className="answer-input"
              placeholder="Nhập câu trả lời của bạn vào đây..."
              value={userAnswers[q.questionId] || ""}
              onChange={(e) => handleAnswerChange(q.questionId, e.target.value)}
              disabled={evaluationResults !== null}
            />

            {evalData && evalData.analysis && (
              <div className="evaluation-feedback">
                <h4>Phản hồi từ AI:</h4>
                {evalData.analysis.smartSuggestions && evalData.analysis.smartSuggestions.length > 0 && (
                  <ul>
                    {evalData.analysis.smartSuggestions.map((sug, i) => (
                      <li key={i}>{sug}</li>
                    ))}
                  </ul>
                )}
                <div className="eval-metrics">
                  <span>Độ sâu: {evalData.analysis.depth?.score || "N/A"}/10</span>
                  <span>Độ bám sát: {evalData.analysis.relevance?.score || "N/A"}/10</span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {!evaluationResults && (
        <button
          className="btn-evaluate"
          onClick={handleEvaluate}
          disabled={!isAllAnswered || isEvaluating}
        >
          {isEvaluating ? "Đang chấm điểm..." : "Hoàn tất & Đánh giá"}
        </button>
      )}
    </div>
  );
};


// ==========================================
// COMPONENT CHÍNH: CHAT PANEL
// ==========================================
const ChatPanel = ({ isCollapsed }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "agent",
      type: "text",
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
    if (!isCollapsed) scrollToBottom();
  }, [messages, loading, isCollapsed]);

  const handleSend = async () => {
    const userText = input.trim();
    if (!userText || loading) return;

    const userMessage = { id: Date.now(), sender: "user", type: "text", text: userText };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/api/v1/agent/prompt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt: userText }),
      });

      if (!res.ok) throw new Error(`Lỗi server (${res.status})`);
      const data = await res.json();

      if (data?.toolUsed === "searchQuestions" && Array.isArray(data?.answer)) {
        const agentQuizMsg = {
          id: Date.now() + 1,
          sender: "agent",
          type: "quiz", 
          questions: data.answer,
        };
        setMessages((prev) => [...prev, agentQuizMsg]);
      } else {
        let replyText = "Đã thực hiện xong yêu cầu của bạn!";
        if (typeof data === "string") replyText = data;
        else if (data?.answer) {
            replyText = typeof data.answer === "string" ? data.answer : JSON.stringify(data.answer, null, 2);
        } else if (data?.response) {
            replyText = typeof data.response === "string" ? data.response : JSON.stringify(data.response);
        } else if (data?.message) {
            replyText = data.message;
        }

        const agentTextMsg = { id: Date.now() + 1, sender: "agent", type: "text", text: replyText };
        setMessages((prev) => [...prev, agentTextMsg]);
      }
    } catch (err) {
      console.error("[AGENT CHAT ERROR]:", err);
      setMessages((prev) => [...prev, { id: Date.now() + 1, sender: "agent", type: "text", text: `⚠️ Lỗi: ${err.message}` }]);
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
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-row ${msg.sender}`}>
            <div className="message-bubble">
              
              {msg.type === "text" &&
                msg.text.split("\n").map((line, index) => <p key={index}>{line}</p>)}

              {msg.type === "quiz" && <MiniInterviewFlow questions={msg.questions} />}

            </div>
          </div>
        ))}

        {loading && (
          <div className="message-row agent">
            <div className="message-bubble loading">
              <p>AI đang xử lý yêu cầu...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-wrapper">
        <input
          type="text"
          placeholder="Nhập yêu cầu (VD: get me 3 questions...)"
          value={input}
          disabled={loading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}>Gửi</button>
      </div>
    </aside>
  );
};

export default ChatPanel;