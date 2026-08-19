"use client";
import React, { useState, useEffect, useRef } from "react";
import "./ChatPanel.css";
import BookingConfirmPopup from "../BookingPage/BookingConfirmPopup";
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

// Helper lấy JWT token
const getAccessToken = () => {
  if (typeof window === "undefined") return "";
  const keys = ["accessToken", "token", "jwt", "authToken", "access_token"];
  let token = "";
  for (const key of keys) {
    const val = localStorage.getItem(key);
    if (val) { token = val; break; }
  }
  if (!token) {
    try {
      const userObj = JSON.parse(localStorage.getItem("user") || "{}");
      token = userObj.token || userObj.accessToken || userObj.jwt || "";
    } catch (e) { console.error(e); }
  }
  if (!token) return "";
  return token.replace(/^"(.*)"$/, "$1").trim();
};

// ==========================================
// COMPONENT: LUỒNG PHỎNG VẤN MINI (SỬ DỤNG CSS CLASS MỚI)
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
        answer_list: questions.map((q) => ({
          questionId: q.questionId,
          answer: userAnswers[q.questionId],
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
      console.log("📦 [EVALUATE] Dữ liệu Backend trả về:", data);
      setEvaluationResults(data);
    } catch (error) {
      console.error(error);
      alert("Chấm điểm thất bại, vui lòng thử lại!");
    } finally {
      setIsEvaluating(false);
    }
  };

  // ==========================================
// COMPONENT: LUỒNG TÌM KIẾM LỊCH (SCHEDULE)
// ==========================================
const MiniScheduleFlow = ({ interviewers }) => {
  if (!interviewers || interviewers.length === 0) {
    return <p style={{ margin: 0 }}>Rất tiếc, hiện tại không có lịch trống nào phù hợp với yêu cầu của bạn.</p>;
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
            onClick={() => onBookClick({
              // Định dạng lại data mentor cho khớp với yêu cầu của BookingConfirmPopup
              id: interviewer.interviewer_id,
              name: interviewer.fullName,
              email: interviewer.email,
              price: "$10/ session", // Hoặc lấy từ interviewer.price nếu có
              position: "SOFTWARE ENGINEER" // Hoặc lấy từ interviewer.position
            })}
          >
            Book Interview
          </button>
        </div>
      ))}
    </div>
  );
};

  if (!isStarted) {
    return (
      <div className="mini-interview-intro">
        <p>Tôi đã tìm thấy {questions.length} câu hỏi. Bạn đã sẵn sàng bắt đầu trả lời chưa?</p>
        <button className="btn-mini-primary" onClick={() => setIsStarted(true)}>
          Sẵn sàng
        </button>
      </div>
    );
  }

  return (
    <div className="mini-interview-list">
      {questions.map((q, index) => {
        const evalData = evaluationResults?.find((res) => res.questionId === q.questionId);

        return (
          <div key={q.questionId} className="mini-question-item">
            <p className="mini-question-text">
              {index + 1}. {q.content} 
              <span className="mini-question-diff">({q.difficulty})</span>
            </p>
            
            <textarea
              className="mini-answer-input"
              placeholder="Nhập câu trả lời của bạn..."
              value={userAnswers[q.questionId] || ""}
              onChange={(e) => handleAnswerChange(q.questionId, e.target.value)}
              disabled={evaluationResults !== null}
            />

            {evalData && evalData.analysis && (
              <div className="mini-feedback-box">
                <strong className="mini-feedback-title">Nhận xét từ AI:</strong>
                {evalData.analysis.smartSuggestions?.length > 0 && (
                  <ul className="mini-feedback-list">
                    {evalData.analysis.smartSuggestions.map((sug, i) => (
                      <li key={i}>{sug}</li>
                    ))}
                  </ul>
                )}
                <div className="mini-feedback-metrics" style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
                  <span>🎯 Độ sâu: <span className="metric-score">{evalData.analysis.depth?.rating}</span></span>
                  <span>🔍 Bám sát: <span className="metric-score">{evalData.analysis.relevance?.status}</span> (Khớp {evalData.analysis.relevance?.matchedKeywords}/{evalData.analysis.relevance?.totalKeywords} keywords)</span>
                  <span>💪 Tự tin: <span className="metric-score">{evalData.analysis.confidence?.status}</span></span>
                  <span>📝 Độ dài: <span className="metric-score">{evalData.analysis.comparison?.status}</span> ({evalData.analysis.comparison?.avgWords} words)</span>
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
  const [selectedMentor, setSelectedMentor] = useState(null); 
  const [showBookingPopup, setShowBookingPopup] = useState(false);
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

    // Hàm mở popup khi bấm nút "Book"
  const handleOpenBooking = (mentorData) => {
    setSelectedMentor(mentorData);
    setShowBookingPopup(true);
  };

  // Hàm đóng popup
  const handleCloseBooking = () => {
    setShowBookingPopup(false);
    setSelectedMentor(null);
  };

  // Hàm xử lý sau khi thanh toán Stripe thành công
  const handleBookingConfirm = (result) => {
    console.log("Đặt lịch & thanh toán thành công!", result);
    setShowBookingPopup(false);
    
    // Tạo tin nhắn thông báo thành công trong khung chat
    const successMsg = {
      id: Date.now(),
      sender: "agent",
      type: "text",
      text: `✅ Chúc mừng! Đặt lịch phỏng vấn thành công với ${selectedMentor.name}.\nMã booking: ${result.booking?.bookingId}\nBạn vui lòng kiểm tra email hoặc xem lại lịch sử booking nhé!`
    };
    setMessages(prev => [...prev, successMsg]);};
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

      // KIỂM TRA ĐIỀU KIỆN TOOL USED
      if (data?.toolUsed === "searchQuestions" && Array.isArray(data?.answer)) {
        const agentQuizMsg = {
          id: Date.now() + 1,
          sender: "agent",
          type: "quiz",
          questions: data.answer,
        };
        setMessages((prev) => [...prev, agentQuizMsg]);
      }
      else if (data?.toolUsed === "availableSchedule" && Array.isArray(data?.answer)) {
        // ===> NHÁNH MỚI CHO LỊCH PHỎNG VẤN <===
        const agentScheduleMsg = {
          id: Date.now() + 1,
          sender: "agent",
          type: "schedule",
          interviewers: data.answer,
        };
        setMessages((prev) => [...prev, agentScheduleMsg]);} 
      else {
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
    <>
    <aside className={`chat-panel ${isCollapsed ? "collapsed" : ""}`}>
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-row ${msg.sender}`}>
            <div className="message-bubble">
              
              {/* RENDER TEXT */}
              {msg.type === "text" &&
                msg.text.split("\n").map((line, index) => (
                  <p key={index} style={{ margin: "0 0 4px 0" }}>{line}</p>
                ))}

              {/* RENDER LUỒNG CÂU HỎI */}
              {msg.type === "quiz" && <MiniInterviewFlow questions={msg.questions} />}

              {/* RENDER LUỒNG LỊCH PHỎNG VẤN */}
              {msg.type === "schedule" && <MiniScheduleFlow interviewers={msg.interviewers} />}
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
    {/* ===> HIỂN THỊ BOOKING POPUP KHI ĐƯỢC KÍCH HOẠT <=== */}
      {showBookingPopup && selectedMentor && (
        <BookingConfirmPopup
          mentor={selectedMentor}
          onConfirm={handleBookingConfirm}
          onCancel={handleCloseBooking}
        />
      )}
    </>
  );
};

export default ChatPanel;

