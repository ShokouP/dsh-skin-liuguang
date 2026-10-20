@echo off
rem Liuguang skin - revert from a DSH profile (default: desktop).
rem Usage: revert.cmd [profile-name]
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0revert.ps1" -ProfileName %*
if errorlevel 1 pause
