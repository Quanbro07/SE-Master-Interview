# 1. Dùng image Python bản slim cho nhẹ
FROM python:3.11-slim
# 2. Báo cho Python biết không cần ghi file cache (.pyc) và log thẳng ra terminal
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 3. Đặt thư mục làm việc bên trong container
WORKDIR /app

# 4. Copy file thư viện vào trước để tận dụng cache của Docker
COPY requirements.txt .

# 5. Cài đặt các thư viện
RUN pip install --no-cache-dir -r requirements.txt

# 6. Copy toàn bộ code (trừ những thằng bị chặn trong .dockerignore) vào container
COPY . .

# 7. Mở cổng 8000 để giao tiếp với bên ngoài
EXPOSE 8000

# 8. Lệnh khởi chạy server (Lưu ý: BẮT BUỘC dùng host 0.0.0.0 khi chạy trong Docker)
CMD ["uvicorn", "core_ai.api_server:app", "--host", "0.0.0.0", "--port", "8000"]