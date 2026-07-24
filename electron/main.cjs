const { app, BrowserWindow, shell, Tray, Menu } = require("electron");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const fs = require("fs");

const port = 3000;
let mainWindow = null;
let tray = null;
let isQuitting = false;
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

function waitForServer(url, retries = 60) {
  return new Promise((resolve, reject) => {
    const check = () =>
      http
        .get(url, () => resolve())
        .on("error", () => {
          if (retries-- <= 0) reject(new Error("Vector server did not start"));
          else setTimeout(check, 250);
        });
    check();
  });
}

async function createWindow() {
  if (!gotLock) return;
  let server;
  if (app.isPackaged) {
    const appRoot = path.join(process.resourcesPath, "app");
    const standaloneRoot = path.join(appRoot, ".next", "standalone");
    const serverFile = path.join(standaloneRoot, "server.js");
    const nextBin = path.join(
      appRoot,
      "node_modules",
      "next",
      "dist",
      "bin",
      "next",
    );
    const command = fs.existsSync(serverFile)
      ? [serverFile]
      : [nextBin, "start"];
    const logFile = path.join(app.getPath("userData"), "vector-server.log");
    const logStream = fs.createWriteStream(logFile, { flags: "a" });
    server = spawn(process.execPath, [...command, "-p", String(port)], {
      cwd: fs.existsSync(serverFile) ? standaloneRoot : appRoot,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1",
        NODE_ENV: "production",
        PORT: String(port),
        HOSTNAME: "127.0.0.1",
      },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout.pipe(logStream);
    server.stderr.pipe(logStream);
    app.on("before-quit", () => {
      if (server && !server.killed) server.kill();
    });
  }
  const appRoot = app.isPackaged
    ? path.join(process.resourcesPath, "app")
    : path.join(__dirname, "..");
  const iconPath = path.join(appRoot, "public", "vector-logo.png");
  const win = new BrowserWindow({
    show: false,
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#09090b",
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  mainWindow = win;
  try {
    await waitForServer(`http://127.0.0.1:${port}`);
    await win.loadURL(`http://127.0.0.1:${port}`);
  } catch (error) {
    const detail = String(
      error && error.message ? error.message : error,
    ).replace(/[<>&]/g, "");
    await win.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(`<body style="margin:0;background:#09090b;color:#e4e4e7;font-family:Segoe UI,sans-serif;display:grid;place-items:center;height:100vh"><main style="max-width:520px;padding:32px"><h2>Vector failed to start</h2><p style="color:#a1a1aa;line-height:1.7">${detail}</p><p style="color:#71717a;font-size:13px">Close Vector and open it again. Diagnostic details are saved in vector-server.log.</p></main></body>`)}`,
    );
  }
  if (!win.isDestroyed()) win.show();
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  win.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });
  win.on("closed", () => {
    mainWindow = null;
  });

  if (!tray) {
    tray = new Tray(iconPath);
    tray.setToolTip("Vector — Research Automation Platform");
    tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: "打开 Vector",
          click: () => {
            if (mainWindow) {
              mainWindow.show();
              mainWindow.focus();
            }
          },
        },
        { type: "separator" },
        {
          label: "退出 Vector",
          click: () => {
            isQuitting = true;
            app.quit();
          },
        },
      ]),
    );
    tray.on("double-click", () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  }
}
app.on("second-instance", () => {
  const win = mainWindow || BrowserWindow.getAllWindows()[0];
  if (win) {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }
});
app.whenReady().then(() => {
  if (app.isPackaged)
    app.setLoginItemSettings({ openAtLogin: true, path: process.execPath });
  return createWindow();
});
app.on("before-quit", () => {
  isQuitting = true;
});
app.on("window-all-closed", () => {});
