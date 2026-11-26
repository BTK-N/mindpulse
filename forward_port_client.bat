@echo off
title MindPulse Public Client Forward Tunnel
echo ========================================================
echo MindPulse Permanent Public Forward Tunnel
echo Public URL: https://mindpulse.serveousercontent.com/?serveo-skip-browser-warning=true
echo Local:      http://127.0.0.1:5173 (Frontend + API Proxy)
echo ========================================================

set "PATH=C:\Windows\System32\OpenSSH;%PATH%"

:loop
echo Connecting to Serveo with permanent domain 'mindpulse'...
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -R mindpulse:80:127.0.0.1:5173 serveo.net
echo Connection lost. Reconnecting in 3 seconds...
timeout /t 3 /nobreak >nul
goto loop
