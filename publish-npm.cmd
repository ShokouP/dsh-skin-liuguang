@echo off
rem Publish both Liuguang packages to npm with a one-time password.
rem Usage:  publish-npm.cmd <6-digit-otp>
setlocal
if "%~1"=="" (
  echo usage: publish-npm.cmd ^<6-digit-otp^>
  exit /b 1
)
cd /d D:\yangchengcup\ui\liuguang-browser || exit /b 1
echo [1/2] dsh-theme-liuguang-browser
call npm publish --access public --otp=%1
if errorlevel 1 exit /b 1
cd /d D:\yangchengcup\ui\liuguang || exit /b 1
echo [2/2] dsh-theme-liuguang
call npm publish --access public --otp=%1
if errorlevel 1 exit /b 1
echo published both packages
