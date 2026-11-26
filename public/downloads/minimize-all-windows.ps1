# Minimize all open windows every five seconds. Press Ctrl+C to stop.
while ($true) {
    (New-Object -ComObject Shell.Application).MinimizeAll()
    Start-Sleep -Seconds 5
}
