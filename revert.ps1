<#
  Revert the Liuguang skin for one DSH profile.

  Removes the marked patch block and the installed package; the host watches the
  patch file, so the plugin unloads without a restart. Refresh the page to see
  the stock UI again. The one-time backup (*.lg-backup) is left in place.
#>
[CmdletBinding()]
param(
  [string]$ProfileName = 'desktop',
  [switch]$RestoreBackup
)

$ErrorActionPreference = 'Stop'

$dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
$profileDir = Join-Path $dshHome (Join-Path 'profiles' $ProfileName)
$patchFile = Join-Path $profileDir 'cordis.patch.yml'
$dest = Join-Path $profileDir (Join-Path 'node_modules' 'dsh-theme-liuguang')
$browserDest = Join-Path $profileDir (Join-Path 'node_modules' 'dsh-theme-liuguang-browser')

if (Test-Path $patchFile) {
  $patch = [System.IO.File]::ReadAllText($patchFile)
  # Remove ONLY our own insert list. The app may have appended entries inside
  # the marker range (it rewrites the file from its patch list), so a greedy
  # "^# >>> ... ^# <<<" match would delete the user's own entries.
  $stripped = [regex]::Replace($patch, '(?m)^# >>> liuguang-skin[^\r\n]*\r?\n- insert:\r?\n(?:[ ]{4}- [^\r\n]*\r?\n|[ ]{6}[^\r\n]*\r?\n)*', '')
  $stripped = [regex]::Replace($stripped, '(?m)^# <<< liuguang-skin[^\r\n]*\r?\n?', '')
  if ($stripped -ne $patch) {
    $remaining = @($stripped -split "`r?`n" | Where-Object {
        $line = $_.Trim()
        $line.Length -gt 0 -and -not $line.StartsWith('#')
      })
    # Leave a valid (possibly empty) root list behind.
    $text = if ($remaining.Count -eq 0) { "[]`n" } else { $stripped.TrimEnd() + "`n" }
    [System.IO.File]::WriteAllText($patchFile, $text, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "unpatched -> $patchFile"
  } else {
    Write-Host "no liuguang block in $patchFile"
  }
}

foreach ($package in @($dest, $browserDest)) {
  if (Test-Path $package) {
    $existing = Get-Item $package -Force
    if ($existing.LinkType) { $existing.Delete() } else { Remove-Item -Recurse -Force $package }
    Write-Host "removed  -> $package"
  }
}

# Drop the `link:` dependencies the skin declared and its bundle registration,
# so the app's next install stops mounting it.
$manifestPath = Join-Path $profileDir 'package.json'
if (Test-Path $manifestPath) {
  $manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json
  $changed = $false
  foreach ($name in @('dsh-theme-liuguang', 'dsh-theme-liuguang-browser')) {
    if ($manifest.dependencies -and ($manifest.dependencies.PSObject.Properties.Name -contains $name)) {
      $manifest.dependencies.PSObject.Properties.Remove($name)
      $changed = $true
    }
  }
  if ($manifest.dsh -and $manifest.dsh.profile -and $manifest.dsh.profile.bundles) {
    $kept = @($manifest.dsh.profile.bundles | Where-Object { $_ -ne 'dsh-theme-liuguang' })
    if ($kept.Count -ne @($manifest.dsh.profile.bundles).Count) {
      $manifest.dsh.profile.bundles = $kept
      $changed = $true
    }
  }
  if ($changed) {
    $manifest | ConvertTo-Json -Depth 8 | ForEach-Object {
      [System.IO.File]::WriteAllText($manifestPath, $_ + "`n", (New-Object System.Text.UTF8Encoding($false)))
    }
    Write-Host "manifest -> $manifestPath (deps + bundle entry removed)"
  }
}

if ($RestoreBackup) {
  $backup = "$patchFile.lg-backup"
  if (Test-Path $backup) {
    Copy-Item -Force $backup $patchFile
    Write-Host "restored -> $patchFile (from $backup)"
  } else {
    Write-Host "no backup to restore"
  }
}

Write-Host ''
Write-Host 'Liuguang reverted. Refresh the GUI to confirm the stock skin is back.'
