import { useState, useEffect, useRef } from "react";
import "./SearchDropdown.css"; // Import CSS cho dropdown
export default function InterviewBooking() {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [interviewers, setInterviewers] = useState([]); // Dữ liệu danh sách chính bên dưới
  const searchRef = useRef(null);

  // 1. Fetch danh sách ban đầu cho các vị trí (Backend, Frontend, Data, Software Engineer...)
  useEffect(() => {
    fetchInterviewers();
  }, []);

  const fetchInterviewers = async () => {
    try {
      const res = await fetch("/api/interviewers"); // Thay URL API của bạn ở đây
      const data = await res.json();

      // Đảm bảo log ra để kiểm tra cấu trúc data trả về
      console.log("Interviewers Data:", data);

      // Nếu API trả về dạng { result: [...] } hoặc trực tiếp array [...]
      setInterviewers(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error("Lỗi fetch danh sách interviewer:", err);
    }
  };

  // 2. Xử lý gõ từ khóa (Check từng chữ cái & hiện dropdown)
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (value.trim().length > 0) {
      // Lọc nhanh trực tiếp từ danh sách hiện có hoặc gọi API search
      const filtered = interviewers.filter(
        (item) =>
          item.name?.toLowerCase().includes(value.toLowerCase()) ||
          item.position?.toLowerCase().includes(value.toLowerCase()) ||
          item.skills?.some((skill) =>
            skill.toLowerCase().includes(value.toLowerCase()),
          ),
      );
      setSuggestions(filtered);
      setShowDropdown(true);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  // 3. Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{ position: "relative" }} ref={searchRef}>
      {/* Khung Input Search (Không cần nút Search) */}
      <div className="search-box">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          placeholder="Nhập tên, vị trí, kỹ năng..."
          className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg focus:outline-none"
        />
      </div>

      {/* Dropdown hiển thị danh sách gợi ý ngay bên dưới khung search */}
      {showDropdown && (
        <div className="absolute top-full left-0 w-full bg-gray-900 border border-gray-700 rounded-b-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {suggestions.length > 0 ? (
            suggestions.map((item) => (
              <div
                key={item.id}
                className="p-3 hover:bg-gray-800 cursor-pointer text-white flex justify-between items-center border-b border-gray-800"
                onClick={() => {
                  setSearchTerm(item.name || item.position);
                  setShowDropdown(false);
                  // Có thể scroll tới mục tương ứng hoặc mở modal detail
                }}
              >
                <div>
                  <div className="font-bold">{item.name}</div>
                  <div className="text-sm text-gray-400">{item.position}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-3 text-gray-400 text-center">
              Không tìm thấy kết quả phù hợp
            </div>
          )}
        </div>
      )}
    </div>
  );
}
