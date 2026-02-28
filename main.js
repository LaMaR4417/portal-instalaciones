const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

// --- Configuracion ---
const SERVER_PORT = 5000;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

let splashWindow = null;
let mainWindow = null;
let pythonProcess = null;

// --- Paths ---
function getPythonServerPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'python-server', 'servidor.exe');
  }
  // En desarrollo, usar el servidor Python directamente
  return null;
}

function getPythonServerDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'python-server');
  }
  return path.join(__dirname, '..'); // Directorio del proyecto original
}

// --- Splash Screen ---
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 340,
    frame: false,
    transparent: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  splashWindow.loadFile('splash.html');
  splashWindow.center();
}

// --- Main Window ---
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Portal Instalaciones',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadURL(SERVER_URL);

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    cleanup();
    app.quit();
  });

  // Quitar menu bar
  mainWindow.setMenuBarVisibility(false);
}

// --- Python Server ---
function startPythonServer() {
  return new Promise((resolve, reject) => {
    const serverExe = getPythonServerPath();
    const serverDir = getPythonServerDir();

    if (serverExe) {
      // Produccion: usar el .exe empaquetado
      pythonProcess = spawn(serverExe, ['--no-browser', '--localhost-only'], {
        cwd: path.join(serverDir, '_internal'),
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true
      });
    } else {
      // Desarrollo: usar python directamente
      pythonProcess = spawn('python', [
        path.join(serverDir, 'servidor_portales.py'),
        '--no-browser', '--localhost-only'
      ], {
        cwd: serverDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true
      });
    }

    let serverReady = false;

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('[Python]', output.trim());

      // Detectar señales del servidor
      if (output.includes('SYNC_START')) {
        sendToSplash('status', 'Sincronizando datos...');
        sendToSplash('progress', 20);
      }
      if (output.includes('Sincronizando DocumentLogger')) {
        sendToSplash('status', 'Sincronizando documentos...');
        sendToSplash('progress', 40);
      }
      if (output.includes('Sincronizando PaymentLogger')) {
        sendToSplash('status', 'Sincronizando pagos...');
        sendToSplash('progress', 55);
      }
      if (output.includes('Sincronizando ServiceLogger')) {
        sendToSplash('status', 'Sincronizando servicios...');
        sendToSplash('progress', 70);
      }
      if (output.includes('SYNC_DONE')) {
        sendToSplash('status', 'Iniciando portal...');
        sendToSplash('progress', 90);
      }
      if (output.includes('SERVER_READY') && !serverReady) {
        serverReady = true;
        sendToSplash('status', 'Listo!');
        sendToSplash('progress', 100);
        resolve();
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error('[Python Error]', data.toString().trim());
    });

    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python server:', err);
      reject(err);
    });

    pythonProcess.on('exit', (code) => {
      console.log(`Python server exited with code ${code}`);
      if (!serverReady) {
        reject(new Error(`Server exited with code ${code}`));
      }
    });

    // Timeout: si en 60s no arranca, usar datos locales
    setTimeout(() => {
      if (!serverReady) {
        console.log('Server startup timeout, checking if it responds...');
        checkServerReady()
          .then(() => {
            serverReady = true;
            resolve();
          })
          .catch(() => reject(new Error('Server did not start in time')));
      }
    }, 60000);
  });
}

function checkServerReady() {
  return new Promise((resolve, reject) => {
    http.get(SERVER_URL, (res) => {
      resolve();
    }).on('error', () => {
      reject();
    });
  });
}

// --- Auto Updates ---
function checkForUpdates() {
  sendToSplash('status', 'Verificando actualizaciones...');
  sendToSplash('progress', 5);

  try {
    const { autoUpdater } = require('electron-updater');

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
      sendToSplash('status', 'Verificando actualizaciones...');
    });

    autoUpdater.on('update-available', (info) => {
      sendToSplash('status', `Descargando actualizacion v${info.version}...`);
      sendToSplash('progress', 10);
    });

    autoUpdater.on('download-progress', (progress) => {
      const pct = Math.round(progress.percent);
      sendToSplash('status', `Descargando actualizacion... ${pct}%`);
      sendToSplash('progress', Math.min(15, 5 + pct * 0.1));
    });

    autoUpdater.on('update-downloaded', (info) => {
      sendToSplash('status', 'Actualizacion lista. Reiniciando...');
      sendToSplash('progress', 18);
      setTimeout(() => {
        autoUpdater.quitAndInstall(false, true);
      }, 2000);
    });

    autoUpdater.on('update-not-available', () => {
      sendToSplash('status', 'App actualizada.');
      sendToSplash('progress', 15);
    });

    autoUpdater.on('error', (err) => {
      console.log('Auto-update error (ignored):', err.message);
      sendToSplash('status', 'Iniciando...');
      sendToSplash('progress', 15);
    });

    return autoUpdater.checkForUpdates().catch(() => {
      console.log('Auto-update check failed, continuing...');
    });
  } catch (err) {
    console.log('Auto-updater not available:', err.message);
    sendToSplash('progress', 15);
    return Promise.resolve();
  }
}

// --- IPC Helpers ---
function sendToSplash(channel, data) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send(channel, data);
  }
}

// --- Cleanup ---
function cleanup() {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
}

// --- App Lifecycle ---
app.whenReady().then(async () => {
  createSplashWindow();

  try {
    // 1. Check for updates (non-blocking si falla)
    await checkForUpdates();

    // 2. Start Python server (con sync de Cosmos)
    await startPythonServer();

    // 3. Open main window
    setTimeout(() => createMainWindow(), 500);

  } catch (err) {
    console.error('Startup error:', err);
    sendToSplash('status', 'Error al iniciar. Reintentando...');

    // Intentar abrir de todos modos si el servidor responde
    try {
      await checkServerReady();
      setTimeout(() => createMainWindow(), 500);
    } catch {
      sendToSplash('status', 'Error: No se pudo iniciar el servidor.');
    }
  }
});

app.on('window-all-closed', () => {
  cleanup();
  app.quit();
});

app.on('before-quit', () => {
  cleanup();
});

// Prevenir segunda instancia
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
