# Portfolio XIII — Relance automatique au reveil de veille
# Ce script surveille les evenements de reveil Windows et relance pnpm dev si besoin

$projectPath = $PSScriptRoot
$port = 3000

function Start-DevServer {
    $running = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if (-not $running) {
        Write-Host "[Portfolio XIII] Serveur non detecte — demarrage..."
        Start-Process -FilePath "cmd.exe" `
            -ArgumentList "/c title Portfolio XIII Dev Server && cd /d `"$projectPath`" && pnpm dev" `
            -WindowStyle Normal
    } else {
        Write-Host "[Portfolio XIII] Serveur deja actif sur le port $port."
    }
}

Write-Host "[Portfolio XIII] Surveillance des evenements de reveil..."
Write-Host "Appuyez sur Ctrl+C pour arreter."

# Surveiller les evenements Power (reveil de veille)
$query = "SELECT * FROM Win32_PowerManagementEvent WHERE EventType = 7"
$watcher = New-Object System.Management.ManagementEventWatcher
$watcher.Query = New-Object System.Management.WqlEventQuery($query)
$watcher.Options.Timeout = [System.TimeSpan]::MaxValue

$watcher.Start()

while ($true) {
    try {
        $event = $watcher.WaitForNextEvent()
        Write-Host "[Portfolio XIII] Reveil detecte — verification du serveur dans 10s..."
        Start-Sleep -Seconds 10
        Start-DevServer
    } catch {
        Write-Host "[Portfolio XIII] Arret du watcher."
        break
    }
}

$watcher.Stop()
