@echo off
setlocal
cd /d "%~dp0"
if not defined SCROLLFACT_PORT set "SCROLLFACT_PORT=8080"
docker info >nul 2>&1
if errorlevel 1 (
  echo Start Docker Desktop with Linux containers, then run this file again.
  pause
  exit /b 1
)
docker compose up --build -d --wait --wait-timeout 180
if errorlevel 1 (
  echo Startup failed. See the output above or run: docker compose logs --tail 100
  pause
  exit /b 1
)
start "" "http://127.0.0.1:%SCROLLFACT_PORT%"
