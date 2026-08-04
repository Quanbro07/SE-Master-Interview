#!/bin/bash

VOLUME_NAME="master-interview_db_data"
BACKUP_FILE="db_data_backup.tar.gz"


echo "Dang restore du lieu vao volume \"${VOLUME_NAME}\"..."

# Kiểm tra sự tồn tại của file backup trước khi chạy Docker
if [ ! -f "$BACKUP_FILE" ]; then
    echo "LỖI: Không tìm thấy file $BACKUP_FILE ở thư mục hiện tại!"
    exit 1
fi

docker volume rm ${VOLUME_NAME} 2>/dev/null
docker volume create ${VOLUME_NAME}

echo "Dung container dang su dung volume..."
docker stop postgres 2>/dev/null

# Sử dụng $(pwd -P) hoặc đường dẫn tương đối an toàn
docker run --rm \
    -v "${VOLUME_NAME}":/to \
    -v "$(pwd)":/from \
    alpine sh -c "cd /to && tar -xzvf /from/${BACKUP_FILE} && chmod -R 700 /to && chown -R 999:999 /to"

if [ $? -eq 0 ]; then
    echo -e "\nRestore hoan tat va da set quyen!"
else
    echo -e "\nLỖI: Qua trình restore thất bại!"
fi

read -p "Nhấn [Enter] để tiếp tục..."
