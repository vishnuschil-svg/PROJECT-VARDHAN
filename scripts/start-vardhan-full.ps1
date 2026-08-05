$ErrorActionPreference = "Stop"
$Project = Split-Path -Parent $PSScriptRoot
Set-Location $Project

function Test-Backend {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:8000/api/health" -TimeoutSec 3
    return $response.StatusCode -eq 200
  } catch { return $false }
}

if (-not (Test-Backend)) {
  Write-Host "Starting VARDHAN backend on port 8000..." -ForegroundColor Cyan
  $backend = Start-Process powershell.exe -PassThru -WindowStyle Normal -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command", "Set-Location '$Project'; python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000"
  )
  $healthy = $false
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 500
    if (Test-Backend) { $healthy = $true; break }
    if ($backend.HasExited) { break }
  }
  if (-not $healthy) {
    Write-Host "Backend did not become healthy. Check the backend PowerShell window." -ForegroundColor Red
    exit 1
  }
}

Write-Host "Backend healthy. Starting VARDHAN frontend..." -ForegroundColor Green
npm run dev
