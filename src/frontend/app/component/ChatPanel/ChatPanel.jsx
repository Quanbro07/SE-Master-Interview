"use client";
import React, { useState, useEffect, useRef } from "react";
import "./ChatPanel.css";
// Lưu ý: Nếu đường dẫn BookingConfirmPopup của ông khác thì tự sửa lại nhé
// import BookingConfirmPopup from "../BookingPage/BookingConfirmPopup"; 

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
// COMPONENT: LUỒNG PHỎNG VẤN MINI (ĐÃ FIX LỖI)
// ==========================================
const MiniInterviewFlow = ({ questions }) => {
  const [isStarted, setIsStarted] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [evaluationResults, setEvaluationResults] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  // KHAI BÁO BIẾN BỊ THIẾU Ở ĐÂY NÈ ÔNG:
  const [answerStatus, setAnswerStatus] = useState({});

  const safeQuestions = Array.isArray(questions) ? questions : [];

  const isAllAnswered = safeQuestions.every((q) => {
    if (!q || !q.questionId) return false;
    const ans = userAnswers[q.questionId];
    return ans && typeof ans === "string" && ans.trim() !== "";
  });

  const handleAnswerChange = (qId, text) => {
    setUserAnswers((prev) => ({ ...prev, [qId]: text }));
  };

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    try {
      const token = getAccessToken();
      const payload = {
        answer_list: safeQuestions.map((q) => ({
          questionId: q.questionId,
          answer: userAnswers[q.questionId] || "",
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
      <div className="mini-interview-intro">
        <p>Tôi đã tìm thấy {safeQuestions.length} câu hỏi. Bạn đã sẵn sàng bắt đầu trả lời chưa?</p>
        <button className="btn-mini-primary" onClick={() => setIsStarted(true)}>
          Sẵn sàng
        </button>
      </div>
    );
  }

  return (
    <div className="mini-interview-list">
      {safeQuestions.map((q, index) => {
        if (!q || !q.questionId) return null;

        const evalData = (evaluationResults && Array.isArray(evaluationResults)) 
          ? evaluationResults.find((res) => res.questionId === q.questionId) 
          : null;
          
        // LẤY TRẠNG THÁI HIỆN TẠI (ĐÃ HẾT LỖI UNDEFINED)
        const currentStatus = answerStatus[q.questionId];

        return (
          <div key={q.questionId} className="mini-question-item">
            <p className="mini-question-text">
              {index + 1}. {q.content || "Câu hỏi không xác định"} 
              {q.difficulty && <span className="mini-question-diff">({q.difficulty})</span>}
            </p>
            
            <textarea
              className="mini-answer-input"
              placeholder="Nhập câu trả lời của bạn..."
              value={userAnswers[q.questionId] || ""}
              onChange={(e) => handleAnswerChange(q.questionId, e.target.value)}
              disabled={evaluationResults !== null}
            />

            {/* 1. Nút xem đáp án ban đầu */}
            {q.answer && !currentStatus && (
              <button 
                type="button"
                className="btn-show-answer"
                onClick={() => setAnswerStatus(prev => ({ ...prev, [q.questionId]: 'confirming' }))}
              >
                Nhấn để xem đáp án mẫu
              </button>
            )}

            {/* 2. Hộp thoại xác nhận Inline màu vàng */}
            {currentStatus === 'confirming' && (
              <div className="inline-confirm-box">
                <p>💡 Lời khuyên: Bạn nên thử tự viết câu trả lời trước khi xem đáp án mẫu để luyện tập hiệu quả nhất.</p>
                <p style={{ fontWeight: 600 }}>Bạn có chắc chắn muốn xem đáp án không?</p>
                <div className="inline-confirm-actions">
                  <button 
                    className="btn-confirm-yes"
                    onClick={() => setAnswerStatus(prev => ({ ...prev, [q.questionId]: 'revealed' }))}
                  >
                    Chắc chắn
                  </button>
                  <button 
                    className="btn-confirm-no"
                    onClick={() => {
                      setAnswerStatus(prev => {
                        const newState = { ...prev };
                        delete newState[q.questionId];
                        return newState;
                      });
                    }}
                  >
                    Quay lại
                  </button>
                </div>
              </div>
            )}

            {/* 3. Hiện đáp án */}
            {currentStatus === 'revealed' && (
              <div className="model-answer-box">
                <strong>Đáp án mẫu:</strong>
                <p style={{ margin: 0, lineHeight: 1.5 }}>{q.answer}</p>
              </div>
            )}

            {/* KHU VỰC FEEDBACK TỪ AI */}
            {evalData && evalData.analysis && (
              <div className="mini-feedback-box">
                <strong className="mini-feedback-title">Nhận xét từ AI:</strong>
                {evalData.analysis.smartSuggestions && evalData.analysis.smartSuggestions.length > 0 && (
                  <ul className="mini-feedback-list">
                    {evalData.analysis.smartSuggestions.map((sug, i) => (
                      <li key={i}>{sug}</li>
                    ))}
                  </ul>
                )}
                
                <div className="mini-feedback-metrics" style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
                  <span>🎯 Độ sâu: <span className="metric-score">{evalData.analysis.depth?.rating || "N/A"}</span></span>
                  
                  <span>🔍 Bám sát: <span className="metric-score">{evalData.analysis.relevance?.status || "N/A"}</span> 
                  {evalData.analysis.relevance ? ` (Khớp ${evalData.analysis.relevance.matchedKeywords}/${evalData.analysis.relevance.totalKeywords} keywords)` : ""}</span>
                  
                  <span>💪 Tự tin: <span className="metric-score">{evalData.analysis.confidence?.status || "N/A"}</span></span>
                  
                  <span>📝 Độ dài: <span className="metric-score">{evalData.analysis.comparison?.status || "N/A"}</span> 
                  {evalData.analysis.comparison ? ` (${evalData.analysis.comparison.avgWords} words)` : ""}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {!evaluationResults && (
        <button
          className="btn-mini-primary"
          onClick={handleEvaluate}
          disabled={!isAllAnswered || isEvaluating}
        >
          {isEvaluating ? "Đang chấm điểm..." : "Nộp bài & Đánh giá"}
        </button>
      )}
    </div>
  );
};

// ==========================================
// COMPONENT: LUỒNG TÌM KIẾM LỊCH (SCHEDULE)
// ==========================================
const MiniScheduleFlow = ({ interviewers, onBookClick }) => {
  if (!interviewers || interviewers.length === 0) {
    return <p style={{ margin: 0, color: "#94a3b8" }}>Rất tiếc, hiện tại không có lịch trống nào phù hợp với yêu cầu của bạn.</p>;
  }

  return (
    <div className="mini-schedule-container">
      <p style={{ margin: "0 0 4px 0", color: "#e2e8f0" }}>Tôi đã tìm thấy {interviewers.length} người phù hợp:</p>
      
      {interviewers.map((interviewer, idx) => (
        <div key={interviewer.interviewer_id || idx} className="mini-schedule-card">
          <div className="mini-schedule-header">
            <div className="mini-schedule-info">
              <h4>{interviewer.fullName}</h4>
              <p>{interviewer.email}</p>
            </div>
            <div className="mini-schedule-rating">
              ⭐ {Number(interviewer.overall_rating).toFixed(1)}
            </div>
          </div>
          
          <div className="mini-schedule-body">
            {interviewer.available_schedules?.schedules?.map((schedule, sIdx) => (
              <div key={sIdx}>
                <p className="mini-schedule-date">📅 Ngày: {schedule.date}</p>
                <div className="mini-time-slots">
                  {schedule.schedule_times?.map((time, tIdx) => (
                    <span key={tIdx} className="mini-time-slot">
                      {time.start_time.substring(0, 5)} - {time.end_time.substring(0, 5)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button 
            className="btn-mini-primary" 
            style={{ width: "100%", marginTop: "12px", background: "#4f46e5" }}
            onClick={() => {
              if (onBookClick) {
                onBookClick({
                  id: interviewer.interviewer_id,
                  name: interviewer.fullName,
                  email: interviewer.email,
                  price: "$10/ session", 
                  position: "SOFTWARE ENGINEER" 
                });
              }
            }}
          >
            Book Interview
          </button>

        </div>
      ))}
    </div>
  );
};

// ==========================================
// COMPONENT CHÍNH: CHAT PANEL
// ==========================================
const ChatPanel = ({ isCollapsed, onBookFromChat }) => {
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
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/v1/agent/prompt`, {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt: userText }),
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!");
        throw new Error(`Lỗi server (${res.status})`);
      }

      const data = await res.json();

      if (data?.toolUsed === "searchQuestions" && Array.isArray(data?.answer)) {
        const agentQuizMsg = {
          id: Date.now() + 1,
          sender: "agent",
          type: "quiz",
          questions: data.answer,
        };
        setMessages((prev) => [...prev, agentQuizMsg]);

      } else if (data?.toolUsed === "availableSchedule" && Array.isArray(data?.answer)) {
        const agentScheduleMsg = {
          id: Date.now() + 1,
          sender: "agent",
          type: "schedule",
          interviewers: data.answer,
        };
        setMessages((prev) => [...prev, agentScheduleMsg]);

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
      setMessages((prev) => [...prev, { id: Date.now() + 1, sender: "agent", type: "text", text: `⚠️ Lỗi: ${err.message || "Không thể kết nối đến AI Agent."}` }]);
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
                msg.text.split("\n").map((line, index) => (
                  <p key={index} style={{ margin: "0 0 4px 0" }}>{line}</p>
                ))}

              {msg.type === "quiz" && <MiniInterviewFlow questions={msg.questions} />}

              {msg.type === "schedule" && <MiniScheduleFlow interviewers={msg.interviewers} onBookClick={onBookFromChat} />}

            </div>
          </div>
        ))}

        {loading && (
          <div className="message-row agent">
            <div className="message-bubble loading">
              <p style={{ margin: 0 }}>AI đang xử lý yêu cầu...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-wrapper">
        <input
          className="chat-input"
          type="text"
          placeholder="Let's Master Interview help you !"
          value={input}
          disabled={loading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
    </aside>
  );
};

export default ChatPanel;