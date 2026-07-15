@echo off
cd /d "%~dp0"
python start_server.py
if errorlevel 1 (
  echo.
  echo Python is required. Install Python 3, then run this file again.
  pause
)
