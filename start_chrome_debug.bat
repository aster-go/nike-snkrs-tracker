@echo off
echo [Nike Bot] Starting dev server (npm run dev)...
start "Nike Dev Server" cmd /k "cd /d %~dp0 && npm run dev"

ping 127.0.0.1 -n 6 >nul

echo [Nike Bot] Stopping Chrome...

echo [Nike Bot] Starting Chrome with debug port 9222...
powershell -Command "Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList '--remote-debugging-port=9222','--user-data-dir=C:\ChromeBotProfile','--no-first-run','--no-default-browser-check'"

ping 127.0.0.1 -n 5 >nul

echo [Nike Bot] Checking port 9222...
powershell -Command "$r=Test-NetConnection 127.0.0.1 -Port 9222 -WarningAction SilentlyContinue; if($r.TcpTestSucceeded){Write-Host 'Port 9222 OPEN - Chrome ready!' -ForegroundColor Green}else{Write-Host 'Port 9222 not open yet - try Connect CDP in a moment' -ForegroundColor Yellow}"

echo.
echo [Nike Bot] Opening Edge for tracker app...
start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" http://localhost:5174

echo.
echo Done! Now go to Bot tab and click Connect CDP
echo.
pause
