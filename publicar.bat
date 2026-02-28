@echo off
echo ============================================
echo   PUBLICAR Actualizacion
echo ============================================
echo.

REM Verificar que gh esta autenticado
gh auth status >nul 2>&1
if errorlevel 1 (
    echo ERROR: No estas autenticado en GitHub.
    echo Ejecuta: gh auth login
    pause
    exit /b 1
)

echo [1/4] Empaquetando servidor Python...
cd /d "%~dp0.."
python -m PyInstaller servidor.spec --noconfirm
if errorlevel 1 (
    echo ERROR: Fallo al empaquetar servidor Python
    pause
    exit /b 1
)

echo.
echo [2/4] Copiando servidor a portal-electron...
xcopy /E /Y /I dist\servidor\* "%~dp0python-server\*"

echo.
echo [3/4] Construyendo y publicando...
cd /d "%~dp0"
set CSC_IDENTITY_AUTO_DISCOVERY=false
set GH_TOKEN=
for /f %%i in ('gh auth token') do set GH_TOKEN=%%i
call npx electron-builder --win --publish always
if errorlevel 1 (
    echo ERROR: Fallo al publicar
    pause
    exit /b 1
)

echo.
echo [4/4] Subiendo codigo a GitHub...
git add -A
git commit -m "v%npm_package_version% - Actualizacion"
git push origin main

echo.
echo ============================================
echo   PUBLICADO! Los usuarios recibiran
echo   la actualizacion automaticamente.
echo ============================================
pause
