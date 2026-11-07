@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 22 or newer first.
  pause
  exit /b 1
)
if not exist "node_modules\typescript\bin\tsc" (
  echo Installing project dependencies...
  npm install --no-audit --no-fund
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)
npm run dev
pause
