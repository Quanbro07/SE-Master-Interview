"use client";

import React from "react";
import { useRouter } from "next/navigation";
import "./LandingPage.css";

const LandingPage = () => {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push("/login");
  };

  const handleSignIn = () => {
    router.push("/login");
  };

  return (
    <div className="landing-container">
      <div className="landing-content">
        {/* Header */}
        <header className="landing-header">
          <div className="header-logo">
            <img src="/logo.png" alt="Master Interview" className="logo" />
            <span className="logo-text">MASTER INTERVIEW</span>
          </div>
          <button className="sign-in-btn" onClick={handleSignIn}>
            SIGN IN
          </button>
        </header>

        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">
              Practice Interviews Like Never Before
            </h1>
            <p className="hero-subtitle">
              Get real-time feedback, track your progress, and master your
              interview skills with AI-powered practice sessions.
            </p>

            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">✓</div>
                <h3 className="feature-title">AI-Powered Feedback</h3>
                <p className="feature-desc">
                  Real-time analysis and personalized suggestions for
                  improvement
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">✓</div>
                <h3 className="feature-title">Progress Tracking</h3>
                <p className="feature-desc">
                  Monitor your improvement over time with detailed analytics
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">✓</div>
                <h3 className="feature-title">Expert Resources</h3>
                <p className="feature-desc">
                  Access curated interview questions and best practices
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">✓</div>
                <h3 className="feature-title">Multiple Formats</h3>
                <p className="feature-desc">
                  Practice technical, behavioral, and situational interviews
                </p>
              </div>
            </div>

            <button className="cta-button" onClick={handleGetStarted}>
              Get Started Free
            </button>

            <p className="cta-subtext">
              No credit card required • Start practicing now
            </p>
          </div>
        </section>

        {/* Sponsors Section */}
        <section className="sponsors-section">
          <p className="sponsors-title">Trusted by</p>
          <div className="sponsors-logos">
            <img src="/hcmus.png" alt="HCMUS" className="sponsor-logo" />
            <img src="/fit.png" alt="FIT HCMUS" className="sponsor-logo" />
          </div>
        </section>

        {/* Footer */}
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
    </div>
  );
};

export default LandingPage;
