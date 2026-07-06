"use client";
import { usePathname } from "next/navigation";
import React from "react";

function toTitle(text) {
  if (!text) return "";
  return text
    .replace(/[-_]+/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const PageTitle = ({ as = "h1", children }) => {
  const pathname = usePathname() || "/";
  let title = "";

  // If children provided explicitly, use it
  if (children) title = typeof children === "string" ? children : "";

  if (!title) {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) {
      title = "Home";
    } else {
      const last = parts[parts.length - 1];
      title = toTitle(last);
    }
  }

  return React.createElement(as, { className: "page-title" }, title);
};

export default PageTitle;
