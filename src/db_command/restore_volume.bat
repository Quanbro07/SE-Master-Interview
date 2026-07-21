@echo off
set VOLUME_NAME=master-interview_db_data
set BACKUP_FILE=db_data_backup.tar.gz

echo Dang restore du lieu vao volume "%VOLUME_NAME%"...

:: Xoa volume cu di de tao lai cho sach se (neu muon)
docker volume rm %VOLUME_NAME% 2>NUL
docker volume create %VOLUME_NAME%

echo Dung container dang su dung volume...
docker stop postgres 2>NUL

:: Buoc 1: Giai nen
:: Buoc 2: CHOWN (Doi chu so huu file sang postgres:postgres id 999:999 hoac 70:70)
:: Postgres thuong dung ID 999 hoac 70. Lenh duoi se set quyen rong rai (777) de dam bao chay duoc.
docker run --rm ^
    -v %VOLUME_NAME%:/to ^
    -v "%cd%":/from ^
    alpine sh -c "cd /to && tar -xzvf /from/%BACKUP_FILE% && chmod -R 700 /to && chown -R 999:999 /to"

echo.
echo Restore hoan tat va da set quyen!
pause