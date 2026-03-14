@echo off
setlocal enabledelayedexpansion

:: Claude Code launcher — called by claudecode:// protocol handler
:: Receives URL like: claudecode:C:/Users/vsoko/Projects/therapy-desk

set "url=%~1"

:: Strip protocol prefix
set "dir=!url:claudecode:=!"

:: Remove leading slashes (browsers may add them)
:strip
if "!dir:~0,1!"=="/" set "dir=!dir:~1!" & goto strip

:: Convert forward slashes to backslashes
set "dir=!dir:/=\!"

:: URL-decode spaces
set "dir=!dir:%%20= !"

:: Launch Windows Terminal with Claude Code
start "" wt.exe -d "!dir!" cmd /k claude "/orchestrator next"
