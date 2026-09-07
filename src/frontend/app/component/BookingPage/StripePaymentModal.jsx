"use client";
import React, { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import Toast from "../Toast/Toast";

const stripePublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  "pk_test_51U22Dq5vVlPlCYoNSnjHXsKpOa34pBmtoTjATptxfcbwFQV6e3fahRStILOao5UfpHb5AjZggQy9PvUinKmGsIAq00UDoVOCKB";
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

const PaymentForm = ({ bookingId, onPaid, onCancel, showToast }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setPayError(null);

    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (result.error) {
        const errorMsg =
          result.error.message || "Payment failed. Please check card details.";
        setPayError(errorMsg);
        showToast(errorMsg, "error");
        setProcessing(false);
        return;
      }

      const { paymentIntent } = result;

      if (paymentIntent) {
        if (
          paymentIntent.status === "succeeded" ||
          paymentIntent.status === "processing" ||
          paymentIntent.status === "requires_capture"
        ) {
          try {
            const getAccessToken = () => {
              if (typeof window === "undefined") return "";
              const keys = [
                "accessToken",
                "token",
                "jwt",
                "authToken",
                "access_token",
              ];
              let rawToken = "";
              for (const key of keys) {
                const val = localStorage.getItem(key);
                if (val && val !== "undefined" && val !== "null") {
                  rawToken = val;
                  break;
                }
              }
              if (!rawToken) return "";
              return rawToken
                .replace(/^"+|"+$/g, "")
                .replace(/^Bearer\s+/i, "")
                .trim();
            };

            const token = getAccessToken();
            const targetBookingId =
              bookingId || paymentIntent.metadata?.bookingId;

            if (targetBookingId) {
              await fetch(
                `http://localhost:8080/api/v1/stripe/${targetBookingId}/confirm-hold`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                  },
                },
              );
            }
          } catch (syncError) {
            console.error("Failed to sync status with DB:", syncError);
          }

          showToast("Payment confirmed successfully!", "success");
          setTimeout(() => {
            onPaid(paymentIntent);
          }, 1000);
        } else {
          const statusMsg = `Payment status: ${paymentIntent.status}. Please try again.`;
          setPayError(statusMsg);
          showToast(statusMsg, "error");
        }
      }
    } catch (err) {
      const exceptionMsg =
        err.message || "An unexpected error occurred during payment.";
      setPayError(exceptionMsg);
      showToast(exceptionMsg, "error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="stripe-payment-form">
      <PaymentElement />
      {payError && (
        <div
          className="booking-error"
          style={{
            color: "#EF4444",
            backgroundColor: "#FEF2F2",
            padding: "8px 12px",
            borderRadius: "6px",
            marginTop: "12px",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          {payError}
        </div>
      )}

      <div
        className="popup-actions payment-actions-inline"
        style={{ marginTop: "20px", display: "flex", gap: "10px" }}
      >
        <button
          type="submit"
          className="popup-btn btn-book"
          disabled={!stripe || processing}
          style={{
            flex: 1,
            padding: "10px",
            backgroundColor: "#4C1D95",
            color: "#FFF",
            borderRadius: "6px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          {processing ? "PROCESSING..." : "CONFIRM PAYMENT"}
        </button>
        <button
          type="button"
          className="popup-btn btn-cancel"
          onClick={onCancel}
          disabled={processing}
          style={{
            padding: "10px 20px",
            backgroundColor: "#374151",
            color: "#FFF",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          CANCEL
        </button>
      </div>
    </form>
  );
};

const StripePaymentModal = ({
  clientSecret,
  bookingId,
  mentor,
  onPaid,
  onCancel,
}) => {
  const [toast, setToast] = useState(null);

  if (!clientSecret) return null;

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const options = {
    clientSecret,
    appearance: { theme: "night" },
  };

  return (
    <div className="popup-overlay" onClick={onCancel}>
      <div
        className="popup-content payment-popup-box"
        style={{ padding: "24px", maxWidth: "500px", width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="popup-title">Stripe Payment</h3>
        <div className="booking-summary" style={{ marginBottom: "16px" }}>
          <div className="summary-row">
            <span className="summary-label">Interviewer: </span>
            <span className="summary-value">
              <strong>{mentor?.name || "N/A"}</strong>
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Total Amount: </span>
            <span className="summary-value">
              {mentor?.price || "$10 / session"}
            </span>
          </div>
        </div>

        {stripePromise ? (
          <Elements stripe={stripePromise} options={options}>
            <PaymentForm
              bookingId={bookingId}
              onPaid={onPaid}
              onCancel={onCancel}
              showToast={showToast}
            />
          </Elements>
        ) : (
          <p style={{ color: "red" }}>
            Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY configuration in .env
          </p>
        )}
      </div>

      <Toast toast={toast} />
    </div>
  );
};

export default StripePaymentModal;
