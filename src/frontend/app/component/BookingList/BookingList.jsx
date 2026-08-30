"use client";
import React, { useRef, useState, useEffect } from "react";
import "./BookingList.css";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

// Hàm lấy token đã được chuẩn hoá
const getAccessToken = () => {
  if (typeof window === "undefined") return "";
  const keys = ["accessToken", "token", "jwt", "authToken", "access_token"];
  let token = "";
  for (const key of keys) {
    const val = localStorage.getItem(key);
    if (val) {
      token = val;
      break;
    }
  }
  if (!token) return "";

  let cleanToken = token.trim();
  if (cleanToken.startsWith('"') && cleanToken.endsWith('"')) {
    cleanToken = cleanToken.slice(1, -1);
  }
  if (cleanToken.toLowerCase().startsWith("bearer ")) {
    cleanToken = cleanToken.substring(7).trim();
  }
  return cleanToken;
};

// Component hiển thị danh sách Interviewer cho từng Position
const BookingSection = ({
  positionName, // Nhận nguyên bản chuỗi tên vị trí từ DB (VD: "software engineer")
  onViewProfile,
  onDataLoaded,
}) => {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const fetchInterviewers = async () => {
      setLoading(true);
      try {
        const token = getAccessToken();
        const headers = {
          "Content-Type": "application/json",
        };

        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        if (!positionName) return;

        // BẮT ĐẦU TRUYỀN NGUYÊN BẢN CHUỖI KHÔNG BIẾN ĐỔI KÝ TỰ
        const today = new Date();
        const dateString = today.toISOString().split('T')[0]; 

        // 2. Ghép thêm biến date vào URL
        const res = await fetch(
          `${API_BASE}/api/v1/booking/filter-interviewer?position=${encodeURIComponent(positionName)}&date=${dateString}&page=0&size=20`,
          {
            method: "GET",
            headers,
          },
        );

        if (res.status === 401) {
          throw new Error("401 Unauthorized");
        }

        if (!res.ok) {
          throw new Error(`Error: ${res.status}`);
        }

        const data = await res.json();
        const apiContent = data?.content || (Array.isArray(data) ? data : []);

        const listFromApi = apiContent.map((item) => {
          const name =
            item.fullName ||
            item.full_name ||
            item.userName ||
            item.user_name ||
            item.name ||
            "N/A";
          const email = item.email || "N/A";
          const rawPos = item.position || positionName;

          const expYears =
            item.experience_year ??
            item.yearsExperience ??
            item.experienceYears ??
            item.experience ??
            0;

          const fee = item.hourly_fee ?? item.hourlyFee;
          const priceDisplay = fee ? `$${fee}/ session` : "";
          const rating =
            item.overall_rating ?? item.overallRating ?? item.rating ?? 5.0;
          const reviewCount =
            item.total_review ?? item.totalReview ?? item.reviews ?? 0;

          return {
            id:
              item.interviewer_id ||
              item.interviewerId ||
              item.id ||
              Math.random().toString(),
            name: name,
            email: email,
            displayPosition: rawPos,
            expYears: expYears,
            expText: `${expYears} YRS EXP`,
            role: `${rawPos} • ${expYears} YRS EXP`,
            rate: Number(rating).toFixed(1),
            reviews: reviewCount,
            price: priceDisplay,
            avatar: item.avatar || "/user.png",
          };
        });

        if (isMounted) {
          setMentors(listFromApi);
          if (onDataLoaded) onDataLoaded(listFromApi);
        }
      } catch (err) {
        console.error(`Lỗi fetch interviewer cho ${positionName}:`, err);
        if (isMounted) setMentors([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInterviewers();

    return () => {
      isMounted = false;
    };
  }, [positionName]);

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
      {/* Hiển thị tiêu đề nguyên bản hoặc hiển thị theo thiết kế CSS font-transform */}
      <h3 className="section-title" style={{ textTransform: "uppercase" }}>
        {positionName}
      </h3>
      <div className="section-slider-wrapper">
        <button
          className="slider-btn btn-left"
          onClick={() => handleScroll("left")}
        >
          ‹
        </button>
        <div className="cards-slider" ref={scrollRef}>
          {loading ? (
            <p className="status-message">Đang tải danh sách...</p>
          ) : mentors.length === 0 ? (
            <p className="status-message empty">
              Chưa có Interviewer nào phù hợp.
            </p>
          ) : (
            mentors.map((mentor) => (
              <div key={mentor.id} className="mentor-card">
                <div className="card-avatar">
                  <img src={mentor.avatar} alt="Avatar" />
                </div>
                <h4 className="card-name">{mentor.name}</h4>
                <p className="card-role" style={{ textTransform: "uppercase" }}>
                  {mentor.role}
                </p>
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
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [allInterviewersMap, setAllInterviewersMap] = useState({});
  const [positions, setPositions] = useState([]);
  const dropdownRef = useRef(null);

  // Lấy TOÀN BỘ vị trí chuyên môn từ endpoint /api/v1/position/get-all
  useEffect(() => {
    const fetchAllPositions = async () => {
      try {
        const token = getAccessToken();
        const headers = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_BASE}/api/v1/position/get-all`, {
          method: "GET",
          headers,
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // Giữ NGUYÊN BẢN chuỗi từ DB trả về, chỉ lọc loại bỏ giá trị rỗng/null
            const cleanList = data
              .map((p) =>
                typeof p === "string" ? p : p.positionName || p.name || "",
              )
              .filter(Boolean);
            setPositions(cleanList);
          }
        }
      } catch (err) {
        console.error("Lỗi lấy danh sách position:", err);
      }
    };

    fetchAllPositions();
  }, []);

  const handleSectionDataLoaded = (pos, list) => {
    setAllInterviewersMap((prev) => ({
      ...prev,
      [pos]: list,
    }));
  };

  // Xử lý gõ ô tìm kiếm
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (value.trim().length > 0) {
      const query = value.toLowerCase().trim();
      const combined = Object.values(allInterviewersMap).flat();

      const uniqueList = combined.filter(
        (item, index, self) =>
          index === self.findIndex((t) => t.id === item.id),
      );

      const filtered = uniqueList.filter((item) => {
        const nameMatch = item.name.toLowerCase().includes(query);
        const posMatch = item.displayPosition.toLowerCase().includes(query);
        const roleMatch = item.role.toLowerCase().includes(query);
        return nameMatch || posMatch || roleMatch;
      });

      setSuggestions(filtered);
      setShowDropdown(true);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const expandedBarsCount = (!navCollapsed ? 1 : 0) + (!chatCollapsed ? 1 : 0);
  let gridClass = "grid-cols-5";
  if (expandedBarsCount === 1) gridClass = "grid-cols-4";
  if (expandedBarsCount === 2) gridClass = "grid-cols-3";

  return (
    <div className={`booking-list-container ${gridClass}`}>
      <h2 className="main-heading-title">INTERVIEW BOOKING</h2>

      {/* SEARCH BAR CONTAINER & DROPDOWN */}
      <div className="search-bar-wrapper" ref={dropdownRef}>
        <input
          type="text"
          className="search-input"
          placeholder="Search positions, mentors, experience..."
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => searchTerm.trim() && setShowDropdown(true)}
        />

        {/* DROPDOWN SUGGESTIONS */}
        {showDropdown && (
          <div className="search-dropdown">
            {suggestions.length > 0 ? (
              suggestions.map((item, index) => {
                const rowClass = index % 2 === 0 ? "row-even" : "row-odd";

                return (
                  <div
                    key={item.id}
                    className={`search-dropdown-item ${rowClass}`}
                    onClick={() => {
                      onViewProfile(item);
                      setShowDropdown(false);
                    }}
                  >
                    <div className="dropdown-item-info">
                      <span className="dropdown-item-name">{item.name}</span>
                      <span className="dropdown-item-separator">•</span>
                      <span
                        className="dropdown-item-pos"
                        style={{ textTransform: "uppercase" }}
                      >
                        {item.displayPosition}
                      </span>
                      <span className="dropdown-item-separator">•</span>
                      <span className="dropdown-item-exp">{item.expText}</span>
                    </div>

                    <div className="dropdown-item-rating">⭐ {item.rate}</div>
                  </div>
                );
              })
            ) : (
              <div className="search-dropdown-empty">
                Không tìm thấy kết quả phù hợp
              </div>
            )}
          </div>
        )}
      </div>

      {/* RENDER SECTION THEO ĐÚNG CHUỖI TRẢ VỀ TỪ GET-ALL */}
      {positions.length === 0 ? (
        <p className="status-message">
          Đang tải danh sách vị trí từ Backend...
        </p>
      ) : (
        positions.map((pos) => (
          <BookingSection
            key={pos}
            positionName={pos}
            onViewProfile={onViewProfile}
            onDataLoaded={(list) => handleSectionDataLoaded(pos, list)}
          />
        ))
      )}
    </div>
  );
};

export default BookingList;
