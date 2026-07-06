"use client";
import { useRef, useState } from "react";
import NavigationBar from "../NavigationBar/NavigationBar";
import PageTitle from "../PageTitle/PageTitle";
import "./CVAssessmentPage.css";

const fakeReportForFile = (file) => {
  return {
    score: 80,
    strengths: [
      "Strong core Java knowledge",
      "Clear project structure using Spring Boot",
    ],
    missing: [
      "Lack of Docker/Kubernetes containerization experience",
      "CI/CD knowledge is weak",
    ],
    suggestions: [
      "Add GitHub links for algorithms projects",
      "Include a short summary at top",
    ],
  };
};

const CVAssessmentPage = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const inputRef = useRef(null);

  const onPick = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFile(f);
    setReport(null);
  };

  const onClickUpload = () => {
    inputRef.current?.click();
  };

  const onSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setReport(null);
    // simulate processing 2s
    await new Promise((r) => setTimeout(r, 2000));
    const r = fakeReportForFile(file);
    setReport(r);
    setLoading(false);
  };

  return (
    <div className="cv-page-root">
      <NavigationBar />
      <main className="cv-main">
        <section className="cv-inner">
          <PageTitle />
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
                  {report.score}
                  <span>/100</span>
                </div>
                <div className="report-content">
                  <div className="report-title">CV Assessment Report</div>
                  <ul className="report-list">
                    <li>
                      <strong>Strengths:</strong> {report.strengths.join("; ")}
                    </li>
                    <li>
                      <strong>Missing skills:</strong>{" "}
                      {report.missing.join("; ")}
                    </li>
                    <li>
                      <strong>Suggestions:</strong>{" "}
                      {report.suggestions.join("; ")}
                    </li>
                  </ul>
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
