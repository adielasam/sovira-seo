<#
.SYNOPSIS
  Persistent Windows watchdog supervisor for Sovira AI Task Assistant Worker.
  Automatically restarts the worker on crash with bounded exponential backoff
  and logs exit status cleanly without modifying Next.js web servers.
#>

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$LogDir = Join-Path $ProjectRoot ".worker-logs"
if (!(Test-Path $LogDir)) {
  New-Item -ItemType Directory -Path $LogDir | Out-Null
}
$SupervisorLog = Join-Path $LogDir "supervisor.log"

function Write-SupervisorLog([string]$Message) {
  $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  $line = "[$ts] $Message"
  Write-Host $line
  Add-Content -Path $SupervisorLog -Value $line
}

Write-SupervisorLog "Starting Sovira Assistant Worker Watchdog..."
$consecutiveFailures = 0

while ($true) {
  $startedAt = Get-Date
  try {
    Write-SupervisorLog "Launching worker/assistant-worker.ts via pnpm exec tsx..."
    & pnpm exec tsx worker/assistant-worker.ts
    $exitCode = $LASTEXITCODE
  } catch {
    $exitCode = 1
    Write-SupervisorLog "Worker threw exception: $($_.Exception.Message)"
  }

  $uptimeSec = ((Get-Date) - $startedAt).TotalSeconds
  if ($exitCode -eq 0) {
    Write-SupervisorLog "Worker exited cleanly (code 0). Stopping watchdog."
    break
  }

  if ($uptimeSec -gt 60) {
    $consecutiveFailures = 1
  } else {
    $consecutiveFailures++
  }

  $backoffSec = [Math]::Min(60, [Math]::Pow(2, $consecutiveFailures) * 2)
  Write-SupervisorLog "Worker exited unexpectedly (code=$exitCode, uptime=$([Math]::Round($uptimeSec, 1))s). Restarting in ${backoffSec}s..."
  Start-Sleep -Seconds $backoffSec
}
