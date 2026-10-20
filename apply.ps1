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

# The Desktop renderer takes the skin through the browser half, which needs the
# stylesheet baked in. Rebuild it whenever the CSS is newer than the bundle.
$cssPath = Join-Path $source 'lib\aurora.css'
$clientPath = Join-Path $source 'lib\client.js'
$builder = Join-Path $source 'tools\build.mjs'
$stale = -not (Test-Path $clientPath) -or ((Get-Item $cssPath).LastWriteTimeUtc -gt (Get-Item $clientPath).LastWriteTimeUtc)
if ($stale -and (Test-Path $builder)) {
  $node = (Get-Command node -ErrorAction SilentlyContinue).Source
  if (-not $node) {
    $homeGuess = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
    $candidate = Join-Path $homeGuess 'dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
    if (Test-Path $candidate) { $node = $candidate }
  }
  if ($node) {
    & $node $builder
    if ($LASTEXITCODE -ne 0) { throw 'client bundle build failed' }
  } else {
    Write-Warning 'node not found: lib/client.js may not match lib/aurora.css'
  }
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
  '    - id: theme-aurora-browser'
  '      name: dsh-theme-aurora-browser'
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
    # Remove only our insert list; the app may have appended entries inside the
    # marker range while rewriting its patch file.
    $patch = [regex]::Replace($patch, '(?m)^# >>> aurora-skin[^\r\n]*\r?\n- insert:\r?\n(?:[ ]{4}- [^\r\n]*\r?\n|[ ]{6}[^\r\n]*\r?\n)*', '')
    $patch = [regex]::Replace($patch, '(?m)^# <<< aurora-skin[^\r\n]*\r?\n?', '')
  }

  # An untouched profile ships `[]` (or nothing) as its patch list. Appending a
  # block sequence after a flow `[]` is invalid YAML, so replace the empty root
  # instead of adding to it.
  $meaningful = @($patch -split "`r?`n" | Where-Object {
      $line = $_.Trim()
      $line.Length -gt 0 -and -not $line.StartsWith('#')
    })
  if ($meaningful.Count -eq 0 -or ($meaningful.Count -eq 1 -and $meaningful[0] -eq '[]')) {
    $patch = ''
  }
  if ($patch.Length -gt 0 -and -not $patch.EndsWith("`n")) { $patch += "`n" }
  if ($patch.Trim().Length -gt 0) { $patch = $patch.TrimEnd() + "`n`n" }
  [System.IO.File]::WriteAllText($patchFile, $patch + $block + "`n", (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "patched -> $patchFile"
}

$dest = Join-Path $profileDir (Join-Path 'node_modules' 'dsh-theme-aurora')
$browserSource = Join-Path (Split-Path $source -Parent) 'aurora-browser'
$browserDest = Join-Path $profileDir (Join-Path 'node_modules' 'dsh-theme-aurora-browser')
$packages = @(
  @{ Name = 'dsh-theme-aurora'; Path = $source; Dest = $dest }
  @{ Name = 'dsh-theme-aurora-browser'; Path = $browserSource; Dest = $browserDest }
) | Where-Object { Test-Path (Join-Path $_.Path 'package.json') }

# The Desktop profile's node_modules is owned by pnpm (the app's plugin manager
# prunes anything the manifest does not declare). Declare both packages as
# `link:` dependencies and mount them as junctions instead of copying, so an
# app-driven install cannot evict the skin.
$manifestPath = Join-Path $profileDir 'package.json'
$manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json
if ($null -eq $manifest.dependencies) {
  $manifest | Add-Member -NotePropertyName dependencies -NotePropertyValue ([pscustomobject]@{}) -Force
}
foreach ($package in $packages) {
  $manifest.dependencies | Add-Member -NotePropertyName $package.Name -NotePropertyValue ("link:" + ($package.Path -replace '\\', '/')) -Force
}
$manifest | ConvertTo-Json -Depth 8 | ForEach-Object {
  [System.IO.File]::WriteAllText($manifestPath, $_ + "`n", (New-Object System.Text.UTF8Encoding($false)))
}
Write-Host "deps    -> $manifestPath"

New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
foreach ($package in $packages) {
  if (Test-Path $package.Dest) {
    $existing = Get-Item $package.Dest -Force
    if ($existing.LinkType) { $existing.Delete() } else { Remove-Item -Recurse -Force $package.Dest }
  }
  New-Item -ItemType Junction -Path $package.Dest -Target $package.Path | Out-Null
  Remove-Item -Force (Join-Path $package.Path 'lib\activity.log') -ErrorAction SilentlyContinue
  Write-Host "link    -> $($package.Dest) => $($package.Path)"
}

Write-Host ''
Write-Host 'Aurora applied.'
Write-Host 'Desktop: restart the app once (ui\restart-dsh.cmd) so the host reloads its plugin graph.'
Write-Host 'Browser (dsh web): Ctrl+R is enough.'
$undo = if ($PSScriptRoot) { "pwsh -File `"$PSScriptRoot\revert.ps1`" -ProfileName $ProfileName" } else { 'pwsh -File revert.ps1 -ProfileName ' + $ProfileName }
Write-Host "Undo anytime:  $undo"
