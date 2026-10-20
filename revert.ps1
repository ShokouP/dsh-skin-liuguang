<#
  Revert the Aurora skin for one DSH profile.

  Removes the marked patch block and the installed package; the host watches the
  patch file, so the plugin unloads without a restart. Refresh the page to see
  the stock UI again. The one-time backup (*.aurora-backup) is left in place.
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
$dest = Join-Path $profileDir (Join-Path 'node_modules' 'dsh-theme-aurora')

if (Test-Path $patchFile) {
  $patch = [System.IO.File]::ReadAllText($patchFile)
  $stripped = [regex]::Replace($patch, '(?ms)^# >>> aurora-skin.*?^# <<< aurora-skin\r?\n?', '')
  if ($stripped -ne $patch) {
    [System.IO.File]::WriteAllText($patchFile, $stripped.TrimEnd() + "`n", (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "unpatched -> $patchFile"
  } else {
    Write-Host "no aurora block in $patchFile"
  }
}

if (Test-Path $dest) {
  Remove-Item -Recurse -Force $dest
  Write-Host "removed  -> $dest"
} else {
  Write-Host "package not installed in $profileDir"
}

if ($RestoreBackup) {
  $backup = "$patchFile.aurora-backup"
  if (Test-Path $backup) {
    Copy-Item -Force $backup $patchFile
    Write-Host "restored -> $patchFile (from $backup)"
  } else {
    Write-Host "no backup to restore"
  }
}

Write-Host ''
Write-Host 'Aurora reverted. Refresh the GUI to confirm the stock skin is back.'
