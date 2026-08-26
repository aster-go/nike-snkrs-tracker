# Nike SNKRS Bot — Start Chrome with CDP debug port
# Run as: powershell -ExecutionPolicy Bypass -File start_chrome_debug.ps1

$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$profileDir = "C:\Users\Administrator\AppData\Local\Google\Chrome\User Data"
$debugPort  = 9222
$appUrl     = "http://localhost:5174"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Nike SNKRS Bot — Starting Chrome (Debug Mode)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Kill ALL Chrome processes
Write-Host "`n[1/4] Killing all Chrome processes..." -ForegroundColor Yellow
Get-Process -Name chrome -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Verify Chrome is dead
$still = Get-Process -Name chrome -ErrorAction SilentlyContinue
if ($still) {
    Write-Host "     Force-killing remaining Chrome..." -ForegroundColor Yellow
    $still | Stop-Process -Force
    Start-Sleep -Seconds 2
}
Write-Host "     Chrome closed." -ForegroundColor Green

# 2. Start Chrome with debug port
Write-Host "`n[2/4] Starting Chrome with --remote-debugging-port=$debugPort ..." -ForegroundColor Yellow

$chromeArgs = @(
    "--remote-debugging-port=$debugPort",
    "--user-data-dir=`"$profileDir`"",
    "--disable-blink-features=AutomationControlled",
    "--no-first-run",
    "--no-default-browser-check",
    $appUrl
)

$proc = Start-Process -FilePath $chromePath -ArgumentList $chromeArgs -PassThru
Write-Host "     Chrome started (PID: $($proc.Id))" -ForegroundColor Green

# 3. Wait and verify port is open
Write-Host "`n[3/4] Waiting for Chrome to open debug port..." -ForegroundColor Yellow
$maxWait = 10
$portOpen = $false
for ($i = 1; $i -le $maxWait; $i++) {
    Start-Sleep -Seconds 1
    $test = Test-NetConnection -ComputerName 127.0.0.1 -Port $debugPort -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($test.TcpTestSucceeded) {
        $portOpen = $true
        Write-Host "     Port $debugPort is OPEN after $i seconds!" -ForegroundColor Green
        break
    }
    Write-Host "     Waiting... ($i/$maxWait)" -ForegroundColor Gray
}

if (-not $portOpen) {
    Write-Host "`n  ERROR: Port $debugPort did not open!" -ForegroundColor Red
    Write-Host "  Check if Windows Firewall is blocking port $debugPort" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# 4. Verify Chrome debug endpoint
Write-Host "`n[4/4] Verifying Chrome CDP endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$debugPort/json/version" -UseBasicParsing -TimeoutSec 5
    $json = $response.Content | ConvertFrom-Json
    Write-Host "     Browser: $($json.Browser)" -ForegroundColor Green
    Write-Host "     WebSocket: $($json.webSocketDebuggerUrl)" -ForegroundColor Green
} catch {
    Write-Host "     Warning: Could not verify endpoint: $_" -ForegroundColor Yellow
}

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "  Chrome is ready for Bot!" -ForegroundColor Green
Write-Host "  -> Go to Bot tab in the app" -ForegroundColor White
Write-Host "  -> Click 'Connect CDP'" -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to close"
