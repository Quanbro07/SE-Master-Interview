// src/utils/uploadCv.js
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export const handleUploadCV = async (
  selectedFile,
  positionName = "GENERAL",
) => {
  if (!selectedFile) {
    alert("Vui lòng chọn file CV trước khi tiếp tục!");
    return null;
  }

  // 1. Lấy token từ localStorage
  let rawToken =
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("authToken");

  if (!rawToken) {
    try {
      const userObj = JSON.parse(localStorage.getItem("user") || "{}");
      rawToken = userObj.token || userObj.accessToken || userObj.jwt;
    } catch (e) {
      console.error(e);
    }
  }

  const cleanToken = rawToken ? rawToken.trim().replace(/^Bearer\s+/i, "") : "";

  if (!cleanToken) {
    alert(
      "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại!",
    );
    return null;
  }

  // 2. Chuẩn bị FormData
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

      // Nếu backend trả về kết quả đánh giá chứa URL hoặc thông tin CV
      return {
        url: data.cvUrl || data.url || data.fileUrl || "uploaded",
        ...data,
      };
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
