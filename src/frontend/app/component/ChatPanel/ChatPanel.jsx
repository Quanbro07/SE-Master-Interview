"use client";
import React, { useState, useEffect, useRef } from "react";
import "./ChatPanel.css";
// Note: If your BookingConfirmPopup path is different, please adjust it accordingly
// import BookingConfirmPopup from "../BookingPage/BookingConfirmPopup"; 

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

// Helper to safely get the JWT token
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
// COMPONENT: MINI INTERVIEW FLOW (FIXED)
// ==========================================
const MiniInterviewFlow = ({ questions }) => {
  const [isStarted, setIsStarted] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [evaluationResults, setEvaluationResults] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  // DECLARE MISSING VARIABLE HERE:
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

      if (!res.ok) throw new Error("Evaluation error!");
      
      const data = await res.json();
      setEvaluationResults(data);
    } catch (error) {
      console.error(error);
      alert("Evaluation failed, please try again!");
    } finally {
      setIsEvaluating(false);
    }
  };

  if (!isStarted) {
    return (
      <div className="mini-interview-intro">
        <p>I have found {safeQuestions.length} questions. Are you ready to start answering?</p>
        <button className="btn-mini-primary" onClick={() => setIsStarted(true)}>
          Ready
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
          
        // GET CURRENT STATUS (UNDEFINED ERROR FIXED)
        const currentStatus = answerStatus[q.questionId];

        return (
          <div key={q.questionId} className="mini-question-item">
            <p className="mini-question-text">
              {index + 1}. {q.content || "Unknown question"} 
              {q.difficulty && <span className="mini-question-diff">({q.difficulty})</span>}
            </p>
            
            <textarea
              className="mini-answer-input"
              placeholder="Enter your answer..."
              value={userAnswers[q.questionId] || ""}
              onChange={(e) => handleAnswerChange(q.questionId, e.target.value)}
              disabled={evaluationResults !== null}
            />

            {/* 1. Initial view answer button */}
            {q.answer && !currentStatus && (
              <button 
                type="button"
                className="btn-show-answer"
                onClick={() => setAnswerStatus(prev => ({ ...prev, [q.questionId]: 'confirming' }))}
              >
                Click to view suggested answer
              </button>
            )}

            {/* 2. Yellow inline confirmation box */}
            {currentStatus === 'confirming' && (
              <div className="inline-confirm-box">
                <p>💡 Tip: You should try writing your own answer before viewing the suggested one for the best practice.</p>
                <p style={{ fontWeight: 600 }}>Are you sure you want to view the answer?</p>
                <div className="inline-confirm-actions">
                  <button 
                    className="btn-confirm-yes"
                    onClick={() => setAnswerStatus(prev => ({ ...prev, [q.questionId]: 'revealed' }))}
                  >
                    Yes, I'm sure
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
                    Go back
                  </button>
                </div>
              </div>
            )}

            {/* 3. Show answer */}
            {currentStatus === 'revealed' && (
              <div className="model-answer-box">
                <strong>Suggested answer:</strong>
                <p style={{ margin: 0, lineHeight: 1.5 }}>{q.answer}</p>
              </div>
            )}

            {/* AI FEEDBACK AREA */}
            {evalData && evalData.analysis && (
              <div className="mini-feedback-box">
                <strong className="mini-feedback-title">AI Feedback:</strong>
                {evalData.analysis.smartSuggestions && evalData.analysis.smartSuggestions.length > 0 && (
                  <ul className="mini-feedback-list">
                    {evalData.analysis.smartSuggestions.map((sug, i) => (
                      <li key={i}>{sug}</li>
                    ))}
                  </ul>
                )}
                
                <div className="mini-feedback-metrics" style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
                  <span>🎯 Depth: <span className="metric-score">{evalData.analysis.depth?.rating || "N/A"}</span></span>
                  
                  <span>🔍 Relevance: <span className="metric-score">{evalData.analysis.relevance?.status || "N/A"}</span> 
                  {evalData.analysis.relevance ? ` (Matched ${evalData.analysis.relevance.matchedKeywords}/${evalData.analysis.relevance.totalKeywords} keywords)` : ""}</span>
                  
                  <span>💪 Confidence: <span className="metric-score">{evalData.analysis.confidence?.status || "N/A"}</span></span>
                  
                  <span>📝 Length: <span className="metric-score">{evalData.analysis.comparison?.status || "N/A"}</span> 
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
          {isEvaluating ? "Evaluating..." : "Submit & Evaluate"}
        </button>
      )}
    </div>
  );
};

// ==========================================
// COMPONENT: SCHEDULE SEARCH FLOW
// ==========================================
const MiniScheduleFlow = ({ interviewers, onBookClick }) => {
  if (!interviewers || interviewers.length === 0) {
    return <p style={{ margin: 0, color: "#94a3b8" }}>Sorry, there are currently no available schedules matching your request.</p>;
  }

  return (
    <div className="mini-schedule-container">
      <p style={{ margin: "0 0 4px 0", color: "#e2e8f0" }}>I have found {interviewers.length} suitable candidates:</p>
      
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
                <p className="mini-schedule-date">📅 Date: {schedule.date}</p>
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
// MAIN COMPONENT: CHAT PANEL
// ==========================================
const ChatPanel = ({ isCollapsed, onBookFromChat }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "agent",
      type: "text",
      text: "Hello! I am your AI Assistant. Would you like to book an interview or find out more information?",
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
        if (res.status === 401) throw new Error("Session expired. Please log in again!");
        throw new Error(`Server error (${res.status})`);
      }

      const data = await res.json();

      // IF TOOLUSED IS EMPTY OR FALSY
      if (!data?.toolUsed || data.toolUsed.trim() === "") {
        const fallbackMsg = { 
          id: Date.now() + 1, 
          sender: "agent", 
          type: "text", 
          text: "This feature is currently under development." 
        };
        setMessages((prev) => [...prev, fallbackMsg]);

      } else if (data?.toolUsed === "searchQuestions" && Array.isArray(data?.answer)) {
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
        let replyText = "Your request has been completed!";
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
      setMessages((prev) => [...prev, { id: Date.now() + 1, sender: "agent", type: "text", text: `⚠️ Error: ${err.message || "Cannot connect to AI Agent."}` }]);
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
              <p style={{ margin: 0 }}>AI is processing your request...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-wrapper">
        <input
          className="chat-input"
          type="text"
          placeholder="Let Master Interview help you!"
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