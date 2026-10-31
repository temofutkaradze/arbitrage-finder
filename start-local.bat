@echo off
setlocal
cd /d "%~dp0"
if /i "%~1"=="web" goto web
if /i "%~1"=="research" goto research
where node >nul 2>nul
if errorlevel 1 goto missingnode
if not exist "node_modules\.bin\tsx.cmd" goto missingdeps
node --import tsx scripts/start-local-check.ts
set "startup_result=%errorlevel%"
if not "%startup_result%"=="0" if not "%startup_result%"=="2" goto failed
start "Arbitrage Finder - Website" cmd /k call "%~f0" web
node --import tsx scripts/start-local-check.ts --wait
if errorlevel 1 goto failed
if "%startup_result%"=="0" start "Arbitrage Finder - Research worker" cmd /k call "%~f0" research
start "" "http://127.0.0.1:3000"
echo Website opened. Keep the website and worker windows open.
echo Stop a process with Ctrl+C in its window. Closing the browser does not stop it.
exit /b 0
:web
call npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
exit /b %errorlevel%
:research
call npm.cmd run research:worker
exit /b %errorlevel%
:missingnode
echo Install Node.js 24 or newer, then try again.
goto failed
:missingdeps
echo Dependencies are missing. Run npm ci in this folder first.
goto failed
:failed
echo Startup stopped. Read the message above. No database setup or migration was run.
pause
exit /b 1
