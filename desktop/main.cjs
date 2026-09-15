const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const site = path.join(__dirname, 'site');
const pages = new Set(
  ['vanilla.html', 'react.html'].map((name) => pathToFileURL(path.join(site, name)).href),
);
function external(url) {
  if (url.startsWith('https://github.com/niko-dellic/quilt')) void shell.openExternal(url);
}
function createWindow() {
  const main = new BrowserWindow({
    title: 'Quilt Demo',
    width: 1500,
    height: 950,
    minWidth: 900,
    minHeight: 650,
    backgroundColor: '#171717',
    icon: path.join(site, 'android-chrome-512x512.png'),
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  main.webContents.setWindowOpenHandler(({ url }) => {
    if (url === 'about:blank')
      return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true } };
    external(url);
    return { action: 'deny' };
  });
  main.webContents.on('will-navigate', (event, url) => {
    if (!pages.has(url)) {
      event.preventDefault();
      external(url);
    }
  });
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
  void main.loadFile(path.join(site, 'vanilla.html'));
}
app.whenReady().then(() => {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
      { role: 'fileMenu' },
      { role: 'editMenu' },
      { role: 'viewMenu' },
      { role: 'windowMenu' },
    ]),
  );
  createWindow();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on('window-all-closed', () => app.quit());
