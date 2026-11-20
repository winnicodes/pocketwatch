Write-Host "Starting pocketwatch container..." -ForegroundColor Cyan
docker compose up -d --pull always
Write-Host "pocketwatch läuft jetzt unter http://localhost:8080" -ForegroundColor Green
