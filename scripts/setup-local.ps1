param([int]$DatabasePort = 5432, [string]$DatabaseUser = "postgres")
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Install Node.js 24 LTS, then open PowerShell again." }
$major = [int](& node -p "process.versions.node.split('.')[0]")
if ($major -lt 24) { throw "Node.js 24 or newer is required." }
if ($DatabasePort -lt 1 -or $DatabasePort -gt 65535) { throw "Invalid PostgreSQL port." }
if (Test-Path .env.local) {
  if (Select-String -Path .env.local -Pattern '^\s*(export\s+)?(DATABASE_URL|SHADOW_DATABASE_URL)\s*=' -Quiet) { throw "Database overrides found in .env.local. Consolidate database settings in .env before setup; no files changed." }
}
if (-not (Test-Path .env)) {
  $securePassword = Read-Host "Your LOCAL PostgreSQL password (not pgAdmin master password)" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  try {
    $encodedPassword = [Uri]::EscapeDataString([Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr))
    $encodedUser = [Uri]::EscapeDataString($DatabaseUser)
    $base = "postgresql://${encodedUser}:${encodedPassword}@127.0.0.1:${DatabasePort}/"
    $lines = "DATABASE_URL=${base}arbitrage`nSHADOW_DATABASE_URL=${base}arbitrage_shadow`n"
    $stream = [IO.File]::Open((Join-Path (Get-Location) '.env'), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write)
    try {
      $writer = New-Object IO.StreamWriter($stream, (New-Object Text.UTF8Encoding($false)))
      try { $writer.Write($lines) } finally { $writer.Dispose() }
    } finally { $stream.Dispose() }
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    $encodedPassword = $null; $lines = $null; $base = $null
  }
} else { Write-Host "Existing .env preserved." }
function Run-Step([string]$Command, [string[]]$Arguments) {
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Step failed: $Command. Stop and diagnose; no database reset is performed." }
}
Run-Step 'npm.cmd' @('ci')
Run-Step 'npx.cmd' @('tsx', 'scripts/prepare-local-db.ts')
Run-Step 'npx.cmd' @('prisma', 'generate')
Run-Step 'npx.cmd' @('prisma', 'migrate', 'deploy')
if (-not (Test-Path .env.local)) { Run-Step 'npm.cmd' @('run', 'auth:init') } else { Write-Host "Existing .env.local preserved. Verify owner authentication is configured before startup." }
Write-Host "Setup complete. Run: npm.cmd run dev -- --hostname 127.0.0.1"
Write-Host "Owner access file: ..\.cloud-setup\owner-access.txt (keep private)."
