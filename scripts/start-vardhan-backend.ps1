$ErrorActionPreference = "Stop"
$Project = Split-Path -Parent $PSScriptRoot
Set-Location $Project

function Test-Backend {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:8000/api/health" -TimeoutSec 3
    return $response.StatusCode -eq 200
  } catch { return $false }
}

if (Test-Backend) {
  Write-Host "VARDHAN backend is already healthy on port 8000." -ForegroundColor Green
  exit 0
}

Write-Host "Starting VARDHAN backend on port 8000..." -ForegroundColor Cyan
python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000
