"use client";
import { useEffect, useRef, useState } from "react";
import NavigationBar from "../NavigationBar/NavigationBar";
import "./SelfPracticePage.css";
import "../MockInterviewPage/MockInterviewPage.css"; // reuse mock-* card styles
import { getFallbackQuestions } from "../SharedQuestionData/sampleQuestions";

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
  return token.replace(/^"(.*)"$/, "$1").trim();
};
// Danh sách vị trí cố định theo yêu cầu của bạn
const STATIC_POSITIONS = [
  { id: 1, name: "BACK-END DEVELOPER" },
  { id: 2, name: "FRONT-END DEVELOPER" },
  { id: 3, name: "DATA ENGINEER" },
  { id: 4, name: "FULL-STACK DEVELOPER" },
  { id: 5, name: "DEVOPS ENGINEER" },
];

const DIFFICULTY_OPTIONS = [
  { value: "MIXED", label: "Mixed (any difficulty)" },
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

const NUM_QUESTIONS_OPTIONS = [5, 10, 15, 20];

const SelfPracticePage = () => {
  // Positions state
  const [positions, setPositions] = useState(STATIC_POSITIONS);
  const [selectedPosition, setSelectedPosition] = useState("");

  const [selectedDifficulty, setSelectedDifficulty] = useState("MIXED");
  const [numQuestions, setNumQuestions] = useState(10);

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

  const [showAnswer, setShowAnswer] = useState(false);

  // Sync positions from Backend API /api/v1/position/get-all if available
useEffect(() => {
    const fetchPositions = async () => {
      try {
        // 1. Gọi hàm lấy token
        const rawToken = getAccessToken();
        const cleanToken = rawToken ? rawToken.replace(/^Bearer\s+/i, "") : "";
        
        // 2. Đính kèm vũ khí vào Request
        const res = await fetch(`${API_BASE}/api/v1/position/get-all`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(cleanToken ? { Authorization: `Bearer ${cleanToken}` } : {})
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // Map string array from backend to {id, name} format
            const mapped = data.map((posName, index) => ({
              id: index + 1,
              name: posName,
            }));
            setPositions(mapped);
          }
        }
      } catch (err) {
        console.warn("Using static positions due to API error:", err);
      }
    };
    fetchPositions();
  }, []);

  const fetchQuestions = async (positionName, difficulty, count) => {
    if (!positionName) return;

    setLoading(true);
    setLoadError(null);
    setUsingSampleData(false);
    setPool([]);
    setPoolIndex(0);
    setAnswerText("");
    setAudioUrl("");
    setMediaError("");
    setShowAnswer(false);

    try {
      // 1. CHUẨN HÓA CHỮ ĐỂ TRÁNH LỖI ENUM 401 ẢO
      const formattedPosition = positionName
        .trim()
        .toUpperCase()
        .replace(/[-\s]+/g, "_")
        .replace("BACK_END", "BACKEND")
        .replace("FRONT_END", "FRONTEND");

      const params = new URLSearchParams({
        position: formattedPosition,
        numQuestions: String(count),
      });
      
      if (difficulty && difficulty !== "MIXED") {
        params.set("difficulty", difficulty);
      }

      // 2. LẤY VÀ LÀM SẠCH TOKEN
      const rawToken = getAccessToken();
      const cleanToken = rawToken ? rawToken.replace(/^Bearer\s+/i, "") : "";

      // 3. GỌI API VỚI HEADER AUTHORIZATION
      const res = await fetch(
        `${API_BASE}/api/v1/question/get-question?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(cleanToken ? { Authorization: `Bearer ${cleanToken}` } : {})
          }
        }
      );

      // Nếu Token hết hạn thật sự
      if (res.status === 401) {
        setLoadError("Phiên đăng nhập đã hết hạn. Vui lòng đăng xuất và đăng nhập lại!");
        setLoading(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setPool(data);
          setLoading(false);
          return;
        }
      }

      // Fallback local data if backend returns empty
      setPool(getFallbackQuestions(positionName, difficulty, count));
      setUsingSampleData(true);
    } catch (err) {
      setPool(getFallbackQuestions(positionName, difficulty, count));
      setUsingSampleData(true);
    } finally {
      setLoading(false);
    }  };

  const handlePositionChange = (e) => {
    const posName = e.target.value;
    setSelectedPosition(posName);
    if (posName) {
      fetchQuestions(posName, selectedDifficulty, numQuestions);
    }
  };

  const handleDifficultyChange = (e) => {
    const diff = e.target.value;
    setSelectedDifficulty(diff);
    if (selectedPosition) {
      fetchQuestions(selectedPosition, diff, numQuestions);
    }
  };

  const handleNumQuestionsChange = (e) => {
    const count = Number(e.target.value);
    setNumQuestions(count);
    if (selectedPosition) {
      fetchQuestions(selectedPosition, selectedDifficulty, count);
    }
  };

  const currentQuestion = pool[poolIndex] || null;
  const hasMoreInPool = poolIndex < pool.length - 1;
  const showCard = selectedPosition && !loading && currentQuestion;

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

  return (
    <div className="self-page-root">
      <NavigationBar />
      <main className="self-main">
        <section className="self-inner">
          <h1 className="selfpractice-title">-----SELF PRACTICE-----</h1>

          <div className="self-field-select-wrap">
            {/* Chuyển ô Input autocomplete thành Dropdown Selection */}
            <select
              className="self-field-select self-position-select"
              value={selectedPosition}
              onChange={handlePositionChange}
            >
              <option value="" disabled>
                -- Select Position --
              </option>
              {positions.map((pos) => (
                <option key={pos.id} value={pos.name}>
                  {pos.name}
                </option>
              ))}
            </select>

            <select
              className="self-field-select self-difficulty-select"
              value={selectedDifficulty}
              onChange={handleDifficultyChange}
            >
              {DIFFICULTY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              className="self-field-select self-count-select"
              value={numQuestions}
              onChange={handleNumQuestionsChange}
            >
              {NUM_QUESTIONS_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} questions
                </option>
              ))}
            </select>
          </div>

          {loadError && <p className="self-error">{loadError}</p>}
          {usingSampleData && (
            <p className="self-sample-notice">
              No live data yet — showing sample questions for preview.
            </p>
          )}

          <div className="self-loader-area">
            {loading && (
              <div className="self-loader">
                <div className="self-orbit">
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <div key={idx} className="dot" />
                  ))}
                </div>
                <div className="self-loading-text">
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

                {showAnswer && (
                  <div className="self-answer-reveal">
                    <p className="self-answer-reveal-label">Answer</p>
                    <p className="self-answer-reveal-text">
                      {currentQuestion.suggestionAnswer ||
                        "No suggested answer available."}
                    </p>
                  </div>
                )}

                {!hasMoreInPool && (
                  <p className="mock-pool-exhausted">
                    This is the last question in the batch.
                  </p>
                )}

                <div className="mock-control-row">
                  <button
                    type="button"
                    className={`mock-action-btn key ${showAnswer ? "active" : ""}`}
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
