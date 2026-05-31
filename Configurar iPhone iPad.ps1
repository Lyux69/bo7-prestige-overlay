$ErrorActionPreference = "Stop"

$wslIp = (wsl.exe -e sh -lc "hostname -I").Trim().Split(" ")[0]
$pcIp = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.InterfaceAlias -notlike "vEthernet*" -and $_.PrefixOrigin -ne "WellKnown" } |
  Select-Object -First 1 -ExpandProperty IPAddress

if (-not $wslIp) { throw "No se pudo detectar la IP de WSL." }
if (-not $pcIp) { throw "No se pudo detectar la IP local del PC." }

netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=8765 2>$null | Out-Null
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=8765 connectaddress=$wslIp connectport=8765 | Out-Null

if (-not (Get-NetFirewallRule -DisplayName BO7-Overlay-8765 -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName BO7-Overlay-8765 -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8765 | Out-Null
}

Write-Host "Configuracion lista."
Write-Host "Servidor WSL: http://$wslIp`:8765"
Write-Host "Abre en iPhone/iPad: http://$pcIp`:8765/admin.html"
Write-Host "Overlay: http://$pcIp`:8765/index.html"
pause
