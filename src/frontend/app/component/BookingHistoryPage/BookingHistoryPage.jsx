import NavigationBar from "../NavigationBar/NavigationBar";

const BookingHistoryPage = () => {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#0f0f13",
        color: "#f4f4f5",
      }}
    >
      <NavigationBar />
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px",
        }}
      >
        <section
          style={{
            width: "100%",
            maxWidth: "760px",
            padding: "40px 48px",
            borderRadius: "20px",
            background: "#18181c",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
          }}
        >
          <h1
            style={{ margin: "0 0 12px", fontSize: "32px", color: "#f5f5ff" }}
          >
            Booking History
          </h1>
          <p style={{ margin: 0, lineHeight: 1.7, color: "#bdbdc8" }}>
            Review your past bookings and follow up on scheduled interviews.
          </p>
        </section>
      </main>
    </div>
  );
};

export default BookingHistoryPage;
