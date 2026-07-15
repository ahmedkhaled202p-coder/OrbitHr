@echo off
if "%ORBIT_HR_HOST%"=="" set ORBIT_HR_HOST=127.0.0.1
if "%ORBIT_HR_PORT%"=="" set ORBIT_HR_PORT=8080
REM Set ORBIT_HR_PUBLIC_ORIGIN and ORBIT_HR_ALLOWED_ORIGINS in .env after choosing your domain.
python start_server.py
