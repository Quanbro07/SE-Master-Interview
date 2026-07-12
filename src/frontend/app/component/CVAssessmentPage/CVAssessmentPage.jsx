"use client";
import { useRef, useState, useEffect } from "react";
import NavigationBar from "../NavigationBar/NavigationBar";
import "./CVAssessmentPage.css";

// TODO: confirm this matches your actual backend origin / next.config rewrite setup.
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

// Friendly labels for the CVSection enum values from the backend.
const SECTION_LABELS = {
  EXPERIENCE: "Experience",
  SKILLS: "Skills",
  EDUCATION: "Education",
  PROJECT: "Project",
  SCORE: "Overall",
};

const CVAssessmentPage = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null); // raw CVAssessment JSON from backend
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  // TODO: positionId is required by CVAssessment (nullable = false) but this
  // page has no real position-selection UI/endpoint yet. Replace this with
  // a real dropdown once a Position list endpoint exists.
  const [positionId, setPositionId] = useState("");

  const onPick = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFile(f);
    setReport(null);
    setError(null);
  };

  const onClickUpload = () => {
    inputRef.current?.click();
  };

  const onSubmit = async () => {
    if (!file) return;
    if (!positionId) {
      setError("Please select a position before submitting your CV.");
      return;
    }

    setLoading(true);
    setReport(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("positionId", positionId);

      const res = await fetch(`${API_BASE}/api/cv-assessments`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Assessment request failed (${res.status})`);
      }

      const data = await res.json();
      setReport(data);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cv-page-root">
      <NavigationBar />
      <main className="cv-main">
        <section className="cv-inner">
          <h1 className="cvassessment-title">-----CV ASSESSMENT-----</h1>

          {/* TODO: placeholder position picker — replace value list with a
              real fetch against your Position endpoint once it exists. */}
          <div className="cv-position-picker">
            <select
              id="position-select"
              value={positionId}
              onChange={(e) => setPositionId(e.target.value)}
            >
              <option value="">Select a position…</option>
              <option value="1">Backend Developer</option>
              <option value="2">Frontend Developer</option>
              <option value="3">Data Engineer</option>
            </select>
          </div>

          <div className="cv-dropzone">
            <input
              ref={inputRef}
              type="file"
              className="hidden-file"
              onChange={onPick}
            />
            {!file && (
              <div className="cv-upload-empty" onClick={onClickUpload}>
                <div className="cv-plus">+</div>
                <div className="cv-hint">Please insert your files !</div>
              </div>
            )}

            {file && (
              <div className="cv-file-block">
                <div className="file-icon">PDF</div>
                <div className="file-name">{file.name}</div>
                <button
                  className="btn-assess"
                  onClick={onSubmit}
                  disabled={loading}
                >
                  Assess
                </button>
              </div>
            )}
          </div>

          {error && <p className="cv-error">{error}</p>}

          <div className="cv-loading-area">
            {loading && (
              <div className="cv-loader">
                <div className="orbit">
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                </div>
                <div className="loading-text">
                  Your CV is being judged, please wait !
                </div>
              </div>
            )}
          </div>

          <div className="cv-report-area">
            {report && (
              <div className="cv-report-card">
                <div className="score-circle">
                  {report.overallScore}
                  <span>/100</span>
                </div>
                <div className="report-content">
                  <div className="report-title">CV Assessment Report</div>
                  <ul className="report-list">
                    <li>
                      <strong>Match score:</strong> {report.matchScore}/100 —{" "}
                      {report.matchComment}
                    </li>
                    <li>
                      <strong>Layout:</strong> {report.layoutComment}
                    </li>
                    <li>
                      <strong>Suggestions:</strong>{" "}
                      {report.improvementSuggestion}
                    </li>
                  </ul>

                  {report.cvSectionFeedbackList &&
                    report.cvSectionFeedbackList.length > 0 && (
                      <ul className="report-list report-sections">
                        {report.cvSectionFeedbackList.map((section) => (
                          <li key={section.feedbackId}>
                            <strong>
                              {SECTION_LABELS[section.sectionName] ||
                                section.sectionName}{" "}
                              ({section.score}/100):
                            </strong>{" "}
                            {section.comment}
                          </li>
                        ))}
                      </ul>
                    )}

                  <div className="report-actions">
                    <button className="ghost">Self-practice</button>
                    <button className="primary">AI mock interview</button>
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

export default CVAssessmentPage;
