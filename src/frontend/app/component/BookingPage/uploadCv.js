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

export const handleUploadCV = async (
  selectedFile,
  positionName = "GENERAL",
) => {
  if (!selectedFile) {
    alert("Vui lòng chọn file CV trước khi tiếp tục!");
    return null;
  }

  // 1. Dùng hàm xịn để lấy token
  const rawToken = getAccessToken();
  const cleanToken = rawToken ? rawToken.replace(/^Bearer\s+/i, "") : "";

  if (!cleanToken) {
    alert(
      "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại!",
    );
    return null;
  }

  // 2. Chuẩn bị FormData y như cũ
  const formData = new FormData();
  formData.append("file", selectedFile);
  formData.append("position", positionName);

  try {
    // Sửa endpoint chính xác theo CVAssessmentController của Backend
    const res = await fetch(`${API_BASE}/api/v1/cv-assessment/assess-cv`, {
      method: "POST",
      headers: {
        // Lưu ý: KHÔNG thêm 'Content-Type', browser sẽ tự động gắn boundary cho FormData
        Authorization: `Bearer ${cleanToken}`,
      },
      body: formData,
    });

    if (res.status === 401) {
      alert("Phiên đăng nhập đã hết hạn (401). Vui lòng đăng nhập lại!");
      return null;
    }

    if (res.ok) {
      const data = await res.json();
      console.log("Upload CV thành công:", data);
      return data; 
    } else {
      const errorText = await res.text();
      console.error("Lỗi Upload CV:", res.status, errorText);
      alert("Upload CV thất bại. Mã lỗi: " + res.status);
      return null;
    }
  } catch (error) {
    console.error("Kết nối thất bại khi upload CV:", error);
    alert("Không thể kết nối đến máy chủ.");
    return null;
  }
};