@echo off
rem Liuguang skin - apply to a DSH profile (default: desktop).
rem Usage: apply.cmd [profile-name]
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0apply.ps1" -ProfileName %*
if errorlevel 1 pause
