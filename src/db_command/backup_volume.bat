@echo off
set VOLUME_NAME=master-interview_db_data
set BACKUP_FILE=db_data_backup.tar.gz

echo Backup volume "%VOLUME_NAME%"...

docker run --rm ^
    -v %VOLUME_NAME%:/from ^
    -v "%cd%":/to ^
    alpine sh -c "tar -czvf /to/%BACKUP_FILE% -C /from ."

echo.
echo Backup hoàn tất!
echo File backup: %BACKUP_FILE%
pause