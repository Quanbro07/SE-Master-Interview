"use client";
import React, { useRef } from "react";
import "./BookingList.css";

// Giữ nguyên mảng mockMentors của bạn...
const mockMentors = [
  {
    id: 1,
    name: "Alex Nguyễn",
    role: "Tech lead @Google",
    rate: "4.9",
    reviews: 54,
    price: "$10/ session",
  },
  {
    id: 2,
    name: "Alex Nguyễn",
    role: "Tech lead @Google",
    rate: "4.9",
    reviews: 54,
    price: "$10/ session",
  },
  {
    id: 3,
    name: "Khoa Phạm",
    role: "BE Dev @VPBank",
    rate: "4.6",
    reviews: 129,
    price: "$15/ session",
  },
  {
    id: 4,
    name: "Alesis Johan",
    role: "Java Dev @Bosch",
    rate: "4.8",
    reviews: 36,
    price: "$15.5/ session",
  },
  {
    id: 5,
    name: "Alesis Johan",
    role: "Java Dev @Bosch",
    rate: "4.8",
    reviews: 36,
    price: "$15.5/ session",
  },
  {
    id: 6,
    name: "Mentor Extra",
    role: "Senior Dev",
    rate: "5.0",
    reviews: 20,
    price: "$20/ session",
  },
];

const BookingSection = ({ title, list, onViewProfile }) => {
  const scrollRef = useRef(null);

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="booking-section">
      <h3 className="section-title">{title}</h3>
      <div className="section-slider-wrapper">
        <button
          className="slider-btn btn-left"
          onClick={() => handleScroll("left")}
        >
          ‹
        </button>
        <div className="cards-slider" ref={scrollRef}>
          {list.map((mentor) => (
            <div key={mentor.id} className="mentor-card">
              <div className="card-avatar">
                <img src="/user.png" alt="Avatar" />
              </div>
              <h4 className="card-name">{mentor.name}</h4>
              <p className="card-role">{mentor.role}</p>
              <div className="card-info">
                <span className="info-star">
                  ⭐ {mentor.rate} ({mentor.reviews} reviews)
                </span>
                {mentor.price && (
                  <span className="info-price">💸 {mentor.price}</span>
                )}
              </div>
              <button
                className="view-profile-btn"
                onClick={() => onViewProfile(mentor)}
              >
                View profile
              </button>
            </div>
          ))}
        </div>
        <button
          className="slider-btn btn-right"
          onClick={() => handleScroll("right")}
        >
          ›
        </button>
      </div>
    </div>
  );
};

const BookingList = ({ navCollapsed, chatCollapsed, onViewProfile }) => {
  const expandedBarsCount = (!navCollapsed ? 1 : 0) + (!chatCollapsed ? 1 : 0);

  let gridClass = "grid-cols-5";
  if (expandedBarsCount === 1) gridClass = "grid-cols-4";
  if (expandedBarsCount === 2) gridClass = "grid-cols-3";

  return (
    <div className={`booking-list-container ${gridClass}`}>
      {/* KHUNG SEARCH ĐƯỢC ĐƯA RA ĐÂY ĐỂ ĐỨNG CHÍNH GIỮA TOÀN TRANG */}

      <h2 className="main-heading">-----INTERVIEW BOOKING-----</h2>
      <div className="search-bar-container">
        <div className="search-bar">
          <input type="text" placeholder="Search positions, mentors,..." />
          <button className="search-btn">Search</button>
        </div>
      </div>
      <BookingSection
        title="BACK-END DEVELOPER"
        list={mockMentors}
        onViewProfile={onViewProfile}
      />
      <BookingSection
        title="FRONT-END DEVELOPER"
        list={mockMentors}
        onViewProfile={onViewProfile}
      />
      <BookingSection
        title="DATA ENGINEER"
        list={mockMentors}
        onViewProfile={onViewProfile}
      />
    </div>
  );
};

export default BookingList;
