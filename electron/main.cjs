const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const port = 3000;
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

function waitForServer(url, retries = 60) {
  return new Promise((resolve, reject) => {
    const check = () => http.get(url, () => resolve()).on('error', () => {
      if (retries-- <= 0) reject(new Error('Vector server did not start')); else setTimeout(check, 250);
    });
    check();
  });
}

async function createWindow() {
  if (!gotLock) return;
  let server;
  if (app.isPackaged) {
    const appRoot = path.join(process.resourcesPath, 'app');
    const standaloneRoot = path.join(appRoot, '.next', 'standalone');
    const serverFile = path.join(standaloneRoot, 'server.js');
    const nextBin = path.join(appRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
    const command = require('fs').existsSync(serverFile) ? [serverFile] : [nextBin, 'start'];
    server = spawn(process.execPath, [...command, '-p', String(port)], { cwd: require('fs').existsSync(serverFile) ? standaloneRoot : appRoot, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', NODE_ENV: 'production', PORT: String(port), HOSTNAME: '127.0.0.1' }, windowsHide: true, stdio: 'ignore' });
    app.on('before-quit', () => {
      if (server && !server.killed) server.kill();
    });
  }
  const appRoot = app.isPackaged ? path.join(process.resourcesPath, 'app') : path.join(__dirname, '..');
  const win = new BrowserWindow({ width: 1440, height: 920, minWidth: 1100, minHeight: 720, backgroundColor: '#09090b', icon: path.join(appRoot, 'public', 'vector-logo.png'), autoHideMenuBar: true, webPreferences: { contextIsolation: true, nodeIntegration: false } });
  await waitForServer(`http://localhost:${port}`);
  await win.loadURL(`http://localhost:${port}`);
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}
app.on('second-instance', () => {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
});
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
