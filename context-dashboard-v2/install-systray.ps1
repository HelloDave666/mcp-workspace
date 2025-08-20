# ==================================================
# Installation System Tray - Context Manager Dashboard
# ==================================================

Write-Host "Installation System Tray pour Context Manager Dashboard" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# Verification du dossier
if (!(Test-Path "package.json")) {
    Write-Host "Erreur: Pas dans le bon dossier" -ForegroundColor Red
    exit
}

Write-Host "OK - Dans le bon dossier" -ForegroundColor Green

# Backup
$backupDir = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Copy-Item "electron/main.cjs" "$backupDir/main.cjs" -Force
Copy-Item "package.json" "$backupDir/package.json" -Force
Write-Host "Backup cree: $backupDir" -ForegroundColor Green

# Installation auto-launch
Write-Host "Installation auto-launch..." -ForegroundColor Yellow
npm install auto-launch --save

# Message final
Write-Host " " -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host "INSTALLATION PRESQUE TERMINEE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host " " -ForegroundColor White
Write-Host "ACTIONS MANUELLES REQUISES:" -ForegroundColor Yellow
Write-Host "1. Ouvrez electron/main.cjs dans VS Code" -ForegroundColor White
Write-Host "2. Remplacez TOUT le contenu par le code du system tray" -ForegroundColor White
Write-Host "3. Sauvegardez le fichier" -ForegroundColor White
Write-Host "4. Testez avec: npm run dev-all" -ForegroundColor White
Write-Host " " -ForegroundColor White

# Ouvrir le fichier dans VS Code
code electron/main.cjs