const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onStatus: (callback) => ipcRenderer.on('status', (_, msg) => callback(msg)),
  onProgress: (callback) => ipcRenderer.on('progress', (_, pct) => callback(pct))
});
