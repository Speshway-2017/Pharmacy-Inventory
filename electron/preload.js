const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  checkInternet: () => ipcRenderer.invoke('check-internet'),
  printInvoice: (htmlContent) => ipcRenderer.invoke('print-invoice', htmlContent),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  readLocalJson: (filename) => ipcRenderer.invoke('read-local-json', filename),
  writeLocalJson: (filename, data) => ipcRenderer.invoke('write-local-json', filename, data),
  confirmQuit: () => ipcRenderer.send('app-confirm-quit'),
  onAppCloseRequested: (callback) => {
    ipcRenderer.on('app-close-requested', () => callback());
  },
  onConnectivityChange: (callback) => {
    ipcRenderer.on('connectivity-status', (event, status) => callback(status));
  }
});
