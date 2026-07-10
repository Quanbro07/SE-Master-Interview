"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import NavigationBar from "../NavigationBar/NavigationBar";
import "./MockInterviewPage.css";

const fields = [
  "Back-end Developer",
  "Front-end Developer",
  "Prompt Engineer",
  "Data Engineer",
];

const questionsByField = {
  "Back-end Developer": [
    {
      prompt:
        "In a high-concurrency Java application, how would you implement a custom cache mechanism that ensures thread safety without causing severe performance bottlenecks like synchronized blocks do?",
      sampleAnswer:
        "I would use a concurrent hash-based cache with computeIfAbsent and segmented locking, or a lock-free structure backed by ConcurrentHashMap and AtomicReference for the metadata, so only the hot entry updates are contended.",
      feedback: {
        score: 9.5,
        strengths:
          "Deep architectural understanding. Great job mentioning Lock Striping and CAS operations with ConcurrentHashMap.",
        improvements:
          "ComputeIfAbsent gotcha in Java 8 vs 9+: while your logic is correct, be careful when using computeIfAbsent with long-running computations because it can still hold the segment lock.",
      },
    },
    {
      prompt:
        "How would you design a secure REST API authentication flow for a mobile client while preventing token theft and replay attacks?",
      sampleAnswer:
        "I would issue short-lived access tokens, pair them with refresh tokens stored securely, use HTTPS only, rotate refresh tokens on each use, and validate client metadata plus token binding when possible.",
      feedback: {
        score: 8.8,
        strengths:
          "Clear security-first approach. Good use of refresh token rotation and transport security.",
        improvements:
          "Mention JWT token expiry and blacklisting strategies to strengthen token revocation handling.",
      },
    },
    {
      prompt:
        "Explain a strategy to handle graceful degradation in a distributed microservice system when one service becomes unavailable.",
      sampleAnswer:
        "I would use circuit breakers, fallback responses, bulkheads, and request timeouts while surfacing degraded state to the client clearly so the system can continue with reduced functionality.",
      feedback: {
        score: 9.0,
        strengths:
          "Strong distributed-systems reasoning. Nice use of circuit breaker and bulkhead patterns.",
        improvements:
          "Also consider retry backoff limits and observability around service degradation for faster incident response.",
      },
    },
    {
      prompt:
        "What caching invalidation strategy would you use for a read-heavy microservice with frequent updates to a subset of data?",
      sampleAnswer:
        "I would combine time-based expiry for stale data with event-driven invalidation for updated entities, ensuring hot keys stay fresh and stale content is removed quickly.",
      feedback: {
        score: 9.1,
        strengths:
          "Nice hybrid invalidation strategy. Strong reasoning for balancing freshness and performance.",
        improvements:
          "Make sure you also consider how to handle cache stampede during invalidation bursts.",
      },
    },
    {
      prompt:
        "How would you monitor a distributed backend system to detect a slow service before it affects user experience?",
      sampleAnswer:
        "I would use latency-based SLIs, distributed tracing, synthetic checks, and alerting on tail latency while correlating traces with error rate and saturation.",
      feedback: {
        score: 9.2,
        strengths:
          "Excellent focus on observability. Good use of tail latency and tracing.",
        improvements:
          "Also mention how to run incident drills to verify the alerting works in practice.",
      },
    },
  ],
  "Front-end Developer": [
    {
      prompt:
        "What is the best way to minimize repaints in a large single-page app while preserving smooth interactions?",
      sampleAnswer:
        "I would limit layout-triggering operations, use CSS transforms for animations, separate offscreen rendering work into web workers, and batch DOM updates to reduce paint churn.",
      feedback: {
        score: 8.7,
        strengths:
          "Good focus on performance. Excellent mention of avoiding layout-triggering operations.",
        improvements:
          "Try adding a concrete example of debouncing resize and scroll handlers for better runtime behavior.",
      },
    },
    {
      prompt:
        "How would you structure CSS for a component library shared across multiple products?",
      sampleAnswer:
        "I would use atomic utility classes, tokens for spacing and color, a theme layer for design tokens, and isolate component styles with CSS Modules or shadow DOM to avoid cascading issues.",
      feedback: {
        score: 9.1,
        strengths: "Nice system-level answer with good token thinking.",
        improvements:
          "Consider how to support theming and dark mode without drastically increasing bundle size.",
      },
    },
    {
      prompt:
        "How would you build an accessible dropdown component that works well on both keyboard and touch?",
      sampleAnswer:
        "I would use keyboard-friendly focus management, ARIA roles, and a touch-friendly hit area, while ensuring the component degrades gracefully when JS is unavailable.",
      feedback: {
        score: 9.0,
        strengths:
          "Strong accessibility thinking. Nice attention to keyboard and touch.",
        improvements:
          "Also mention how you would test it with screen readers and focus traps.",
      },
    },
    {
      prompt:
        "What pattern would you follow for synchronizing client state with a remote API in a React app?",
      sampleAnswer:
        "I would use a cache layer with stale-while-revalidate semantics, optimistic UI updates, and error handling that gracefully reverts changes if the API call fails.",
      feedback: {
        score: 9.1,
        strengths:
          "Nice state synchronization strategy. Good use of optimistic updates.",
        improvements:
          "Clarify how you would avoid overfetching when multiple components need the same data.",
      },
    },
    {
      prompt:
        "How would you keep a component tree performant when many inputs update rapidly?",
      sampleAnswer:
        "I would isolate state locally, memoize expensive render paths, use virtualization for long lists, and debounce inputs when appropriate.",
      feedback: {
        score: 8.9,
        strengths:
          "Strong performance awareness. Good use of memoization and virtualization.",
        improvements:
          "Add a concrete example of where to avoid unnecessary re-renders in practice.",
      },
    },
  ],
  "Prompt Engineer": [
    {
      prompt:
        "How do you test a prompt to make sure it is robust across different model versions?",
      sampleAnswer:
        "I would use a suite of benchmark examples, validate output formats, compare behavior across models, and add guard clauses with explicit instructions to reduce version-specific drift.",
      feedback: {
        score: 9.0,
        strengths:
          "Strong methodology. Good emphasis on benchmarks and guard clauses.",
        improvements:
          "Also mention handling prompt chaining failure modes and token budget constraints.",
      },
    },
    {
      prompt:
        "What is a reliable way to prevent a large language model from generating unsafe content in a production system?",
      sampleAnswer:
        "I would use layered controls: prompt safety instructions, system-level filters, post-generation classifiers, and human review for edge cases.",
      feedback: {
        score: 8.6,
        strengths:
          "Solid safety-first architecture. Nice layered defense concept.",
        improvements:
          "Add an example of how you would audit and improve the filter over time.",
      },
    },
    {
      prompt:
        "How would you convert a vague business request into a reliable model prompt?",
      sampleAnswer:
        "I would clarify the objective, define input/output constraints, provide examples, and refine the prompt through iterative validation.",
      feedback: {
        score: 9.2,
        strengths:
          "Great framing of prompt engineering as an iterative design process.",
        improvements:
          "Consider including a test harness for prompt validation as part of the workflow.",
      },
    },
    {
      prompt:
        "How do you measure whether a prompt is producing useful, consistent results?",
      sampleAnswer:
        "I would define success metrics, run the prompt against a validation set, compare output quality across versions, and track drift over time.",
      feedback: {
        score: 8.9,
        strengths: "Strong measurement focus and validation approach.",
        improvements:
          "Add more detail on how you would operationalize feedback from stakeholders.",
      },
    },
    {
      prompt:
        "What would you do if the same prompt returned inconsistent answers from the same model?",
      sampleAnswer:
        "I would tighten the prompt, add explicit constraints, add examples, and reduce stochasticity by fixing parameters like temperature.",
      feedback: {
        score: 9.0,
        strengths: "Good debugging mindset. Solid use of prompt conditioning.",
        improvements:
          "Mention how to verify consistency across repeated runs and edge cases.",
      },
    },
  ],
  "Data Engineer": [
    {
      prompt:
        "How would you maintain data quality in a large ETL pipeline that runs every hour?",
      sampleAnswer:
        "I would add row-level validation, schema checks, drift detection, and systematic alerting for missing values or unexpected cardinalities.",
      feedback: {
        score: 8.9,
        strengths: "Good operational detail. Strong use of drift detection.",
        improvements:
          "Mention data lineage tracking and replayability for debugging failed loads.",
      },
    },
    {
      prompt:
        "What strategy would you use for joining streaming and batch data sources?",
      sampleAnswer:
        "I would use a wide-table stateful stream join with windows and watermarks, and keep batch snapshots for late-arriving state in the stream processor.",
      feedback: {
        score: 9.2,
        strengths:
          "Excellent gap analysis. The windowed join answer is very strong.",
        improvements:
          "Include how you would monitor lateness and handle duplicate records for exactly-once semantics.",
      },
    },
    {
      prompt:
        "How would you design a schema for a time-series analytics dataset with millions of daily rows?",
      sampleAnswer:
        "I would use partitioned storage, compress older segments, keep a narrow event schema, and pre-aggregate frequently queried dimensions.",
      feedback: {
        score: 9.0,
        strengths:
          "Strong data modeling sense. Nice use of partitioning and compression.",
        improvements:
          "Also note how you would balance query speed with storage cost.",
      },
    },
    {
      prompt:
        "What approach would you use to detect data drift in a streaming ingestion pipeline?",
      sampleAnswer:
        "I would compare distribution snapshots over time, validate schema evolution, and alert on sudden spikes in nulls or cardinality changes.",
      feedback: {
        score: 8.8,
        strengths: "Good operational focus. Solid drift detection approach.",
        improvements:
          "Consider how to automatically quarantine suspect records for review.",
      },
    },
    {
      prompt:
        "How would you ensure a data pipeline recovers cleanly after a failed batch job?",
      sampleAnswer:
        "I would use idempotent writes, checkpointed state, replayable inputs, and clear rollback procedures for incomplete batches.",
      feedback: {
        score: 9.1,
        strengths:
          "Excellent reliability thinking. Good use of idempotence and replayability.",
        improvements:
          "Mention how you would surface the failure reason to downstream consumers.",
      },
    },
  ],
};

const MockInterviewPage = () => {
  const [selectedField, setSelectedField] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerText, setAnswerText] = useState("");
  const [reviewMode, setReviewMode] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const recorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const questions = useMemo(() => {
    return selectedField ? questionsByField[selectedField] || [] : [];
  }, [selectedField]);

  const currentQuestion = questions[currentIndex] || null;
  const lastQuestionIndex = questions.length - 1;
  const isLastQuestion = currentIndex === lastQuestionIndex;
  const showCard = selectedField && !loading && currentQuestion;

  const pickField = async (value) => {
    if (!value) return;
    setSelectedField(value);
    setLoading(true);
    setReviewMode(false);
    setCurrentIndex(0);
    setAnswerText("");
    setAudioUrl("");
    setMediaError("");
    await new Promise((resolve) => setTimeout(resolve, 1400));
    setLoading(false);
  };

  const nextQuestion = () => {
    if (isLastQuestion) return;
    setCurrentIndex((prev) => prev + 1);
    setAnswerText("");
    setAudioUrl("");
    setMediaError("");
  };

  const endInterview = () => {
    if (!currentQuestion) return;
    setReviewMode(true);
  };

  const moveReview = (direction) => {
    if (!reviewMode) return;
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex > lastQuestionIndex) return;
    setCurrentIndex(nextIndex);
    setAnswerText("");
    setAudioUrl("");
    setMediaError("");
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
    <div className="mock-page-root">
      <NavigationBar />
      <main className="mock-main">
        <section className="mock-inner">
          <h1 className="mockinterview-title">-----MOCK INTERVIEW-----</h1>
          <div className="mock-page-title-wrap"></div>
          <div className="mock-intro">
            <p className="mock-subtitle">Choose your position</p>
          </div>

          <div className="mock-field-select-wrap">
            <select
              className="mock-field-select"
              value={selectedField}
              onChange={(e) => pickField(e.target.value)}
            >
              <option value="" disabled>
                Select a position
              </option>
              {fields.map((field) => (
                <option className="mock-field-option" key={field} value={field}>
                  {field}
                </option>
              ))}
            </select>
          </div>

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

          {showCard && !reviewMode && (
            <>
              <div className="mock-gauge">
                {questions.map((_, index) => (
                  <div
                    key={index}
                    className={`mock-gauge-bar ${index <= currentIndex ? "active" : ""}`}
                  />
                ))}
              </div>
              <div className="mock-question-wrapper">
                <div
                  className="mock-carousel"
                  style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                >
                  {questions.map((question, index) => (
                    <div key={question.prompt} className="mock-question-card">
                      <div className="mock-card-header">
                        <p className="mock-card-title">
                          Mock Interview: {selectedField}
                        </p>
                      </div>
                      <h2 className="mock-question-title">{question.prompt}</h2>
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
                      <div className="mock-control-row">
                        <button
                          type="button"
                          className="mock-action-btn danger"
                          onClick={endInterview}
                        >
                          End Interview
                        </button>
                        <button
                          type="button"
                          className="mock-action-btn primary"
                          onClick={nextQuestion}
                          disabled={isLastQuestion}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {showCard && reviewMode && currentQuestion && (
            <div className="mock-review-card">
              <h2 className="review-title">MOCK INTERVIEW: {selectedField}</h2>
              <p className="review-question">
                <strong>Question {currentIndex + 1}:</strong>{" "}
                {currentQuestion.prompt}
              </p>
              <div className="review-answer-box">
                <p>
                  <strong>Your answer:</strong>
                </p>
                <p>{answerText || "No text answer provided."}</p>
                {audioUrl && (
                  <p className="audio-summary">
                    Voice answer recorded. Play it back below.
                  </p>
                )}
                {audioUrl && (
                  <audio
                    controls
                    src={audioUrl}
                    style={{ width: "100%", marginTop: "12px" }}
                  />
                )}
              </div>
              <div className="feedback-report">
                <span className="feedback-score">
                  FEEDBACK REPORT: {currentQuestion.feedback.score}/10
                </span>
                <div className="feedback-section">
                  <strong>Strengths:</strong>
                  <p className="feedback-text">
                    {currentQuestion.feedback.strengths}
                  </p>
                </div>
                <div className="feedback-section">
                  <strong>Improvements:</strong>
                  <p className="feedback-text">
                    {currentQuestion.feedback.improvements}
                  </p>
                </div>
              </div>
              <div className="review-actions">
                <button
                  type="button"
                  className="mock-action-btn secondary"
                  onClick={() => moveReview(-1)}
                  disabled={currentIndex === 0}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="mock-action-btn primary"
                  onClick={() => moveReview(1)}
                  disabled={currentIndex === lastQuestionIndex}
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
