@echo off
setlocal
cd /d "%~dp0"

echo Setting up Jarvis backend...
cd /d "%~dp0Backend\Jarvis_Max"

if not exist "venv\Scripts\python.exe" (
    python -m venv venv
    if errorlevel 1 exit /b 1
)

"venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 exit /b 1

"venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 exit /b 1

echo.
echo Setting up Electron + React frontend...
cd /d "%~dp0Frontend"
npm install
if errorlevel 1 exit /b 1

echo.
echo Setup complete.
echo Start your local LLM server, then run start-windows.cmd
endlocal
