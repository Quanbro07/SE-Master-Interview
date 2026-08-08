"use client";
import { useEffect, useRef, useState } from "react";
import NavigationBar from "../NavigationBar/NavigationBar";
import "./MockInterviewPage.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const POOL_SIZE = 10;

// Helper lấy Clean Authorization Token
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
  if (!token) return "";
  return token
    .replace(/^"(.*)"$/, "$1")
    .replace(/^Bearer\s+/i, "")
    .trim();
};

const MockInterviewPage = () => {
  const [positionQuery, setPositionQuery] = useState("");
  const [positionSuggestions, setPositionSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selectedField, setSelectedField] = useState("");
  const positionWrapperRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [pool, setPool] = useState([]);
  const [poolIndex, setPoolIndex] = useState(0);

  const [answerText, setAnswerText] = useState("");
  const [recording, setRecording] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const recorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [history, setHistory] = useState([]);
  const [evaluations, setEvaluations] = useState([]); // Chứa kết quả đánh giá từ backend
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);

  const currentQuestion = pool[poolIndex] || null;
  const hasMoreInPool = poolIndex < pool.length - 1;
  const showCard = selectedField && !loading && currentQuestion && !reviewMode;

  // Lấy gợi ý Vị trí (Position) từ Backend
  useEffect(() => {
    if (!positionQuery.trim()) {
      setPositionSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const cleanToken = getAccessToken();
        const headers = cleanToken
          ? { Authorization: `Bearer ${cleanToken}` }
          : {};

        const res = await fetch(
          `${API_BASE}/api/v1/position/search?q=${encodeURIComponent(positionQuery)}`,
          { headers },
        );

        if (res.ok) {
          const data = await res.json();
          setPositionSuggestions(data || []);
        } else {
          setPositionSuggestions([]);
        }
      } catch (err) {
        console.error("Lỗi tìm kiếm position:", err);
        setPositionSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [positionQuery]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        positionWrapperRef.current &&
        !positionWrapperRef.current.contains(e.target)
      ) {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePositionInputChange = (e) => {
    setPositionQuery(e.target.value);
    setSuggestionsOpen(true);
    setSelectedField("");
  };

  // 1. Tải danh sách câu hỏi từ Postgres DB thông qua API Backend
  const startSession = async (position) => {
    setSelectedField(position);
    setSuggestionsOpen(false);
    setLoading(true);
    setLoadError(null);
    setReviewMode(false);
    setPool([]);
    setPoolIndex(0);
    setHistory([]);
    setEvaluations([]);
    setAnswerText("");
    setAudioUrl("");
    setMediaError("");

    try {
      const cleanToken = getAccessToken();
      const params = new URLSearchParams({
        position: position.trim(),
        numQuestions: String(POOL_SIZE),
      });

      const res = await fetch(
        `${API_BASE}/api/v1/question/get-question?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(cleanToken ? { Authorization: `Bearer ${cleanToken}` } : {}),
          },
        },
      );

      if (res.status === 401) {
        setLoadError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
        setLoading(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setPool(data);
        } else {
          setLoadError(
            `Không tìm thấy câu hỏi nào cho vị trí "${position}" trong Database.`,
          );
        }
      } else {
        setLoadError(`Lỗi tải câu hỏi từ Server (${res.status}).`);
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách câu hỏi:", err);
      setLoadError("Không thể kết nối đến máy chủ Backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPosition = (name) => {
    setPositionQuery(name);
    startSession(name);
  };

  const submitAnswerAndAdvance = () => {
    if (!currentQuestion) return;

    setHistory((prev) => [
      ...prev,
      { question: currentQuestion, answerText, audioUrl },
    ]);

    if (hasMoreInPool) {
      setPoolIndex((prev) => prev + 1);
      setAnswerText("");
      setAudioUrl("");
      setMediaError("");
    }
  };

  // 2. Kết thúc phỏng vấn và gửi toàn bộ câu trả lời lên Backend để đánh giá
  const endInterview = async () => {
    if (!currentQuestion) return;

    let finalHistory = [...history];
    if (
      !finalHistory.some(
        (h) => h.question.questionId === currentQuestion.questionId,
      )
    ) {
      finalHistory.push({ question: currentQuestion, answerText, audioUrl });
      setHistory(finalHistory);
    }

    setReviewMode(true);
    setReviewIndex(0);
    setEvaluating(true);

    try {
      const cleanToken = getAccessToken();
      const payload = {
        answers: finalHistory.map((item) => ({
          questionId: item.question.questionId,
          userAnswer: item.answerText || "",
        })),
      };

      const res = await fetch(
        `${API_BASE}/api/v1/question/evaluate-questions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(cleanToken ? { Authorization: `Bearer ${cleanToken}` } : {}),
          },
          body: JSON.stringify(payload),
        },
      );

      if (res.ok) {
        const evalData = await res.json();
        setEvaluations(evalData || []);
      } else {
        console.error("Đánh giá câu trả lời thất bại với status:", res.status);
      }
    } catch (err) {
      console.error("Lỗi gửi đánh giá câu hỏi:", err);
    } finally {
      setEvaluating(false);
    }
  };

  const moveReview = (direction) => {
    const nextIndex = reviewIndex + direction;
    if (nextIndex < 0 || nextIndex >= history.length) return;
    setReviewIndex(nextIndex);
  };

  const startRecording = async () => {
    setMediaError("");
    if (recording) {
      stopRecording();
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMediaError("Microphone không được hỗ trợ trên trình duyệt này.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      });

      recorder.start();
      setRecording(true);
    } catch (error) {
      setMediaError("Không thể truy cập Microphone. Vui lòng cấp quyền!");
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    setRecording(false);
  };

  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    };
  }, []);

  const reviewEntry = history[reviewIndex];
  const currentEval = evaluations.find(
    (e) => e.questionId === reviewEntry?.question?.questionId,
  );

  return (
    <div className="mock-page-root">
      <NavigationBar />
      <main className="mock-main">
        <section className="mock-inner">
          <h1 className="mockinterview-title">MOCK INTERVIEW</h1>
          <div className="mock-intro">
            <p className="mock-subtitle">Choose your position</p>
          </div>

          <div className="mock-field-select-wrap">
            <div className="mock-position-search" ref={positionWrapperRef}>
              <input
                type="text"
                className="mock-field-select mock-position-input"
                placeholder="Type a position (e.g. Quality Assurance)"
                value={positionQuery}
                onChange={handlePositionInputChange}
                onFocus={() => positionQuery.trim() && setSuggestionsOpen(true)}
              />
              {suggestionsOpen && positionQuery.trim() && (
                <div className="mock-position-dropdown">
                  {positionSuggestions.length > 0 ? (
                    positionSuggestions.map((name) => (
                      <button
                        type="button"
                        key={name}
                        className="mock-position-dropdown-item"
                        onClick={() => handleSelectPosition(name)}
                      >
                        {name}
                      </button>
                    ))
                  ) : (
                    <div className="mock-position-dropdown-empty">
                      No positions match &quot;{positionQuery}&quot;.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {loadError && <p className="mock-error">{loadError}</p>}

          <div className="mock-loader-area">
            {loading && (
              <div className="mock-loader">
                <div className="mock-orbit">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <div key={index} className="dot" />
                  ))}
                </div>
                <div className="mock-loading-text">
                  Fetching questions from database, please wait!
                </div>
              </div>
            )}
          </div>

          {showCard && (
            <div className="mock-question-wrapper">
              <div className="mock-question-card">
                <div className="mock-card-header">
                  <p className="mock-card-title">
                    Mock Interview: {selectedField} ({poolIndex + 1}/
                    {pool.length})
                  </p>
                </div>
                <h2 className="mock-question-title">
                  {currentQuestion.content}
                </h2>
                <div className="mock-answer-area">
                  <button
                    type="button"
                    className={`mock-micro-icon-button ${recording ? "recording" : ""}`}
                    onClick={startRecording}
                  >
                    <img src="/micro.png" alt="Record" />
                  </button>
                  <textarea
                    className="mock-answer-textarea"
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="Input your answer here or record audio."
                  />
                </div>
                {audioUrl && (
                  <audio
                    controls
                    src={audioUrl}
                    style={{ width: "100%", marginTop: "10px" }}
                  />
                )}
                {mediaError && (
                  <div className="error-message">{mediaError}</div>
                )}
                {!hasMoreInPool && (
                  <p className="mock-pool-exhausted">
                    You reached the end of questions — click End to evaluate.
                  </p>
                )}
                <div className="mock-control-row">
                  <button
                    type="button"
                    className="mock-action-btn danger"
                    onClick={endInterview}
                  >
                    End
                  </button>
                  <button
                    type="button"
                    className="mock-action-btn primary"
                    onClick={submitAnswerAndAdvance}
                    disabled={!hasMoreInPool}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {reviewMode && reviewEntry && (
            <div className="mock-review-card">
              <h2 className="review-title">
                MOCK INTERVIEW REPORT: {selectedField}
              </h2>
              <p className="review-question">
                <strong>Question {reviewIndex + 1}:</strong>{" "}
                {reviewEntry.question.content}
              </p>
              <div className="review-answer-box">
                <p>
                  <strong>Your answer:</strong>
                </p>
                <p>{reviewEntry.answerText || "No text answer provided."}</p>
                {reviewEntry.audioUrl && (
                  <audio
                    controls
                    src={reviewEntry.audioUrl}
                    style={{ width: "100%", marginTop: "12px" }}
                  />
                )}
              </div>

              <div className="feedback-report">
                <span className="feedback-score">FEEDBACK REPORT</span>
                {evaluating ? (
                  <p className="feedback-text feedback-pending">
                    Evaluating your response with Backend AI, please wait...
                  </p>
                ) : currentEval ? (
                  <div
                    className="evaluation-details"
                    style={{ marginTop: "10px" }}
                  >
                    <p>
                      <strong>Score:</strong> {currentEval.score ?? "N/A"}/100
                    </p>
                    <p>
                      <strong>Feedback:</strong>{" "}
                      {currentEval.feedback || "No feedback generated."}
                    </p>
                    {currentEval.suggestedAnswer && (
                      <p style={{ marginTop: "8px", color: "#8257e5" }}>
                        <strong>Suggested Answer:</strong>{" "}
                        {currentEval.suggestedAnswer}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="feedback-text">
                    {reviewEntry.question.suggestionAnswer ? (
                      <>
                        <strong>Reference Answer:</strong>{" "}
                        {reviewEntry.question.suggestionAnswer}
                      </>
                    ) : (
                      "No evaluation returned for this question."
                    )}
                  </p>
                )}
              </div>

              <div className="review-actions">
                <button
                  type="button"
                  className="mock-action-btn secondary"
                  onClick={() => moveReview(-1)}
                  disabled={reviewIndex === 0}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="mock-action-btn primary"
                  onClick={() => moveReview(1)}
                  disabled={reviewIndex >= history.length - 1}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default MockInterviewPage;
