"use client";
import Link from "next/link";

const StripeRefreshPage = () => (
  <div
    style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0f0f13",
      color: "#f4f4f5",
      flexDirection: "column",
      gap: 16,
    }}
  >
    <h1>Stripe setup incomplete</h1>
    <p style={{ color: "#a1a1aa" }}>
      Your Stripe onboarding link expired or was interrupted. Please try
      connecting again from your profile.
    </p>
    {/* TODO: confirm the real interviewer profile route */}
    <Link href="/interviewer/profile" style={{ color: "#a78bfa" }}>
      Back to profile
    </Link>
  </div>
);

export default StripeRefreshPage;
