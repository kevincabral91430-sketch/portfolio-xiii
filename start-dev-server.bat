@echo off
title Portfolio XIII — Mode public
cd /d "%~dp0"

echo.
echo  ┌─────────────────────────────────────────┐
echo  │   Portfolio XIII — Partage public       │
echo  └─────────────────────────────────────────┘
echo.
echo  Demarrage du serveur de developpement...

REM Lancer pnpm dev en arriere-plan
start "Portfolio XIII Dev" /MIN cmd /c "pnpm dev"

REM Attendre que le serveur soit pret
echo  Attente du serveur (10 secondes)...
timeout /T 10 /NOBREAK > nul

REM Lancer le tunnel Cloudflare
echo  Ouverture du tunnel Cloudflare...
start /B "" "%LOCALAPPDATA%\cloudflared.exe" tunnel --url http://localhost:3000 --no-autoupdate 2> "%TEMP%\cloudflared-log.txt"

REM Attendre que le tunnel soit pret
timeout /T 8 /NOBREAK > nul

REM Afficher l'URL publique
echo.
powershell.exe -Command "$content = Get-Content '%TEMP%\cloudflared-log.txt' -Raw -ErrorAction SilentlyContinue; if ($content -match 'https://[a-z0-9\-]+\.trycloudflare\.com') { Write-Host '  ✓ URL PUBLIQUE : ' -NoNewline -ForegroundColor Green; Write-Host $matches[0] -ForegroundColor Cyan } else { Write-Host '  Tunnel en demarrage, patientez quelques secondes...' -ForegroundColor Yellow; Start-Sleep 5; $content2 = Get-Content '%TEMP%\cloudflared-log.txt' -Raw -ErrorAction SilentlyContinue; if ($content2 -match 'https://[a-z0-9\-]+\.trycloudflare\.com') { Write-Host '  ✓ URL PUBLIQUE : ' -NoNewline -ForegroundColor Green; Write-Host $matches[0] -ForegroundColor Cyan } else { Write-Host '  Erreur : URL non trouvee. Verifiez cloudflared.exe dans %LOCALAPPDATA%' -ForegroundColor Red } }"
echo.
echo  Copiez cette URL et partagez-la avec vos amis.
echo  Elle reste active tant que cette fenetre est ouverte.
echo.
echo  Appuyez sur une touche pour fermer le tunnel et le serveur.
pause > nul

REM Fermer cloudflared
taskkill /F /IM cloudflared.exe > nul 2>&1
echo  Tunnel ferme.
