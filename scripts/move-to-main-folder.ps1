[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$Source = (Join-Path $env:USERPROFILE 'arbitrage-finder-local'),
  [string]$Destination = 'C:\arbitrage-finder'
)
$ErrorActionPreference = 'Stop'
if ($env:OS -ne 'Windows_NT') { throw 'This helper is for Windows only.' }
$sourcePath = [IO.Path]::GetFullPath($Source).TrimEnd('\')
$destinationPath = [IO.Path]::GetFullPath($Destination).TrimEnd('\')
if (-not (Test-Path -LiteralPath $sourcePath -PathType Container)) { throw 'Source folder was not found. No folders changed.' }
if ($sourcePath.Equals($destinationPath, [StringComparison]::OrdinalIgnoreCase)) { throw 'Source and destination are the same. No folders changed.' }
if (-not [IO.Path]::GetPathRoot($sourcePath).Equals([IO.Path]::GetPathRoot($destinationPath), [StringComparison]::OrdinalIgnoreCase)) { throw 'Use folders on the same drive. No folders changed.' }
if ($sourcePath.StartsWith($destinationPath + '\', [StringComparison]::OrdinalIgnoreCase) -or $destinationPath.StartsWith($sourcePath + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Folders cannot be inside one another. No folders changed.' }
foreach ($path in @($sourcePath, $destinationPath)) {
  if ((Test-Path -LiteralPath $path) -and ((Get-Item -LiteralPath $path -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Folder links/junctions are not supported. No folders changed.' }
}
$packagePath = Join-Path $sourcePath 'package.json'
if (-not (Test-Path -LiteralPath $packagePath)) { throw 'Source has no package.json. No folders changed.' }
$package = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
if ($package.name -ne 'arbitrage-finder' -or -not (Test-Path -LiteralPath (Join-Path $sourcePath '.git'))) { throw 'Source is not the expected project checkout. No folders changed.' }
if (-not (Test-Path -LiteralPath (Split-Path $destinationPath -Parent) -PathType Container)) { throw 'Destination parent does not exist. No folders changed.' }
if ((Test-Path -LiteralPath $destinationPath) -and -not (Test-Path -LiteralPath $destinationPath -PathType Container)) { throw 'Destination is not a folder. No folders changed.' }
# Avoid renaming the current terminal directory or any of its parents.
$currentPath = (Get-Location).Path.TrimEnd('\')
foreach ($path in @($sourcePath, $destinationPath)) {
  if ($currentPath.Equals($path, [StringComparison]::OrdinalIgnoreCase) -or $currentPath.StartsWith($path + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Run this helper from C:\Users\temof, outside both project folders. No folders changed.' }
}
# Stop the web server / worker and close editors first. Never kill processes here.
$listener = Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue
if ($listener) { throw 'Port 3000 is in use. Stop the app with Ctrl+C, then retry. No folders changed.' }
$backupPath = $destinationPath + '-before-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N').Substring(0, 6)
if (-not $PSCmdlet.ShouldProcess($destinationPath, 'Preserve old destination as a backup and move the complete working checkout here')) { return }
$backedUp = $false
try {
  if (Test-Path -LiteralPath $destinationPath) {
    [IO.Directory]::Move($destinationPath, $backupPath)
    $backedUp = $true
  }
  [IO.Directory]::Move($sourcePath, $destinationPath)
} catch {
  # If the second move failed, restore the old destination when it is still absent.
  if ($backedUp -and -not (Test-Path -LiteralPath $destinationPath)) {
    try { [IO.Directory]::Move($backupPath, $destinationPath) }
    catch { Write-Warning "Automatic rollback failed. Your old folder is preserved at: $backupPath" }
  }
  throw 'Folder move failed. Close the app/worker/editor and check folder permissions. No files were deleted and no database was changed.'
}
Write-Host "Working project: $destinationPath"
if ($backedUp) { Write-Host "Old project backup: $backupPath" }
Write-Host 'All working checkout files, including ignored local settings, moved together. No secret values were read or printed.'
Write-Host 'The owner-access file outside the checkout stays at its previous location; keep it private.'
Write-Host "Next: cd /d $destinationPath"
Write-Host 'Then: npm run dev -- --hostname 127.0.0.1'
