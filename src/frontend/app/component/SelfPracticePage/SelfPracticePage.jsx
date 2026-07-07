"use client";
import { useMemo, useState } from "react";
import NavigationBar from "../NavigationBar/NavigationBar";
import "./SelfPracticePage.css";

const fields = [
  "Back-end Developer",
  "Front-end Developer",
  "Prompt Engineer",
  "Data Engineer",
];

const questionsByField = {
  "Back-end Developer": [
    {
      prompt: "Describe an API versioning strategy for a public REST service.",
      answer:
        "Use URI versioning or request header versioning, keep backward compatibility, deprecate old versions slowly, and document changes clearly.",
    },
    {
      prompt: "How do you handle database schema migrations in production?",
      answer:
        "Apply an immutable migration plan, use transactional migration tools, test with staging datasets, and roll out in small increments.",
    },
  ],
  "Front-end Developer": [
    {
      prompt: "How would you optimize a React app's initial render speed?",
      answer:
        "Use code splitting, lazy load heavy bundles, memoize expensive components, and defer non-critical CSS to reduce time to interactive.",
    },
    {
      prompt: "Explain the difference between CSS Grid and Flexbox.",
      answer:
        "Grid is optimized for two-dimensional layouts, while Flexbox is best for one-dimensional row or column alignment and distribution.",
    },
  ],
  "Prompt Engineer": [
    {
      prompt: "What makes a prompt effective for a language model?",
      answer:
        "Be explicit, provide context, define the format, and show examples so the model can infer the task reliably.",
    },
    {
      prompt: "How do you avoid hallucinations in generated output?",
      answer:
        "Use grounding data, ask for concise answers, validate against known facts, and constrain the response format.",
    },
  ],
  "Data Engineer": [
    {
      prompt: "What is a good approach to ingesting large streaming data?",
      answer:
        "Use a distributed log system, batch small writes, autoscale consumers, and maintain exactly-once delivery when possible.",
    },
    {
      prompt: "How do you design a data warehouse schema for analytics?",
      answer:
        "Choose a dimensional model with facts and dimensions, keep grain consistent, and denormalize for fast reporting.",
    },
  ],
};

const SelfPracticePage = () => {
  const [selectedField, setSelectedField] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const questions = useMemo(() => {
    return selectedField ? questionsByField[selectedField] || [] : [];
  }, [selectedField]);

  const selectedQuestion = questions[currentIndex];
  const showCard = selectedField && !loading && selectedQuestion;

  const pickField = async (field) => {
    setSelectedField(field);
    setLoading(true);
    setFlipped(false);
    setCurrentIndex(0);
    await new Promise((resolve) => setTimeout(resolve, 1400));
    setLoading(false);
  };

  const toggleFlip = () => {
    if (!showCard) return;
    setFlipped((prev) => !prev);
  };

  const nextQuestion = () => {
    if (currentIndex + 1 >= questions.length) return;
    setCurrentIndex((prev) => prev + 1);
    setFlipped(false);
  };

  const prevQuestion = () => {
    if (currentIndex === 0) return;
    setCurrentIndex((prev) => prev - 1);
    setFlipped(false);
  };

  return (
    <div className="self-page-root">
      <NavigationBar />
      <main className="self-main">
        <section className="self-inner">
          <h1 className="selfpractice-title">-----SELF PRACTICE-----</h1>

          <div className="self-intro">
            <p className="self-subtitle">Choose your position</p>
          </div>
          <div className="self-field-select-wrap">
            <select
              className="self-field-select"
              value={selectedField || ""}
              onChange={(e) => pickField(e.target.value)}
            >
              <option value="" disabled>
                Select a field
              </option>
              {fields.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </select>
          </div>

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

          <div className="self-card-area">
            {showCard && (
              <div
                className={`self-card ${flipped ? "flipped" : ""}`}
                onClick={toggleFlip}
              >
                <div className="self-card-face self-card-front">
                  <div className="self-card-content">
                    <p className="self-card-title">{selectedField}</p>
                    <h2 className="self-question">{selectedQuestion.prompt}</h2>
                  </div>
                  <div className="self-card-footer">
                    <button
                      className="self-card-btn"
                      disabled={currentIndex === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        prevQuestion();
                      }}
                    >
                      Prev
                    </button>
                    <span className="self-card-step">
                      {currentIndex + 1}/{questions.length}
                    </span>
                    <button
                      className="self-card-btn"
                      disabled={currentIndex + 1 >= questions.length}
                      onClick={(e) => {
                        e.stopPropagation();
                        nextQuestion();
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
                <div className="self-card-face self-card-back">
                  <div className="self-card-content">
                    <p className="self-card-title">Answer</p>
                    <p className="self-answer">{selectedQuestion.answer}</p>
                  </div>
                  <div className="self-card-footer">
                    <button
                      className="self-card-btn"
                      disabled={currentIndex === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        prevQuestion();
                      }}
                    >
                      Prev
                    </button>
                    <span className="self-card-step">
                      {currentIndex + 1}/{questions.length}
                    </span>
                    <button
                      className="self-card-btn"
                      disabled={currentIndex + 1 >= questions.length}
                      onClick={(e) => {
                        e.stopPropagation();
                        nextQuestion();
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default SelfPracticePage;
