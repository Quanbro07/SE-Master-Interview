"use client";
import { useEffect, useRef, useState } from "react";
import NavigationBar from "../NavigationBar/NavigationBar";
import "./MockInterviewPage.css";
import {
  getFallbackQuestions,
  getFallbackPositionSuggestions,
} from "../SharedQuestionData/sampleQuestions";

// TODO: confirm this matches wherever the backend is actually reachable
// from the browser (same value used elsewhere).
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const POOL_SIZE = 10;

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
  // Xóa dấu ngoặc kép ở 2 đầu nếu có
  return token.replace(/^"(.*)"$/, "$1").trim();
};

const MockInterviewPage = () => {
  // Position search (typed input + suggestions), same pattern as
  // Self-practice, replacing the old static <select>.
  const [positionQuery, setPositionQuery] = useState("");
  const [positionSuggestions, setPositionSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selectedField, setSelectedField] = useState("");
  const positionWrapperRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [usingSampleData, setUsingSampleData] = useState(false);

  const [pool, setPool] = useState([]);
  const [poolIndex, setPoolIndex] = useState(0);

  const [answerText, setAnswerText] = useState("");
  const [recording, setRecording] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const recorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [history, setHistory] = useState([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);

  const currentQuestion = pool[poolIndex] || null;
  const hasMoreInPool = poolIndex < pool.length - 1;
  const showCard = selectedField && !loading && currentQuestion && !reviewMode;

  // Debounced position search, falling back to local sample positions
  // when the backend returns nothing (no data yet) or fails.
  useEffect(() => {
    if (!positionQuery.trim()) {
      setPositionSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        // Móc token từ LocalStorage
        let token = localStorage.getItem("accessToken") || localStorage.getItem("token") || "";
        const cleanToken = token.replace(/^Bearer\s+/i, "").replace(/"/g, "").trim();
        const headers = cleanToken ? { Authorization: `Bearer ${cleanToken}` } : {};

        const res = await fetch(
          `${API_BASE}/api/v1/position/search?q=${encodeURIComponent(positionQuery)}`,
          { headers } // Đính kèm thẻ căn cước vào đây
        );
        
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            setPositionSuggestions(data);
            return;
          }
        }
        setPositionSuggestions(getFallbackPositionSuggestions(positionQuery));
      } catch {
        setPositionSuggestions(getFallbackPositionSuggestions(positionQuery));
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

  const startSession = async (position) => {
    setSelectedField(position);
    setSuggestionsOpen(false);
    setLoading(true);
    setLoadError(null);
    setUsingSampleData(false);
    setReviewMode(false);
    setPool([]);
    setPoolIndex(0);
    setHistory([]);
    setAnswerText("");
    setAudioUrl("");
    setMediaError("");

    try {
      // 1. ĐỊNH DẠNG LẠI CHỮ TRƯỚC KHI GỬI (Vũ khí chống lỗi 401 ảo)
      const formattedPosition = position
        .trim()
        .toUpperCase()
        .replace(/[-\s]+/g, "_") // Đổi khoảng trắng & dấu gạch ngang thành dấu gạch dưới
        .replace("BACK_END", "BACKEND") // Gom chữ lại cho đúng chuẩn Backend
        .replace("FRONT_END", "FRONTEND");

      const params = new URLSearchParams({
        position: formattedPosition, // Truyền chữ đã format vào đây (vd: BACKEND_DEVELOPER)
        numQuestions: String(POOL_SIZE),
      });

      // 2. Dùng hàm xịn để lấy token
      const rawToken = getAccessToken();
      const cleanToken = rawToken ? rawToken.replace(/^Bearer\s+/i, "") : "";
      
      const res = await fetch(
        `${API_BASE}/api/v1/question/get-question?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            // 3. Gắn Header Token
            ...(cleanToken ? { Authorization: `Bearer ${cleanToken}` } : {})
          }
        }
      );

      // Nếu Token hết hạn thật sự
      if (res.status === 401) {
        setLoadError("Phiên đăng nhập đã hết hạn hoặc không có quyền (Vui lòng thử đăng nhập tài khoản Interviewee).");
        setLoading(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setPool(data);
          setLoading(false);
          return;
        }
      }
      
      setPool(getFallbackQuestions(position, null, POOL_SIZE));
      setUsingSampleData(true);
    } catch {
      setPool(getFallbackQuestions(position, null, POOL_SIZE));
      setUsingSampleData(true);
    } finally {
      setLoading(false);
    }
  };
  const handleSelectPosition = (name) => {
    setPositionQuery(name);
    startSession(name);
  };

  const submitAnswerAndAdvance = async () => {
    if (!currentQuestion) return;

    setHistory((prev) => [
      ...prev,
      { question: currentQuestion, answerText, audioUrl, feedback: null },
    ]);

    // TODO: this is the integration point for the real adaptive endpoint.
    // Once it exists, replace this pool-walking fallback with a POST that
    // sends { questionId: currentQuestion.questionId, answerText,
    // audioBlob } and returns the next Question, chosen based on the
    // assessed level of this answer.
    if (hasMoreInPool) {
      setPoolIndex((prev) => prev + 1);
      setAnswerText("");
      setAudioUrl("");
      setMediaError("");
    }
  };

  const endInterview = () => {
    if (!currentQuestion) return;
    if (
      !history.some((h) => h.question.questionId === currentQuestion.questionId)
    ) {
      setHistory((prev) => [
        ...prev,
        { question: currentQuestion, answerText, audioUrl, feedback: null },
      ]);
    }
    setReviewIndex(history.length);
    setReviewMode(true);
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
      setMediaError("Microphone is not supported in this browser.");
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
      setMediaError(
        "Unable to access microphone. Please allow permission and retry.",
      );
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

  return (
    <div className="mock-page-root">
      <NavigationBar />
      <main className="mock-main">
        <section className="mock-inner">
          <h1 className="mockinterview-title">MOCK INTERVIEW</h1>
          <div className="mock-page-title-wrap"></div>
          <div className="mock-intro">
            <p className="mock-subtitle">Choose your position</p>
          </div>

          <div className="mock-field-select-wrap">
            <div className="mock-position-search" ref={positionWrapperRef}>
              <input
                type="text"
                className="mock-field-select mock-position-input"
                placeholder="Type a position (e.g. Backend Developer)"
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
                  Generating questions, please wait !
                </div>
              </div>
            )}
          </div>

          {showCard && (
            <div className="mock-question-wrapper">
              <div className="mock-question-card">
                <div className="mock-card-header">
                  <p className="mock-card-title">
                    Mock Interview: {selectedField}
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
                    placeholder="Input your answer here or send your record."
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
                    No more questions in this batch — click End Interview to
                    finish.
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
              <h2 className="review-title">MOCK INTERVIEW: {selectedField}</h2>
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
                  <>
                    <p className="audio-summary">
                      Voice answer recorded. Play it back below.
                    </p>
                    <audio
                      controls
                      src={reviewEntry.audioUrl}
                      style={{ width: "100%", marginTop: "12px" }}
                    />
                  </>
                )}
              </div>
              <div className="feedback-report">
                <span className="feedback-score">FEEDBACK REPORT</span>
                <p className="feedback-text feedback-pending">
                  Pending backend evaluation — feedback will appear here once
                  the assessment service is connected.
                </p>
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
