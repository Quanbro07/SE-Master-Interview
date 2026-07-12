"use client";

import React, { useState } from "react";
import "./LoginPanel.css";

// TODO: confirm this matches wherever your backend is actually reachable
// from the browser (same value used elsewhere for API_BASE).
const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const LoginPanel = () => {
  const [loading, setLoading] = useState(false);

  const handleProviderLogin = (provider) => {
    setLoading(true);
    // Spring Security's OAuth2 Login handles the rest: redirecting to the
    // provider, exchanging the code, calling CustomOidcUserService /
    // CustomOauth2UserService, then AuthenticationSuccessHandler redirects
    // the browser back with a JWT attached.
    // TODO: confirm "/oauth2/authorization/{provider}" matches SecurityConfig
    // — this is Spring Security's default authorizationEndpoint baseUri,
    // not yet verified against your actual config.
    window.location.href = `${BACKEND_BASE_URL}/oauth2/authorization/${provider}`;
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
              onClick={() => handleProviderLogin("google")}
              disabled={loading}
            >
              <img src="/google.png" alt="Google" className="button-icon" />
              <span className="button-text">
                {loading ? "SIGNING IN..." : "CONTINUE WITH GOOGLE"}
              </span>
            </button>

            <button
              className="auth-button"
              onClick={() => handleProviderLogin("github")}
              disabled={loading}
            >
              <img src="/github.png" alt="GitHub" className="button-icon" />
              <span className="button-text">
                {loading ? "SIGNING IN..." : "CONTINUE WITH GITHUB"}
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
