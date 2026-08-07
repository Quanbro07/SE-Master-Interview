#!/bin/bash

VOLUME_NAME="master-interview_db_data"
BACKUP_FILE="db_data_backup.tar.gz"

echo "Dang restore du lieu vao volume \"${VOLUME_NAME}\"..."

# 1. Kiểm tra sự tồn tại của file backup
if [ ! -f "$BACKUP_FILE" ]; then
    echo "LỖI: Không tìm thấy file $BACKUP_FILE ở thư mục hiện tại!"
    exit 1
fi

# 2. Dừng container đang sử dụng volume
echo "Dang dung cac container..."
docker compose down 2>/dev/null || docker stop postgres 2>/dev/null

# 3. Xóa volume cũ đi để tạo lại cho sạch sẽ
echo "Dang reset volume..."
docker volume rm ${VOLUME_NAME} 2>/dev/null
docker volume create ${VOLUME_NAME}

# 4. Giải nén và set quyền chuẩn xác cho Postgres (999:999 và 700)
# Lưu ý: Thêm cờ :z ở volume mount để tương thích với các máy Linux dùng SELinux
echo "Dang giai nen va ghi du lieu vao volume..."
docker run --rm \
    -v "${VOLUME_NAME}":/to \
    -v "$(pwd)":/from \
    alpine sh -c "cd /to && tar -xzvf /from/${BACKUP_FILE} ; chown -R 70:70 /to && chmod -R 700 /to"
    
if [ $? -eq 0 ]; then
    echo -e "\n[Thành công] Restore hoàn tất và đã set quyền chuẩn 999:999, 700 cho Postgres!"
else
    echo -e "\n[LỖI] Quá trình giải nén hoặc ghi volume thất bại!"
fi

read -p "Nhấn [Enter] để tiếp tục..."
