Write-Host "Cleaning up pocketwatch containers and networks..." -ForegroundColor Red
# Kein "docker system prune -f" - das loescht auch fremde Images und Netze.
# Kein "--volumes" - data/ soll ein Cleanup ueberleben.
docker compose down --remove-orphans
Write-Host "Cleanup done. (data/ bleibt erhalten)" -ForegroundColor Green
