@echo off
setlocal EnableExtensions EnableDelayedExpansion

title ModularFlow GitHub Push Helper

cd /d "%~dp0"

echo ================================================
echo ModularFlow - Commit and Push to GitHub
echo ================================================
echo.

if not exist .git (
  echo [ERROR] This folder is not a git repository.
  pause
  exit /b 1
)

for /f "delims=" %%R in ('git remote get-url origin 2^>nul') do set "ORIGIN_URL=%%R"
if not defined ORIGIN_URL (
  echo [ERROR] Git remote ^"origin^" is not configured.
  pause
  exit /b 1
)

echo Remote: !ORIGIN_URL!
echo.

set "COMMIT_MESSAGE="
set /p COMMIT_MESSAGE=Enter commit message [default: Working Version for gpt-4o]: 
if not defined COMMIT_MESSAGE set "COMMIT_MESSAGE=Working Version for gpt-4o"

echo.
echo [1/5] Fetching latest origin refs...
git fetch origin
if errorlevel 1 (
  echo [ERROR] git fetch failed.
  pause
  exit /b 1
)

echo [2/5] Staging tracked and untracked changes...
git add -A
if errorlevel 1 (
  echo [ERROR] git add failed.
  pause
  exit /b 1
)

echo [3/5] Checking if there is anything to commit...
git diff --cached --quiet
if errorlevel 1 (
  echo Creating commit with message: !COMMIT_MESSAGE!
  git commit -m "!COMMIT_MESSAGE!"
  if errorlevel 1 (
    echo [ERROR] git commit failed.
    pause
    exit /b 1
  )
) else (
  echo No file changes detected. Creating empty marker commit with message: !COMMIT_MESSAGE!
  git commit --allow-empty -m "!COMMIT_MESSAGE!"
  if errorlevel 1 (
    echo [ERROR] empty git commit failed.
    pause
    exit /b 1
  )
)

echo [4/5] Pushing to origin/main...
git push -u origin main
if errorlevel 1 (
  echo [ERROR] git push failed.
  echo Check the output above for secret scanning, auth, or remote conflicts.
  pause
  exit /b 1
)

echo [5/5] Done.
echo Commit and push completed successfully.
echo.
git log -1 --oneline
echo.
pause
exit /b 0