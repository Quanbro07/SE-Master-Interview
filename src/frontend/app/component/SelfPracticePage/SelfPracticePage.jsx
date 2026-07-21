"use client";
import { useEffect, useRef, useState } from "react";
import NavigationBar from "../NavigationBar/NavigationBar";
import "./SelfPracticePage.css";
import "../MockInterviewPage/MockInterviewPage.css"; // reuse mock-* card styles
import {
  getFallbackQuestions,
  getFallbackPositionSuggestions,
} from "../SharedQuestionData/sampleQuestions";

// TODO: confirm this matches wherever the backend is actually reachable
// from the browser (same value used elsewhere).
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const DIFFICULTY_OPTIONS = [
  { value: "MIXED", label: "Mixed (any difficulty)" },
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

const NUM_QUESTIONS_OPTIONS = [5, 10, 15, 20];

const SelfPracticePage = () => {
  // Position autocomplete
  const [positionQuery, setPositionQuery] = useState("");
  const [positionSuggestions, setPositionSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState("");
  const positionWrapperRef = useRef(null);

  const [selectedDifficulty, setSelectedDifficulty] = useState("");
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

  // Reveals suggestionAnswer for the current question in place; resets
  // whenever the user moves to a different question.
  const [showAnswer, setShowAnswer] = useState(false);

  // Debounced autocomplete search against /api/v1/position/search?q=...,
  // falling back to local sample positions when the backend returns
  // nothing (no data yet) or fails.
  useEffect(() => {
    if (!positionQuery.trim()) {
      setPositionSuggestions([]);
      return;
    }
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/v1/position/search?q=${encodeURIComponent(positionQuery)}`,
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
    setSelectedPosition("");
  };

  const startSession = async (position) => {
    setSelectedPosition(position);
    setSuggestionsOpen(false);
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
      const params = new URLSearchParams({
        position,
        numQuestions: String(numQuestions),
      });
      if (selectedDifficulty && selectedDifficulty !== "MIXED") {
        params.set("difficulty", selectedDifficulty);
      }
      const res = await fetch(
        `${API_BASE}/api/v1/question/question?${params.toString()}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setPool(data);
          setLoading(false);
          return;
        }
      }
      // No backend data yet — use local samples instead of showing empty.
      setPool(getFallbackQuestions(position, selectedDifficulty, numQuestions));
      setUsingSampleData(true);
    } catch {
      setPool(getFallbackQuestions(position, selectedDifficulty, numQuestions));
      setUsingSampleData(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPosition = (name) => {
    setPositionQuery(name);
    startSession(name);
  };

  const currentQuestion = pool[poolIndex] || null;
  const hasMoreInPool = poolIndex < pool.length - 1;
  const showCard = selectedPosition && !loading && currentQuestion;

  // TODO: integration point for a real adaptive endpoint, if/when one is
  // added for self-practice too. Currently just walks the pre-fetched pool.
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
            <div className="self-position-search" ref={positionWrapperRef}>
              <input
                type="text"
                className="self-field-select self-position-input"
                placeholder="Type a position (e.g. Backend Developer)"
                value={positionQuery}
                onChange={handlePositionInputChange}
                onFocus={() => positionQuery.trim() && setSuggestionsOpen(true)}
              />
              {suggestionsOpen && positionQuery.trim() && (
                <div className="self-position-dropdown">
                  {positionSuggestions.length > 0 ? (
                    positionSuggestions.map((name) => (
                      <button
                        type="button"
                        key={name}
                        className="self-position-dropdown-item"
                        onClick={() => handleSelectPosition(name)}
                      >
                        {name}
                      </button>
                    ))
                  ) : (
                    <div className="self-position-dropdown-empty">
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
            >
              <option value="" disabled>
                Select difficulty
              </option>
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
                      {currentQuestion.suggestionAnswer}
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
