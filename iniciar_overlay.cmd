@echo off
cd /d "%~dp0"
title BO7 Prestige Overlay - Inicio Rapido

echo Comprobando servidor del overlay...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:8765/admin.html' -TimeoutSec 1; if($r.StatusCode -eq 200){ exit 0 } } catch {}; exit 1"

if errorlevel 1 (
  echo Iniciando servidor del overlay...
  start "" powershell.exe -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp0server.ps1"
) else (
  echo El servidor ya estaba iniciado.
)

echo Esperando a que el servidor responda...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ok=$false; for($i=0;$i -lt 20;$i++){ try { $r=Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:8765/admin.html' -TimeoutSec 1; if($r.StatusCode -eq 200){ $ok=$true; break } } catch {}; Start-Sleep -Milliseconds 500 }; if(-not $ok){ exit 1 }"

if errorlevel 1 (
  echo No se pudo iniciar el servidor. Revisa la ventana BO7 Overlay Server.
  pause
  exit /b 1
)

echo Abriendo panel de control...
start "" "http://localhost:8765/admin.html"

echo Abriendo OBS...
powershell.exe -NoProfile -Command "Start-Process -FilePath 'C:\Program Files\obs-studio\bin\64bit\obs64.exe' -WorkingDirectory 'C:\Program Files\obs-studio\bin\64bit'"

echo.
echo Listo. Deja abierta la ventana BO7 Overlay Server mientras uses OBS.
echo Para iPhone/iPad, usa: http://192.168.2.104:8765/admin.html
pause
