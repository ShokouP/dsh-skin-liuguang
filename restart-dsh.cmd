@echo off
rem Restart DeepSeek Harness so the Desktop host re-reads its plugin graph.
rem The Liuguang skin needs this only once: the renderer boots from a static
rem index, and the running host caches client-plugin metadata per specifier.
setlocal
set "EXE=%LOCALAPPDATA%\Programs\DeepSeek Harness\DeepSeek Harness.exe"
if not exist "%EXE%" (
  echo DeepSeek Harness not found at "%EXE%"
  pause
  exit /b 1
)

echo Closing DeepSeek Harness...
taskkill /IM "DeepSeek Harness.exe" >nul 2>&1

rem Wait up to 20s for every process (main + renderers + host) to exit.
for /l %%i in (1,1,20) do (
  tasklist /FI "IMAGENAME eq DeepSeek Harness.exe" 2>nul | find /I "DeepSeek Harness.exe" >nul
  if errorlevel 1 goto relaunch
  timeout /t 1 /nobreak >nul
)

:relaunch
echo Starting DeepSeek Harness...
start "" "%EXE%"
echo Done. The Liuguang skin loads with the fresh host.
