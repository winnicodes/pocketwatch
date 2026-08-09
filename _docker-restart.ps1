Write-Host "Restarting pocketwatch container..." -ForegroundColor Yellow
docker compose down
docker compose up -d
Write-Host "Restart complete! App läuft wieder auf http://localhost:8080" -ForegroundColor Green
