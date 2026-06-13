# Check if .env exists
if (Test-Path ".env") {
    Write-Host "Loading environment variables from .env..." -ForegroundColor Green
    Get-Content .env | Where-Object { $_ -notmatch "^#" -and $_ -match "=" } | ForEach-Object {
        $name, $value = $_.Split('=', 2)
        [System.Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim(), "Process")
    }
} else {
    Write-Host "Error: .env file not found in the root directory!" -ForegroundColor Red
    exit 1
}

# Run the backend Spring Boot application
Write-Host "Starting Spring Boot Backend..." -ForegroundColor Cyan
cd backend
.\mvnw.cmd spring-boot:run
