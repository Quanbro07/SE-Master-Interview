"use client";
import React, { useRef, useState, useEffect } from "react";
import "./BookingList.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const BookingSection = ({
  title,
  positionQuery,
  onViewProfile,
  searchKeyword,
}) => {
  const scrollRef = useRef(null);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInterviewers = async () => {
      setLoading(true);
      try {
        let rawToken =
          localStorage.getItem("accessToken") ||
          localStorage.getItem("token") ||
          localStorage.getItem("jwt") ||
          localStorage.getItem("auth_token");

        if (!rawToken) {
          try {
            const userObj = JSON.parse(localStorage.getItem("user") || "{}");
            rawToken = userObj.token || userObj.accessToken || userObj.jwt;
          } catch (err) {
            console.error(err);
          }
        }

        const cleanToken = rawToken
          ? rawToken.trim().replace(/^Bearer\s+/i, "")
          : "";
        const authHeader = cleanToken ? `Bearer ${cleanToken}` : "";

        const res = await fetch(
          `${API_BASE}/api/v1/booking/filter-interviewer?position=${encodeURIComponent(
            positionQuery,
          )}&page=0&size=10`,
          {
            method: "GET",
            headers: {
              ...(authHeader ? { Authorization: authHeader } : {}),
            },
          },
        );

        let listFromApi = [];
        if (res.ok) {
          const data = await res.json();
          const apiContent = data.content || [];
          listFromApi = apiContent.map((item) => ({
            id: item.interviewer_id || item.interviewerId || item.id,
            name: item.fullName || item.user_name || "Interviewer",
            email: item.email,
            role: `${title} ${
              item.experience_year ? `• ${item.experience_year} yrs exp` : ""
            }`,
            rate: item.overall_rating ? item.overall_rating.toFixed(1) : "5.0",
            reviews: item.total_review || 0,
            price: item.hourly_fee
              ? `$${item.hourly_fee}/ session`
              : "$10/ session",
            avatar: "/user.png",
          }));
        }

        let cachedUser = null;
        try {
          cachedUser = JSON.parse(localStorage.getItem("user") || "{}");
        } catch (e) {
          console.error("Lỗi đọc user từ localStorage", e);
        }

        if (cachedUser && (cachedUser.fullName || cachedUser.userName)) {
          const userExpertise = Array.isArray(cachedUser.expertise)
            ? cachedUser.expertise.map((e) =>
                e.toUpperCase().replace(/\s+/g, "_"),
              )
            : ["FRONT_END_DEVELOPER", "FRONT-END DEVELOPER"];

          const currentPosUpper = positionQuery
            .toUpperCase()
            .replace(/\s+/g, "_");

          const isMatched = userExpertise.some(
            (exp) =>
              (exp.includes("FRONT") && currentPosUpper.includes("FRONT")) ||
              (exp.includes("BACK") && currentPosUpper.includes("BACK")) ||
              (exp.includes("DATA") && currentPosUpper.includes("DATA")) ||
              exp === currentPosUpper,
          );

          if (isMatched) {
            const localInterviewer = {
              id: cachedUser.id || "local-interviewer-1",
              name: cachedUser.fullName || cachedUser.userName || "hihi",
              email: cachedUser.email || "interviewer@example.com",
              role: `${title} • ${cachedUser.yearsExperience || 3} yrs exp`,
              rate: "5.0",
              reviews: 12,
              price: "$10/ session",
              avatar: "/user.png",
            };

            const exists = listFromApi.some(
              (m) =>
                m.name.toLowerCase() === localInterviewer.name.toLowerCase(),
            );

            if (!exists) {
              listFromApi = [localInterviewer, ...listFromApi];
            }
          }
        }

        setMentors(listFromApi);
      } catch (err) {
        console.error(`Lỗi fetch interviewer cho ${positionQuery}:`, err);
        setMentors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInterviewers();
  }, [positionQuery, title]);

  const filteredMentors = mentors.filter((m) =>
    searchKeyword
      ? m.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        m.role.toLowerCase().includes(searchKeyword.toLowerCase())
      : true,
  );

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
      <h3 className="section-title">{title.toUpperCase()}</h3>
      <div className="section-slider-wrapper">
        <button
          className="slider-btn btn-left"
          onClick={() => handleScroll("left")}
        >
          ‹
        </button>
        <div className="cards-slider" ref={scrollRef}>
          {loading ? (
            <p style={{ color: "#aaa", padding: "15px" }}>
              Đang tải danh sách...
            </p>
          ) : filteredMentors.length === 0 ? (
            <p style={{ color: "#666", padding: "15px", fontStyle: "italic" }}>
              Chưa có Interviewer nào đăng ký vị trí này.
            </p>
          ) : (
            filteredMentors.map((mentor) => (
              <div key={mentor.id} className="mentor-card">
                <div className="card-avatar">
                  <img src={mentor.avatar} alt="Avatar" />
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
            ))
          )}
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
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    setActiveSearch(searchTerm);
  };

  const expandedBarsCount = (!navCollapsed ? 1 : 0) + (!chatCollapsed ? 1 : 0);
  let gridClass = "grid-cols-5";
  if (expandedBarsCount === 1) gridClass = "grid-cols-4";
  if (expandedBarsCount === 2) gridClass = "grid-cols-3";

  return (
    <div className={`booking-list-container ${gridClass}`}>
      <h2 className="main-heading">-----INTERVIEW BOOKING-----</h2>

      <form className="search-bar-container" onSubmit={handleSearch}>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search positions, mentors,..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" className="search-btn">
            Search
          </button>
        </div>
      </form>

      <BookingSection
        title="BACKEND DEVELOPER"
        positionQuery="BACKEND_DEVELOPER"
        onViewProfile={onViewProfile}
        searchKeyword={activeSearch}
      />
      <BookingSection
        title="FRONTEND DEVELOPER"
        positionQuery="FRONTEND_DEVELOPER"
        onViewProfile={onViewProfile}
        searchKeyword={activeSearch}
      />
      <BookingSection
        title="DATA ENGINEER"
        positionQuery="DATA_ENGINEER"
        onViewProfile={onViewProfile}
        searchKeyword={activeSearch}
      />
    </div>
  );
};

export default BookingList;
