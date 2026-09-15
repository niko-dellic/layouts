const { app, BrowserWindow } = require('electron');
const path = require('node:path');

function createWindow() {
  const main = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  main.webContents.setWindowOpenHandler(({ url }) =>
    url === 'about:blank'
      ? { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true } }
      : { action: 'deny' },
  );
  main.webContents.on('will-navigate', (event) => event.preventDefault());
  const companions = new Set();
  main.webContents.on('did-create-window', (child) => {
    companions.add(child);
    child.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    child.webContents.on('will-navigate', (event) => event.preventDefault());
    child.on('closed', () => companions.delete(child));
  });
  main.on('closed', () => {
    for (const child of companions) if (!child.isDestroyed()) child.destroy();
  });
  main.loadFile(path.join(__dirname, 'dist/index.html'));
}
app.whenReady().then(createWindow);
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on('window-all-closed', () => app.quit());
