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

# The skin now ships its own bundle patch (aurora/cordis.patch.yml), the same
# way dsh-market / dsh-snippets / dsh-deep-whale do. Older installs wrote an
# insert block straight into the profile patch; remove that legacy block so the
# two paths never produce duplicate entries.
$markerStart = '# >>> aurora-skin (managed by ui/apply.ps1 - remove with ui/revert.ps1)'
$patch = [System.IO.File]::ReadAllText($patchFile)
if ($patch.Contains($markerStart)) {
  $backup = "$patchFile.aurora-backup"
  if (-not (Test-Path $backup)) {
    Copy-Item $patchFile $backup
    Write-Host "backup  -> $backup"
  }
  $patch = [regex]::Replace($patch, '(?m)^# >>> aurora-skin[^\r\n]*\r?\n- insert:\r?\n(?:[ ]{4}- [^\r\n]*\r?\n|[ ]{6}[^\r\n]*\r?\n)*', '')
  $patch = [regex]::Replace($patch, '(?m)^# <<< aurora-skin[^\r\n]*\r?\n?', '')
  $remaining = @($patch -split "`r?`n" | Where-Object {
      $line = $_.Trim()
      $line.Length -gt 0 -and -not $line.StartsWith('#')
    })
  $text = if ($remaining.Count -eq 0) { "[]`n" } else { $patch.TrimEnd() + "`n" }
  [System.IO.File]::WriteAllText($patchFile, $text, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "legacy patch block removed -> $patchFile"
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
# Register the bundle so the loader applies aurora/cordis.patch.yml itself
# (idempotent: only appended when missing).
$bundleName = 'dsh-theme-aurora'
$bundles = @($manifest.dsh.profile.bundles)
if ($bundles -notcontains $bundleName) {
  $bundles += $bundleName
  $manifest.dsh.profile.bundles = $bundles
  Write-Host "bundle  -> $bundleName (dsh.profile.bundles)"
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
