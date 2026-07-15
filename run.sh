#!/usr/bin/env bash
set -e
export ORBIT_HR_HOST="${ORBIT_HR_HOST:-127.0.0.1}"
export ORBIT_HR_PORT="${ORBIT_HR_PORT:-8080}"
# Set ORBIT_HR_PUBLIC_ORIGIN and ORBIT_HR_ALLOWED_ORIGINS in .env after choosing your domain.
python3 start_server.py
