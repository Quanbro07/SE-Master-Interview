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
    return null;
  }

  if (!selectedFile) {
    alert("Vui lòng chọn file CV trước khi tiếp tục!");
    return null;
  }

  const rawToken = getAccessToken();
  const cleanToken = rawToken ? rawToken.replace(/^Bearer\s+/i, "") : "";

  if (!cleanToken) {
    alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
    return null;
  }

  const formData = new FormData();
  formData.append("file", selectedFile);

  try {
    const res = await fetch(
      `${API_BASE}/api/v1/booking/${bookingId}/upload-cv`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cleanToken}`,
        },
        body: formData,
      },
    );

    if (res.status === 401) {
      alert("Phiên đăng nhập không hợp lệ (401). Vui lòng đăng nhập lại!");
      return null;
    }

    if (res.ok) {
      const rawText = await res.text();
      const cvUrl = rawText.replace(/^"(.*)"$/, "$1").trim();
      console.log("Upload CV thành công, URL:", cvUrl);
      return cvUrl; // TRẢ VỀ STRING URL
    } else {
      const errorText = await res.text();
      console.error("Lỗi Upload CV:", res.status, errorText);
      alert(`Upload CV thất bại (${res.status}): ${errorText}`);
      return null;
    }
  } catch (error) {
    console.error("Kết nối thất bại khi upload CV:", error);
    alert("Không thể kết nối đến máy chủ.");
    return null;
  }
};
