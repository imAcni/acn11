@echo off
rem Minimize all open windows to show the desktop.
powershell.exe -NoProfile -Command "(New-Object -ComObject Shell.Application).MinimizeAll()"
