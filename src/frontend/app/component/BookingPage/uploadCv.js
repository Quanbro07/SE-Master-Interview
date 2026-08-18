// src/utils/uploadCv.js
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

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

  // Quét dự phòng trong object user
  if (!token) {
    try {
      const userObj = JSON.parse(localStorage.getItem("user") || "{}");
      token = userObj.token || userObj.accessToken || userObj.jwt || "";
    } catch (e) {
      console.error(e);
    }
  }

  if (!token) return "";
  // Xóa sạch dấu ngoặc kép thừa (nếu có)
  return token.replace(/^"(.*)"$/, "$1").trim();
};

export const uploadCvBooking = async (bookingId, selectedFile) => {
  if (!bookingId) {
    alert("Không tìm thấy thông tin lượt đặt lịch (bookingId)!");
    return false;
  }

  if (!selectedFile) {
    alert("Vui lòng chọn file CV trước khi tiếp tục!");
    return false;
  }

  // 1. Lấy token xác thực
  const rawToken = getAccessToken();
  const cleanToken = rawToken ? rawToken.replace(/^Bearer\s+/i, "") : "";

  if (!cleanToken) {
    alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
    return false;
  }

  // 2. Tạo FormData truyền 'file' đúng với Controller Backend
  const formData = new FormData();
  formData.append("file", selectedFile);

  try {
    // 3. Gọi chuẩn API của BookingController
    const res = await fetch(
      `${API_BASE}/api/v1/booking/${bookingId}/upload-cv`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          // Lưu ý: KHÔNG set Content-Type header khi dùng FormData
        },
        body: formData,
      },
    );

    if (res.status === 401) {
      alert("Phiên đăng nhập không hợp lệ (401). Vui lòng đăng nhập lại!");
      return false;
    }

    if (res.ok) {
      console.log("Upload CV cho Booking thành công!");
      return true;
    } else {
      const errorText = await res.text();
      console.error("Lỗi Upload CV:", res.status, errorText);
      alert(`Upload CV thất bại (${res.status}): ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error("Kết nối thất bại khi upload CV:", error);
    alert("Không thể kết nối đến máy chủ.");
    return false;
  }
};
