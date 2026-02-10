const { contextBridge, ipcRenderer, webFrame } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    getMachineId: () => ipcRenderer.invoke('get-machine-id'),
    importExcel: () => ipcRenderer.invoke('read-excel-file'),
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    relaunch: () => ipcRenderer.invoke('relaunch-app'),
    restartApp: () => ipcRenderer.invoke('relaunch-app'),
    updateAutoBackup: (config) => ipcRenderer.invoke('update-auto-backup', config),
    testEmailConnection: (config) => ipcRenderer.invoke('test-email-config', config),
    testTelegramConfig: (config) => ipcRenderer.invoke('test-telegram-config', config),
    backupDatabase: () => ipcRenderer.invoke('backup-database'),
    restoreDatabase: () => ipcRenderer.invoke('restore-database'),
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    setZoomFactor: (factor) => webFrame.setZoomFactor(factor),
    getZoomFactor: () => webFrame.getZoomFactor(),
    platform: process.platform,
});
