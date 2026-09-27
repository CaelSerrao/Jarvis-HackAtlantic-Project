$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "Backend\Jarvis_Max"
$Frontend = Join-Path $Root "Frontend"

Write-Host "Setting up Jarvis backend..."
Set-Location $Backend

if (-not (Test-Path ".\venv\Scripts\python.exe")) {
    python -m venv venv
}

& ".\venv\Scripts\python.exe" -m pip install --upgrade pip
& ".\venv\Scripts\python.exe" -m pip install -r requirements.txt

Write-Host "Setting up Electron + React frontend..."
Set-Location $Frontend
npm install

Write-Host ""
Write-Host "Setup complete. Start your local LLM server, then run:"
Write-Host "  cd Frontend"
Write-Host "  npm start"
