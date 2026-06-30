"use client";

import React, { useState } from "react";
import "./LoginPanel.css";

const LoginPanel = () => {
  const [loading, setLoading] = useState(false);

  // Google OAuth Configuration
  const GOOGLE_CLIENT_ID =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";
  const GOOGLE_REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/google/callback`;

  // Facebook OAuth Configuration
  const FACEBOOK_APP_ID =
    process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "YOUR_FACEBOOK_APP_ID";
  const FACEBOOK_REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/facebook/callback`;

  // Handle Google Login
  const handleGoogleClick = () => {
    try {
      setLoading(true);
      const googleAuthUrl = new URL(
        "https://accounts.google.com/o/oauth2/v2/auth",
      );
      googleAuthUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
      googleAuthUrl.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI);
      googleAuthUrl.searchParams.set("response_type", "code");
      googleAuthUrl.searchParams.set("scope", "openid email profile");
      googleAuthUrl.searchParams.set("access_type", "offline");

      window.location.href = googleAuthUrl.toString();
    } catch (error) {
      console.error("Google login error:", error);
      alert("Failed to initiate Google login");
      setLoading(false);
    }
  };

  // Handle Facebook Login
  const handleFacebookClick = () => {
    try {
      setLoading(true);
      const facebookAuthUrl = new URL(
        "https://www.facebook.com/v18.0/dialog/oauth",
      );
      facebookAuthUrl.searchParams.set("client_id", FACEBOOK_APP_ID);
      facebookAuthUrl.searchParams.set("redirect_uri", FACEBOOK_REDIRECT_URI);
      facebookAuthUrl.searchParams.set("scope", "public_profile,email");
      facebookAuthUrl.searchParams.set("response_type", "code");

      window.location.href = facebookAuthUrl.toString();
    } catch (error) {
      console.error("Facebook login error:", error);
      alert("Failed to initiate Facebook login");
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-panel">
        <div className="login-left">
          <div className="logo-header">
            <img src="/logo.png" alt="Logo" className="logo-image" />
            <span className="logo-text">MASTER INTERVIEW</span>
          </div>

          <div className="sponsored-section">
            <p className="section-title">Sponsored By</p>
            <div className="sponsor-logos">
              <img
                src="/hcmus.png"
                alt="HCMUS Logo"
                className="sponsor-logo hcmus-logo"
              />
              <img
                src="/fit.png"
                alt="FIT HCMUS Logo"
                className="sponsor-logo fit-logo"
              />
            </div>
          </div>

          <div className="available-section">
            <p className="section-title">Available On</p>
            <div className="browser-icons">
              <div className="icon-box">
                <div className="icon-background"></div>
                <img src="/chrome.png" alt="Chrome" className="browser-icon" />
              </div>
              <div className="icon-box">
                <div className="icon-background"></div>
                <img
                  src="/firefox.png"
                  alt="Firefox"
                  className="browser-icon"
                />
              </div>
              <div className="icon-box">
                <div className="icon-background"></div>
                <img src="/edge.png" alt="Edge" className="browser-icon" />
              </div>
              <div className="icon-box">
                <div className="icon-background"></div>
                <img src="/opera.png" alt="Opera" className="browser-icon" />
              </div>
              <div className="icon-box">
                <div className="icon-background"></div>
                <img src="/safari.png" alt="Safari" className="browser-icon" />
              </div>
            </div>
          </div>
        </div>

        <div className="login-right">
          <div className="login-header">
            <h2 className="login-title">Sign up or Log in</h2>
            <p className="login-subtitle">
              Ask, upload files, interview, and more.
            </p>
          </div>

          <div className="login-buttons">
            <button
              className="auth-button"
              onClick={handleGoogleClick}
              disabled={loading}
            >
              <img src="/google.png" alt="Google" className="button-icon" />
              <span className="button-text">
                {loading ? "SIGNING IN..." : "CONTINUE WITH GOOGLE"}
              </span>
            </button>

            <button
              className="auth-button"
              onClick={handleFacebookClick}
              disabled={loading}
            >
              <img src="/facebook.png" alt="Facebook" className="button-icon" />
              <span className="button-text">
                {loading ? "SIGNING IN..." : "CONTINUE WITH FACEBOOK"}
              </span>
            </button>
          </div>

          <div className="terms-section">
            By continuing, you agree to our{" "}
            <a href="#" className="terms-link">
              Terms of Service
            </a>{" "}
            and read our{" "}
            <a href="#" className="terms-link">
              Privacy Policy
            </a>
            .
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPanel;
