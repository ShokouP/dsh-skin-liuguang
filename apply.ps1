<#
  Apply the Aurora skin to one DSH profile.

  What it changes (all reversible with revert.ps1):
    1. copies ui/aurora/ into  <DSH_HOME>/profiles/<name>/node_modules/dsh-theme-aurora
    2. appends one marked insert block to  <DSH_HOME>/profiles/<name>/cordis.patch.yml
    3. keeps a one-time backup of cordis.patch.yml next to it (*.aurora-backup)

  The running host watches its patch file, so the skin loads without a restart;
  refresh the page (Ctrl+R / F5) to see it.
#>
[CmdletBinding()]
param(
  [string]$ProfileName = 'desktop',
  [string]$ThemeDir,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

$source = if ($ThemeDir) { $ThemeDir } else { Join-Path $PSScriptRoot 'aurora' }
if (-not (Test-Path (Join-Path $source 'package.json'))) {
  throw "aurora package not found at $source"
}

$dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
$profileDir = Join-Path $dshHome (Join-Path 'profiles' $ProfileName)
$patchFile = Join-Path $profileDir 'cordis.patch.yml'

if (-not (Test-Path $profileDir)) { throw "profile not found: $profileDir" }
if (-not (Test-Path $patchFile)) { throw "patch layer not found: $patchFile (start DSH once for this profile first)" }

$markerStart = '# >>> aurora-skin (managed by ui/apply.ps1 - remove with ui/revert.ps1)'
$markerEnd = '# <<< aurora-skin'
$block = @(
  $markerStart
  '- insert:'
  '    - id: theme-aurora'
  '      name: dsh-theme-aurora'
  $markerEnd
) -join "`n"

$patch = [System.IO.File]::ReadAllText($patchFile)
if ($patch.Contains($markerStart) -and -not $Force) {
  Write-Host "patch entry already present in $patchFile"
} else {
  $backup = "$patchFile.aurora-backup"
  if (-not (Test-Path $backup)) {
    Copy-Item $patchFile $backup
    Write-Host "backup  -> $backup"
  }
  if ($patch.Contains($markerStart)) {
    $patch = [regex]::Replace($patch, '(?ms)^# >>> aurora-skin.*?^# <<< aurora-skin\r?\n?', '')
  }
  if (-not $patch.EndsWith("`n")) { $patch += "`n" }
  if ($patch.Trim().Length -gt 0) { $patch += "`n" }
  [System.IO.File]::WriteAllText($patchFile, $patch + $block + "`n", (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "patched -> $patchFile"
}

$dest = Join-Path $profileDir (Join-Path 'node_modules' 'dsh-theme-aurora')
New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
Copy-Item -Recurse -Force $source $dest
Remove-Item -Force (Join-Path $dest 'lib\activity.log') -ErrorAction SilentlyContinue
Write-Host "package -> $dest"

Write-Host ''
Write-Host 'Aurora applied. Refresh the GUI (Ctrl+R / F5) to see it.'
$undo = if ($PSScriptRoot) { "pwsh -File `"$PSScriptRoot\revert.ps1`" -ProfileName $ProfileName" } else { 'pwsh -File revert.ps1 -ProfileName ' + $ProfileName }
Write-Host "Undo anytime:  $undo"
