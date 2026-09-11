process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const dns = require('dns');

let mainWindow = null;

const DATA_DIR = path.resolve(__dirname, '../local-data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1200,
    minHeight: 700,
    title: 'Pharmacy Inventory & POS Billing Desktop',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  const isDev = !app.isPackaged;
  const startUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../client/dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  let isQuitting = false;

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'warning',
        buttons: ['Cancel', 'Yes, Exit Application'],
        defaultId: 0,
        cancelId: 0,
        title: 'Pharmacy System Exit',
        message: 'Are you sure you want to close Pharmacy Inventory & POS Billing System?',
        detail: 'Any active transactions or billing drafts may be lost.',
        noLink: true,
        normalizeAccessKeys: true
      });
      if (choice === 1) {
        isQuitting = true;
        app.quit();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startEmbeddedBackendServer() {
  // In development mode, the server is run concurrently by nodemon/ts-node (npm run dev:server).
  // Only launch embedded backend server in production when packaged as an executable.
  if (!app.isPackaged) {
    return false;
  }

  const possiblePaths = [
    path.join(process.resourcesPath || '', 'app/server/dist/server.js'),
    path.join(process.resourcesPath || '', 'server/dist/server.js'),
    path.join(__dirname, '../server/dist/server.js')
  ];

  for (const serverPath of possiblePaths) {
    if (fs.existsSync(serverPath)) {
      try {
        console.log(`🚀 Launching embedded API server from: ${serverPath}`);
        require(serverPath);
        return true;
      } catch (err) {
        if (err && err.code === 'EADDRINUSE') {
          console.log('ℹ️ Pharmacy API server already active on port 5000.');
          return true;
        }
        console.error('⚠️ Could not launch embedded backend server:', err);
      }
    }
  }
  console.warn('⚠️ Compiled server.js not found for embedded launch.');
  return false;
}

app.whenReady().then(() => {
  ensureDataDir();
  startEmbeddedBackendServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handler: Print Invoice
ipcMain.handle('print-invoice', async (event, htmlContent) => {
  let workerWindow = new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });

  const htmlDataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
  await workerWindow.loadURL(htmlDataUrl);

  return new Promise((resolve) => {
    workerWindow.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
      workerWindow.close();
      workerWindow = null;
      if (success) {
        resolve({ success: true });
      } else {
        console.warn('Print canceled or failed:', failureReason);
        resolve({ success: false, reason: failureReason || 'Printer dialog closed' });
      }
    });
  });
});

// IPC Handler: Get Printers
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  try {
    const printers = await mainWindow.webContents.getPrintersAsync();
    return printers;
  } catch (err) {
    console.error('Error fetching system printers:', err);
    return [];
  }
});

// Set public DNS servers for Electron main process to ensure DNS lookup reliability on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (dnsErr) { }

async function checkInternetConnectivity() {
  return new Promise((resolve) => {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    } catch (e) { }

    // 1. Try dns.resolve4 with public DNS configured
    dns.resolve4('google.com', (err1) => {
      if (!err1) return resolve(true);
      dns.resolve4('cloudflare.com', (err2) => {
        if (!err2) return resolve(true);
        // 2. Fallback to dns.lookup
        dns.lookup('google.com', (err3) => {
          if (!err3) return resolve(true);
          // 3. Fallback to HTTP ping check
          const http = require('http');
          const req = http.get('http://1.1.1.1', { timeout: 3000 }, (res) => {
            req.destroy();
            resolve(true);
          });
          req.on('error', () => resolve(false));
          req.on('timeout', () => { req.destroy(); resolve(false); });
        });
      });
    });
  });
}

// IPC Handler: Connectivity Check
ipcMain.handle('check-internet', async () => {
  return await checkInternetConnectivity();
});

let lastConnectivityState = null;
setInterval(async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const currentStatus = await checkInternetConnectivity();
  if (lastConnectivityState !== currentStatus) {
    lastConnectivityState = currentStatus;
    mainWindow.webContents.send('connectivity-status', currentStatus);
  }
}, 10000);

// IPC Handlers: Controlled & Sanitized Local JSON Operations
const ALLOWED_JSON_FILES = new Set([
  'medicines.json',
  'bills.json',
  'settings.json',
  'sync-queue.json',
  'users.json',
  'categories.json',
  'session.json',
  'stock-movements.json',
  'held-bills.json'
]);

ipcMain.handle('read-local-json', async (event, filename) => {
  if (typeof filename !== 'string' || !ALLOWED_JSON_FILES.has(path.basename(filename))) {
    console.warn(`⚠️ Rejected unauthorized IPC read attempt for filename: ${filename}`);
    return null;
  }
  ensureDataDir();
  const filePath = path.join(DATA_DIR, path.basename(filename));
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Local JSON read error for ${filename}:`, err);
    return null;
  }
});

ipcMain.handle('write-local-json', async (event, filename, data) => {
  if (typeof filename !== 'string' || !ALLOWED_JSON_FILES.has(path.basename(filename))) {
    console.warn(`⚠️ Rejected unauthorized IPC write attempt for filename: ${filename}`);
    return false;
  }
  ensureDataDir();
  const filePath = path.join(DATA_DIR, path.basename(filename));
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Local JSON write error for ${filename}:`, err);
    return false;
  }
});
