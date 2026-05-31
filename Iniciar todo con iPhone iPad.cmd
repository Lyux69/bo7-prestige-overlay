@echo off
cd /d "%~dp0"
echo Configurando acceso para iPhone/iPad...
call "%~dp0Configurar iPhone iPad.cmd"
call "%~dp0iniciar_overlay.cmd"
