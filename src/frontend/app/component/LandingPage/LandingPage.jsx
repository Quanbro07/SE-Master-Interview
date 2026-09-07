"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import LoginPanel from "../LoginPanel/LoginPanel";
import "./LandingPage.css";

const LandingPage = () => {
  const router = useRouter();
  const [showLoginPanel, setShowLoginPanel] = useState(false);
  const [isClosingLogin, setIsClosingLogin] = useState(false);

  const handleGetStarted = () => {
    router.push("/login");
  };

  const handleSignIn = () => {
    setShowLoginPanel(true);
    setIsClosingLogin(false);
  };

  const handleCloseLogin = () => {
    setIsClosingLogin(true);
    window.setTimeout(() => {
      setShowLoginPanel(false);
      setIsClosingLogin(false);
    }, 350);
  };

  return (
    <div className="landing-container">
      <div
        className={`landing-content${showLoginPanel ? " landing-content--blurred" : ""}`}
      >
        <header className="landing-header">
          <div className="header-logo">
            <img src="/logo.png" alt="Master Interview" className="logo" />
            <span className="logo-text">MASTER INTERVIEW</span>
          </div>
          <button className="sign-in-btn" onClick={handleSignIn}>
            SIGN IN
          </button>
        </header>

        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">
              Practice Interviews Like Never Before
            </h1>
            <p className="hero-subtitle">
              Get real-time feedback and master your interview skills with
              AI-powered practice sessions.
            </p>

            <div className="features-grid">
              <div className="feature-card" onClick={handleSignIn}>
                <h3 className="feature-title">AI-Powered Feedback</h3>
                <p className="feature-desc">
                  Real-time analysis and personalized suggestions for
                  improvement
                </p>
              </div>

              <div className="feature-card" onClick={handleSignIn}>
                <h3 className="feature-title">Self practice</h3>
                <p className="feature-desc">
                  Practice at your own pace with list of questions and answers
                </p>
              </div>

              <div className="feature-card" onClick={handleSignIn}>
                <h3 className="feature-title">Mock Interview</h3>
                <p className="feature-desc">
                  Simulate real interview scenarios with AI-generated questions
                </p>
              </div>

              <div className="feature-card" onClick={handleSignIn}>
                <h3 className="feature-title">Real-time Interview</h3>
                <p className="feature-desc">
                  Interview with experts and receive instant feedback on your
                  performance
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="sponsors-section">
          <p className="sponsors-title">Sponsored by</p>
          <div className="sponsors-logos">
            <img src="/hcmus.png" alt="HCMUS" className="sponsor-logo" />
            <img src="/fit.png" alt="FIT HCMUS" className="sponsor-logo" />
          </div>
        </section>

        <footer className="landing-footer">
          <div className="footer-links">
            <a href="#" className="footer-link">
              Terms of Service
            </a>
            <a href="#" className="footer-link">
              Privacy Policy
            </a>
            <a href="#" className="footer-link">
              Contact Us
            </a>
          </div>
          <p className="footer-text">
            © 2024 Master Interview. All rights reserved.
          </p>
        </footer>
      </div>

      {showLoginPanel && (
        <div className="landing-overlay" onClick={handleCloseLogin}>
          <div
            className={`login-panel-wrapper${isClosingLogin ? " login-panel-wrapper--closing" : ""}`}
            onClick={(event) => event.stopPropagation()}
          >
            <LoginPanel />
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
