"use client";
import React, { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// Khởi tạo Stripe Client
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISH_KEY;
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

// Form xử lý Submit thanh toán Stripe
const PaymentForm = ({ onPaid, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setPayError(null);

    // Thực hiện xác nhận thanh toán qua Stripe Elements
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required", // Không tự động chuyển trang nếu thanh toán thành công ngay
    });

    if (error) {
      setPayError(error.message || "Thanh toán thất bại. Vui lòng thử lại.");
      setProcessing(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === "succeeded") {
      onPaid(paymentIntent);
    } else {
      setPayError("Thanh toán chưa hoàn tất. Vui lòng kiểm tra lại.");
    }
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="stripe-payment-form">
      <PaymentElement />
      {payError && (
        <div
          className="booking-error"
          style={{ color: "red", marginTop: "10px" }}
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
        >
          {processing ? "ĐANG XỬ LÝ..." : "XÁC NHẬN THANH TOÁN"}
        </button>
        <button
          type="button"
          className="popup-btn btn-cancel"
          onClick={onCancel}
          disabled={processing}
        >
          HỦY BỎ
        </button>
      </div>
    </form>
  );
};

// Popup chính bọc Elements provider từ Stripe
const StripePaymentModal = ({ clientSecret, mentor, onPaid, onCancel }) => {
  if (!clientSecret) return null;

  const options = {
    clientSecret,
    appearance: {
      theme: "night", // Tùy chỉnh theme giao diện Stripe
    },
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
            <PaymentForm onPaid={onPaid} onCancel={onCancel} />
          </Elements>
        ) : (
          <p style={{ color: "red" }}>
            Thiếu cấu hình NEXT_PUBLISHES_STRIPE_PUBLISHABLE_KEY trong .env
          </p>
        )}
      </div>
    </div>
  );
};

export default StripePaymentModal;
