@echo off
echo.
echo  Registering claudecode:// protocol handler...
echo.

set "LAUNCHER=%~dp0claude-launcher.cmd"

reg add "HKCU\Software\Classes\claudecode" /ve /d "URL:Claude Code Protocol" /f >nul 2>&1
reg add "HKCU\Software\Classes\claudecode" /v "URL Protocol" /d "" /f >nul 2>&1
reg add "HKCU\Software\Classes\claudecode\DefaultIcon" /ve /d "cmd.exe,0" /f >nul 2>&1
reg add "HKCU\Software\Classes\claudecode\shell\open\command" /ve /d "\"%LAUNCHER%\" \"%%1\"" /f >nul 2>&1

echo  Done! claudecode:// links will now launch Claude Code.
echo.
echo  Handler: %LAUNCHER%
echo.
pause
