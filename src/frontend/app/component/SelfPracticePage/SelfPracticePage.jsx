"use client";
import { useEffect, useRef, useState } from "react";
import NavigationBar from "../NavigationBar/NavigationBar";
import "./SelfPracticePage.css";
import "../MockInterviewPage/MockInterviewPage.css"; // Reuse mock styles

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

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

const DIFFICULTY_OPTIONS = [
  { value: "MIXED", label: "Mixed (any difficulty)" },
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

const NUM_QUESTIONS_OPTIONS = [5, 10, 15, 20];

const SelfPracticePage = () => {
  // States cho Position Autocomplete Input
  const [positionQuery, setPositionQuery] = useState("");
  const [positionSuggestions, setPositionSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState("");
  const positionWrapperRef = useRef(null);

  // States cho Difficulty và NumQuestions
  const [selectedDifficulty, setSelectedDifficulty] = useState("MIXED");
  const [numQuestions, setNumQuestions] = useState(10);

  // States tải dữ liệu câu hỏi
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [pool, setPool] = useState([]);
  const [poolIndex, setPoolIndex] = useState(0);

  const [answerText, setAnswerText] = useState("");
  const [recording, setRecording] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const recorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [showAnswer, setShowAnswer] = useState(false);

  // Tìm kiếm danh sách Position gợi ý từ Backend API
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

  // Đóng dropdown khi click ra ngoài
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
    setSelectedPosition(e.target.value);
    setSuggestionsOpen(true);
  };

  const handleSelectPosition = (name) => {
    setPositionQuery(name);
    setSelectedPosition(name);
    setSuggestionsOpen(false);
  };

  // Hàm Filter chính thức gọi API Backend lấy câu hỏi từ Database
  const fetchQuestions = async () => {
    if (!selectedPosition.trim()) {
      setLoadError("Please enter or select a position first!");
      return;
    }

    setLoading(true);
    setLoadError(null);
    setPool([]);
    setPoolIndex(0);
    setAnswerText("");
    setAudioUrl("");
    setMediaError("");
    setShowAnswer(false);

    try {
      const params = new URLSearchParams({
        position: selectedPosition.trim(),
        numQuestions: String(numQuestions),
      });

      if (selectedDifficulty && selectedDifficulty !== "MIXED") {
        params.set("difficulty", selectedDifficulty);
      }

      const cleanToken = getAccessToken();

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
            `Không tìm thấy câu hỏi phù hợp cho vị trí "${selectedPosition}" trong Database.`,
          );
        }
      } else {
        setLoadError(`Lỗi tải câu hỏi từ Server (${res.status}).`);
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách câu hỏi:", err);
      setLoadError("Không thể kết nối tới máy chủ Backend.");
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = pool[poolIndex] || null;
  const hasMoreInPool = poolIndex < pool.length - 1;
  const showCard = pool.length > 0 && !loading && currentQuestion;

  const nextQuestion = () => {
    if (!hasMoreInPool) return;
    setPoolIndex((prev) => prev + 1);
    setAnswerText("");
    setAudioUrl("");
    setMediaError("");
    setShowAnswer(false);
  };

  const revealAnswer = () => {
    setShowAnswer((prev) => !prev);
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

  return (
    <div className="self-page-root">
      <NavigationBar />
      <main className="self-main">
        <section className="self-inner">
          <h1 className="selfpractice-title">SELF PRACTICE</h1>

          <div
            className="self-field-select-wrap"
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {/* Input Position dạng Auto-complete tương tự Mock Interview */}
            <div
              className="mock-position-search"
              ref={positionWrapperRef}
              style={{ flex: "1 1 220px" }}
            >
              <input
                type="text"
                className="self-field-select mock-position-input"
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

            {/* Dropdown Đội khó */}
            <select
              className="self-field-select self-difficulty-select"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              style={{ flex: "0 1 180px" }}
            >
              {DIFFICULTY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Dropdown Số lượng câu hỏi */}
            <select
              className="self-field-select self-count-select"
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              style={{ flex: "0 1 140px" }}
            >
              {NUM_QUESTIONS_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} questions
                </option>
              ))}
            </select>

            {/* Nút bấm để thực hiện Filter lấy câu hỏi */}
            <button
              type="button"
              className="mock-action-btn primary"
              onClick={fetchQuestions}
              style={{ padding: "12px 24px", height: "100%" }}
            >
              Start Practice
            </button>
          </div>

          {loadError && <p className="self-error">{loadError}</p>}

          <div className="self-loader-area">
            {loading && (
              <div className="self-loader">
                <div className="self-orbit">
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <div key={idx} className="dot" />
                  ))}
                </div>
                <div className="self-loading-text">
                  Fetching practice questions, please wait!
                </div>
              </div>
            )}
          </div>

          {showCard && (
            <div className="mock-question-wrapper">
              <div className="mock-question-card">
                <div className="mock-card-header">
                  <p className="mock-card-title">
                    Self Practice: {selectedPosition}
                  </p>
                  <span className="self-card-step">
                    {poolIndex + 1}/{pool.length}
                  </span>
                </div>
                <h2 className="mock-question-title">
                  {currentQuestion.content}
                </h2>
                <div className="mock-answer-area">
                  <button
                    type="button"
                    className={`mock-micro-icon-button ${
                      recording ? "recording" : ""
                    }`}
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

                {showAnswer && (
                  <div className="self-answer-reveal">
                    <p className="self-answer-reveal-label">Suggested Answer</p>
                    <p className="self-answer-reveal-text">
                      {currentQuestion.suggestionAnswer ||
                        "No suggested answer available in database."}
                    </p>
                  </div>
                )}

                {!hasMoreInPool && (
                  <p className="mock-pool-exhausted">
                    This is the last question in this practice set.
                  </p>
                )}

                <div className="mock-control-row">
                  <button
                    type="button"
                    className={`mock-action-btn key ${
                      showAnswer ? "active" : ""
                    }`}
                    onClick={revealAnswer}
                  >
                    {showAnswer ? "Hide Key" : "Key"}
                  </button>
                  <button
                    type="button"
                    className="mock-action-btn primary"
                    onClick={nextQuestion}
                    disabled={!hasMoreInPool}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default SelfPracticePage;
