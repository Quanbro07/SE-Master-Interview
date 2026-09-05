"use client";
import { useEffect, useRef, useState } from "react";
import NavigationBar from "../NavigationBar/NavigationBar";
import "./SelfPracticePage.css";
import UserHeader from "../UserHeader/UserHeader";
import ChatPanel from "../ChatPanel/ChatPanel";
import "../MockInterviewPage/MockInterviewPage.css";

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
    .replace(/^"+|"+$/g, "")
    .replace(/^Bearer\s+/i, "")
    .trim();
};

const authHeaders = () => {
  const token = getAccessToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
};

const DIFFICULTY_OPTIONS = [
  { value: "MIXED", label: "Mixed (any difficulty)" },
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

const NUM_QUESTIONS_OPTIONS = [5, 10, 15, 20];

const SelfPracticePage = () => {
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const [positionQuery, setPositionQuery] = useState("");
  const [positionSuggestions, setPositionSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState("");
  const positionWrapperRef = useRef(null);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) setCurrentUser(JSON.parse(userStr));
    } catch (e) {
      console.error(e);
    }
  }, []);

  // States cho Filter
  const [selectedDifficulty, setSelectedDifficulty] = useState("MIXED");
  const [numQuestions, setNumQuestions] = useState(10);

  // States cho Loading & Data
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [pool, setPool] = useState([]);
  const [poolIndex, setPoolIndex] = useState(0);

  // ✅ STATE MỚI: Dùng object để lưu lại dữ liệu (câu trả lời, evaluation, showKey) của TỪNG câu hỏi
  // Cấu trúc: { [qId]: { answerText: "", evaluationResult: null, showAnswer: false } }
  const [userAnswers, setUserAnswers] = useState({});
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Auto-complete API tìm kiếm Position
  useEffect(() => {
    if (!positionQuery.trim()) {
      setPositionSuggestions([]);
      return;
    }
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/v1/position/search?q=${encodeURIComponent(positionQuery)}`,
          {
            headers: {
              ...authHeaders(),
            },
          },
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
    setSelectedPosition(e.target.value);
    setSuggestionsOpen(true);
  };

  const handleSelectPosition = (name) => {
    setPositionQuery(name);
    setSelectedPosition(name);
    setSuggestionsOpen(false);
  };

  // Fetch Questions
  const fetchQuestions = async () => {
    if (!selectedPosition.trim()) {
      setLoadError("Please enter or select a position first!");
      return;
    }
    setLoading(true);
    setLoadError(null);
    setPool([]);
    setPoolIndex(0);
    setUserAnswers({}); // Reset toàn bộ bộ nhớ câu trả lời khi tạo đề mới

    try {
      const params = new URLSearchParams({
        position: selectedPosition.trim(),
        numQuestions: String(numQuestions),
      });

      if (selectedDifficulty && selectedDifficulty !== "MIXED") {
        params.set("difficulty", selectedDifficulty);
      }

      const res = await fetch(
        `${API_BASE}/api/v1/question/get-question?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
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
  const currentQId = currentQuestion
    ? currentQuestion.questionId || poolIndex
    : null;

  // Lấy dữ liệu tạm thời của câu hỏi hiện tại ra
  const currentSavedData = (currentQId && userAnswers[currentQId]) || {
    answerText: "",
    evaluationResult: null,
    showAnswer: false,
  };

  const hasMoreInPool = poolIndex < pool.length - 1;
  const showCard = pool.length > 0 && !loading && currentQuestion;

  // Helper hàm để cập nhật dữ liệu của riêng câu hiện tại
  const updateCurrentData = (fields) => {
    if (!currentQId) return;
    setUserAnswers((prev) => ({
      ...prev,
      [currentQId]: {
        ...(prev[currentQId] || {
          answerText: "",
          evaluationResult: null,
          showAnswer: false,
        }),
        ...fields,
      },
    }));
  };

  const nextQuestion = () => {
    if (!hasMoreInPool) return;
    setPoolIndex((prev) => prev + 1);
  };

  const prevQuestion = () => {
    if (poolIndex <= 0) return;
    setPoolIndex((prev) => prev - 1);
  };

  const revealAnswer = () => {
    updateCurrentData({ showAnswer: !currentSavedData.showAnswer });
  };

  const handleEvaluate = async () => {
    if (!currentSavedData.answerText.trim()) {
      alert("Please input your answer first before evaluating!");
      return;
    }

    setIsEvaluating(true);

    try {
      const payload = {
        answer_list: [
          {
            questionId: currentQuestion.questionId,
            answer: currentSavedData.answerText,
          },
        ],
      };

      const res = await fetch(
        `${API_BASE}/api/v1/question/evaluate-questions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) throw new Error("Lỗi khi chấm điểm!");

      const data = await res.json();

      if (data && data.length > 0) {
        // ✅ Lưu lại kết quả Evaluate vào state câu hỏi hiện tại
        updateCurrentData({ evaluationResult: data[0] });
      }
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi khi chấm điểm. Vui lòng thử lại!");
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="dashboard-container">
      <NavigationBar
        isCollapsed={navCollapsed}
        setIsCollapsed={setNavCollapsed}
      />

      <main
        className={`dashboard-main self-main ${!chatCollapsed ? "with-chat" : ""}`}
      >
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
                        style={{ textTransform: "uppercase" }}
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
                    Self Practice:{" "}
                    <span style={{ textTransform: "uppercase" }}>
                      {selectedPosition}
                    </span>
                  </p>
                  <span className="self-card-step">
                    {poolIndex + 1}/{pool.length}
                  </span>
                </div>
                <h2 className="mock-question-title">
                  {currentQuestion.content}
                </h2>

                <div className="mock-answer-area">
                  <textarea
                    className="mock-answer-textarea"
                    value={currentSavedData.answerText}
                    onChange={(e) =>
                      updateCurrentData({ answerText: e.target.value })
                    }
                    placeholder="Input your answer here or record audio."
                    disabled={isEvaluating}
                  />
                </div>

                {/* HIỂN THỊ EVALUATION RESULT CỦA CÂU NÀY */}
                {currentSavedData.evaluationResult &&
                  currentSavedData.evaluationResult.analysis && (
                    <div className="self-evaluation-box">
                      <h4 className="self-eval-title">AI Feedback</h4>

                      {currentSavedData.evaluationResult.analysis
                        .smartSuggestions &&
                        currentSavedData.evaluationResult.analysis
                          .smartSuggestions.length > 0 && (
                          <ul className="self-eval-list">
                            {currentSavedData.evaluationResult.analysis.smartSuggestions.map(
                              (sug, i) => (
                                <li key={i}>{sug}</li>
                              ),
                            )}
                          </ul>
                        )}

                      <div className="self-eval-metrics">
                        <div>
                          🎯 Depth:{" "}
                          <span
                            className="metric-score"
                            style={{ color: "#4ade80", fontWeight: "bold" }}
                          >
                            {currentSavedData.evaluationResult.analysis.depth
                              ?.rating || "N/A"}
                          </span>
                        </div>

                        <div>
                          🔍 Relevance:{" "}
                          <span
                            className="metric-score"
                            style={{ color: "#4ade80", fontWeight: "bold" }}
                          >
                            {currentSavedData.evaluationResult.analysis
                              .relevance?.status || "N/A"}
                          </span>
                          {currentSavedData.evaluationResult.analysis.relevance
                            ? ` (Matched ${currentSavedData.evaluationResult.analysis.relevance.matchedKeywords}/${currentSavedData.evaluationResult.analysis.relevance.totalKeywords} keywords)`
                            : ""}
                        </div>

                        <div>
                          💪 Confidence:{" "}
                          <span
                            className="metric-score"
                            style={{ color: "#4ade80", fontWeight: "bold" }}
                          >
                            {currentSavedData.evaluationResult.analysis
                              .confidence?.status || "N/A"}
                          </span>
                        </div>

                        <div>
                          📝 Length:{" "}
                          <span
                            className="metric-score"
                            style={{ color: "#4ade80", fontWeight: "bold" }}
                          >
                            {currentSavedData.evaluationResult.analysis
                              .comparison?.status || "N/A"}
                          </span>
                          {currentSavedData.evaluationResult.analysis.comparison
                            ? ` (${currentSavedData.evaluationResult.analysis.comparison.avgWords} words)`
                            : ""}
                        </div>
                      </div>
                    </div>
                  )}

                {currentSavedData.showAnswer && (
                  <div className="self-answer-reveal">
                    <p className="self-answer-reveal-label">Suggested Answer</p>
                    <p className="self-answer-reveal-text">
                      {currentQuestion.answer ||
                        "No suggested answer available in database."}
                    </p>
                  </div>
                )}

                {!hasMoreInPool && (
                  <p
                    className="mock-pool-exhausted"
                    style={{
                      marginTop: "16px",
                      color: "#fbbf24",
                      fontStyle: "italic",
                      textAlign: "center",
                    }}
                  >
                    This is the last question in this practice set.
                  </p>
                )}

                {/* HÀNG BẮT ĐẦU ĐIỀU KHIỂN NÚT */}
                <div className="mock-control-row" style={{ marginTop: "24px" }}>
                  <button
                    type="button"
                    className="mock-action-btn prev"
                    onClick={prevQuestion}
                    disabled={poolIndex === 0}
                  >
                    Prev
                  </button>

                  <button
                    type="button"
                    className={`mock-action-btn key ${currentSavedData.showAnswer ? "active" : ""}`}
                    onClick={revealAnswer}
                  >
                    {currentSavedData.showAnswer ? "Hide Key" : "Key"}
                  </button>

                  <button
                    type="button"
                    className="mock-action-btn evaluate-btn"
                    onClick={handleEvaluate}
                    disabled={
                      isEvaluating || !currentSavedData.answerText.trim()
                    }
                  >
                    {isEvaluating ? "Evaluating..." : "Evaluate"}
                  </button>

                  {/* ✅ BẮT BUỘC ĐÃ EVALUATE MỚI BẤM NEXT ĐƯỢC */}
                  <button
                    type="button"
                    className="mock-action-btn primary"
                    onClick={nextQuestion}
                    disabled={
                      !hasMoreInPool || !currentSavedData.evaluationResult
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <UserHeader
        user={currentUser}
        isChatOpen={!chatCollapsed}
        onToggleChat={() => setChatCollapsed((prev) => !prev)}
      />

      <ChatPanel isCollapsed={chatCollapsed} onBookFromChat={() => {}} />
    </div>
  );
};

export default SelfPracticePage;
