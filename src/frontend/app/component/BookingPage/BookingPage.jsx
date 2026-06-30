import NavigationBar from "../NavigationBar/NavigationBar";
import ChatPanel from "../ChatPanel/ChatPanel";
import "./BookingPage.css";

const BookingPage = () => {
  return (
    <div className="booking-page-body">
      <NavigationBar />
      <ChatPanel />
    </div>
  );
};

export default BookingPage;
