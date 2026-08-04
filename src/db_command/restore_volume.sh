#!/bin/bash

VOLUME_NAME="master-interview_db_data"
BACKUP_FILE="db_data_backup.tar.gz"

echo "Dang restore du lieu vao volume \"${VOLUME_NAME}\"..."

# 1. Kiểm tra sự tồn tại của file backup
if [ ! -f "$BACKUP_FILE" ]; then
    echo "LỖI: Không tìm thấy file $BACKUP_FILE ở thư mục hiện tại!"
    exit 1
fi

# 2. Hạ toàn bộ stack xuống để tránh việc backend hoặc postgres đang ghi đè/lock volume
echo "Dang dung cac container..."
docker compose down 2>/dev/null || docker stop postgres 2>/dev/null

# 3. Xóa và tạo lại volume sạch sẽ
echo "Dang reset volume..."
docker volume rm ${VOLUME_NAME} 2>/dev/null
docker volume create ${VOLUME_NAME}

# 4. Chạy container khôi phục dữ liệu
# THÊM: Sử dụng :Z nếu dùng các bản Linux có SELinux (như RedHat/CentOS) để tránh lỗi Permission
echo "Dang giai nen va ghi du lieu vao volume..."
# Sử dụng chmod -R 755 hoặc 777 để phá khóa quyền đọc file trên Linux
docker run --rm \
    -v "${VOLUME_NAME}":/to \
    -v "$(pwd)":/from:ro \
    alpine sh -c "cd /to && tar -xzvf /from/${BACKUP_FILE} && chmod -R 777 /to"


if [ $? -eq 0 ]; then
    echo -e "\n[Thành công] Restore hoàn tất và đã set quyền 999:999 chuẩn Postgres Linux!"
else
    echo -e "\n[LỖI] Quá trình giải nén hoặc ghi volume thất bại!"
fi

read -p "Nhấn [Enter] để tiếp tục..."

