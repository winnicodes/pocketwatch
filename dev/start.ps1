docker compose -f "$PSScriptRoot/../docker-compose.yaml" up -d --pull always
Write-Host "pocketwatch: http://localhost:8080"
