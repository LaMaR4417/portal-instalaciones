@echo off
echo ============================================
echo   CONSTRUIR Portal Instalaciones
echo ============================================
echo.

echo [1/3] Empaquetando servidor Python...
cd /d "%~dp0.."
python -m PyInstaller servidor.spec --noconfirm
if errorlevel 1 (
    echo ERROR: Fallo al empaquetar servidor Python
    pause
    exit /b 1
)

echo.
echo [2/3] Copiando servidor a portal-electron...
xcopy /E /Y /I dist\servidor\* "%~dp0python-server\*"
if errorlevel 1 (
    echo ERROR: Fallo al copiar servidor
    pause
    exit /b 1
)

echo.
echo [3/3] Construyendo instalador Electron...
cd /d "%~dp0"
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npx electron-builder --win
if errorlevel 1 (
    echo ERROR: Fallo al construir instalador
    pause
    exit /b 1
)

echo.
echo ============================================
echo   LISTO! Instalador en: dist\
echo ============================================
dir /b dist\*.exe
pause
