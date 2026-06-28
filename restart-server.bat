@echo off
setlocal EnableExtensions EnableDelayedExpansion

title ModularFlow Server Restart

cd /d "%~dp0"

echo ==================================================
echo ModularFlow - Smart Server Restart
echo ==================================================
echo.

if not exist package.json (
  echo [ERROR] package.json not found. Run this from project root.
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found in PATH.
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm not found in PATH.
  exit /b 1
)

echo [1/5] Releasing commonly used ports...
for %%P in (5000 5001 5173) do call :kill_port %%P

echo [2/5] Verifying dependencies...
if not exist node_modules (
  echo node_modules not found. Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    exit /b 1
  )
)

echo [3/5] Running type check (non-blocking if it fails)...
call npm run check >nul 2>&1
if errorlevel 1 (
  echo [WARN] Type check failed. Continuing startup attempts...
) else (
  echo Type check passed.
)

echo [4/5] Starting server with fallbacks...

call :try_start "npm run dev" "Default npm run dev"
if not errorlevel 1 goto :success

call :try_start "set NODE_ENV=development && set PORT=5000 && npm run dev" "NODE_ENV=development, PORT=5000"
if not errorlevel 1 goto :success

call :try_start "set NODE_ENV=development && set PORT=5001 && npm run dev" "NODE_ENV=development, PORT=5001"
if not errorlevel 1 goto :success

call :try_start "set NODE_ENV=development && set PORT=5000 && npx tsx server/index.ts" "Direct tsx entry, PORT=5000"
if not errorlevel 1 goto :success

call :try_start "set NODE_ENV=development && set PORT=5001 && npx tsx server/index.ts" "Direct tsx entry, PORT=5001"
if not errorlevel 1 goto :success

echo.
echo [ERROR] All startup attempts failed.
echo Check environment variables in .env.local and server logs above.
exit /b 1

:success
echo.
echo [OK] Server started successfully.
echo Keep this window open while developing.
exit /b 0

:try_start
set "_CMD=%~1"
set "_LABEL=%~2"
echo.
echo ---- Attempt: !_LABEL! ----
echo Running: !_CMD!
cmd /c "!_CMD!"
set "_EXIT=!ERRORLEVEL!"
if "!_EXIT!"=="0" exit /b 0
echo Attempt failed with exit code !_EXIT!.
exit /b 1

:kill_port
set "_PORT=%~1"
for /f "tokens=5" %%A in ('netstat -ano ^| findstr /r /c:":%_PORT% .*LISTENING"') do (
  if not "%%A"=="0" (
    echo Stopping PID %%A on port %_PORT%...
    taskkill /PID %%A /F >nul 2>&1
  )
)
exit /b 0
