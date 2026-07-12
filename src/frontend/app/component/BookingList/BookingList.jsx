"use client";
import React, { useRef, useState, useMemo, useEffect } from "react";
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

const MAX_SUGGESTIONS = 5;

// Splits "Tech lead @Google" into { position: "Tech lead", company: "Google" }
// so name/position/company can each be matched and displayed independently.
const splitRole = (role = "") => {
  const atIndex = role.indexOf("@");
  if (atIndex === -1) {
    return { position: role.trim(), company: "" };
  }
  return {
    position: role.slice(0, atIndex).trim(),
    company: role.slice(atIndex + 1).trim(),
  };
};

const matchesQuery = (mentor, query) => {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const { position, company } = splitRole(mentor.role);
  return (
    mentor.name.toLowerCase().includes(q) ||
    position.toLowerCase().includes(q) ||
    company.toLowerCase().includes(q) ||
    (mentor.role || "").toLowerCase().includes(q)
  );
};

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

const SearchBar = ({ onSelectMentor }) => {
  const [query, setQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchWrapperRef = useRef(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return mockMentors
      .filter((mentor) => matchesQuery(mentor, query))
      .slice(0, MAX_SUGGESTIONS);
  }, [query]);

  // close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(e.target)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setDropdownOpen(true);
  };

  const handleSearchClick = () => {
    setDropdownOpen(true);
  };

  const handleSelect = (mentor) => {
    setDropdownOpen(false);
    setQuery(mentor.name);
    if (onSelectMentor) onSelectMentor(mentor);
  };

  return (
    <div className="search-bar-container" ref={searchWrapperRef}>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search positions, mentors,..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.trim() && setDropdownOpen(true)}
        />
        <button className="search-btn" onClick={handleSearchClick}>
          Search
        </button>
      </div>

      {dropdownOpen && query.trim() && (
        <div className="search-dropdown">
          {results.length > 0 ? (
            results.map((mentor) => {
              const { position, company } = splitRole(mentor.role);
              return (
                <button
                  type="button"
                  key={mentor.id}
                  className="search-dropdown-item"
                  onClick={() => handleSelect(mentor)}
                >
                  <span className="dropdown-item-name">{mentor.name}</span>
                  <span className="dropdown-item-role">
                    {position}
                    {company ? ` @ ${company}` : ""}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="search-dropdown-empty">
              No mentors match &quot;{query}&quot;.
            </div>
          )}
        </div>
      )}
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
      <SearchBar onSelectMentor={onViewProfile} />
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
