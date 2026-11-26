@echo off
rem Minimize all open windows every five seconds until this script is stopped.
:repeat
powershell.exe -NoProfile -Command "(New-Object -ComObject Shell.Application).MinimizeAll()"
timeout /t 5 /nobreak >nul
goto repeat
