trap {
    Write-Host "`nStopping Docker containers..."
    docker compose -f .\backend\docker-compose.yml down
    Write-Host "Docker stopped."
    break
}

Write-Host "Starting Doc Intelligence System..."

# -----------------------------
# Start Docker backend services
# -----------------------------
Write-Host "Starting Docker backend services..."
docker compose -f .\backend\docker-compose.yml up -d

Start-Sleep -Seconds 3

# -----------------------------
# Start Next.js Frontend
# -----------------------------
Write-Host "Starting Next.js frontend..."

$frontend = Start-Process `
    -FilePath "npm.cmd" `
    -ArgumentList "run", "dev" `
    -WorkingDirectory ".\frontend" `
    -PassThru

Start-Sleep -Seconds 3

Write-Host "Backend running at http://localhost:8000"
Write-Host "Frontend running at http://localhost:3000"
Write-Host "Doc Intelligence System Ready."

Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "Press CTRL+C to stop everything."

Wait-Process -Id $frontend.Id

Write-Host "Stopping TaskForge System..."
docker compose -f .\backend\docker-compose.yml down
Write-Host "Docker stopped."