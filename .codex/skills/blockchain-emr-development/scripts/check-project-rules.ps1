param(
    [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
)

$ErrorActionPreference = "Stop"
$violations = [System.Collections.Generic.List[string]]::new()
$backend = Join-Path $ProjectRoot "backend"

$yamlConfigs = Get-ChildItem -Path (Join-Path $backend "src") -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^application.*\.ya?ml$' }
foreach ($file in $yamlConfigs) {
    $violations.Add("Use .properties instead of YAML: $($file.FullName)")
}

$propertiesFiles = Get-ChildItem -Path (Join-Path $backend "src") -Recurse -Filter "application*.properties" -File -ErrorAction SilentlyContinue
foreach ($file in $propertiesFiles) {
    $invalidDdl = Select-String -Path $file.FullName -Pattern 'spring\.jpa\.hibernate\.ddl-auto\s*=\s*(create|create-drop|update)\s*$'
    foreach ($match in $invalidDdl) {
        $violations.Add("Flyway must own schema changes: $($file.FullName):$($match.LineNumber)")
    }
}

$migrationDir = Join-Path $backend "src\main\resources\db\migration"
$migrations = Get-ChildItem -Path $migrationDir -File -ErrorAction SilentlyContinue
foreach ($file in $migrations) {
    if ($file.Name -notmatch '^V[0-9]+__[A-Za-z0-9_]+\.sql$') {
        $violations.Add("Invalid Flyway migration name: $($file.FullName)")
    }
}

$domainFiles = Get-ChildItem -Path (Join-Path $backend "src\main\java") -Recurse -Filter "*.java" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match '\\domain\\' }
foreach ($file in $domainFiles) {
    $uuidId = Select-String -Path $file.FullName -Pattern 'GenerationType\.UUID|@UuidGenerator'
    foreach ($match in $uuidId) {
        $violations.Add("Relational entities must use Long auto-increment IDs: $($file.FullName):$($match.LineNumber)")
    }
}

if ($violations.Count -gt 0) {
    Write-Host "Project rule check failed:" -ForegroundColor Red
    $violations | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
    exit 1
}

Write-Host "Project rule check passed." -ForegroundColor Green

