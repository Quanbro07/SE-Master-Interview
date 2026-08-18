#!/bin/sh

VOLUME_NAME="master-interview_db_data"
BACKUP_FILE="db_data_backup.tar.gz"

echo "Backup volume \"$VOLUME_NAME\"..."

docker run --rm \
    -v "$VOLUME_NAME":/from \
    -v "$(pwd)":/to \
    alpine sh -c "tar -czvf /to/$BACKUP_FILE -C /from ."

echo ""
echo "Backup hoàn tất!"
echo "File backup: $BACKUP_FILE"

echo "Press Enter to continue..."

