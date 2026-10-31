@echo off
setlocal
cd /d "%~dp0"
if /i "%~1"=="web" goto web
if /i "%~1"=="research" goto research

where node >nul 2>nul
if errorlevel 1 goto missingnode
if not exist "node_modules\.bin\tsx.cmd" goto missingdeps
if not exist "scripts\start-local-check.ts" goto missinghelper

node --import tsx scripts/start-local-check.ts
set "startup_result=%errorlevel%"
if not "%startup_result%"=="0" if not "%startup_result%"=="2" goto failed

set "terminal_window=ArbitrageFinder-%RANDOM%"
where wt.exe >nul 2>nul
if errorlevel 1 goto cmdstart

start "" wt.exe -w "%terminal_window%" new-tab --title "Website" cmd.exe /k call "%~f0" web
node --import tsx scripts/start-local-check.ts --wait
if errorlevel 1 goto failed
if "%startup_result%"=="0" start "" wt.exe -w "%terminal_window%" new-tab --title "Research worker" cmd.exe /k call "%~f0" research
goto ready

:cmdstart
start "Arbitrage Finder - Website" cmd.exe /k call "%~f0" web
node --import tsx scripts/start-local-check.ts --wait
if errorlevel 1 goto failed
if "%startup_result%"=="0" start "Arbitrage Finder - Research worker" cmd.exe /k call "%~f0" research

:ready
echo Keep the website and worker tabs open.
exit /b 0

:web
call npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
exit /b %errorlevel%

:research
call npm.cmd run research:worker
exit /b %errorlevel%

:missingnode
echo Install Node.js 24 or newer.
goto failed

:missingdeps
echo Run npm ci in the project folder first.
goto failed

:missinghelper
echo scripts\start-local-check.ts is missing. Update the project first.
goto failed

:failed
echo Startup stopped. Read the message above.
pause
exit /b 1
