const { app, BrowserWindow } = require('electron');
console.log('app:', typeof app);
app.whenReady().then(() => {
  console.log('READY');
  const win = new BrowserWindow({ width: 400, height: 300 });
  win.loadURL('data:text/html,<h1>TEST</h1>');
  setTimeout(() => app.quit(), 3000);
});
