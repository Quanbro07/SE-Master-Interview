"use client";
import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import "../../globals.css";

const PageTransition = ({ delay = 1000 }) => {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const initial = useRef(true);
  const [active, setActive] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // skip on first mount
    if (initial.current) {
      initial.current = false;
      prevPath.current = pathname;
      return;
    }

    if (pathname !== prevPath.current) {
      // show overlay
      setActive(true);
      // ensure at least `delay` ms visible
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setActive(false);
      }, delay);
      prevPath.current = pathname;
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [pathname, delay]);

  return (
    <div className={`page-transition-overlay ${active ? "active" : ""}`}>
      <div className="page-transition-card" role="status" aria-hidden={!active}>
        <div className="spinner" aria-hidden />
        <div className="spinner-dots" aria-hidden>
          <div className="dot" />
          <div className="dot" />
          <div className="dot" />
        </div>
        <div className="page-transition-text">Loading…</div>
      </div>
    </div>
  );
};

export default PageTransition;
