// Most między stroną a procesem głównym: tylko zapis kopii zapasowej i otwarcie jej folderu.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('rytmDesktop', {
  saveBackup: (json) => ipcRenderer.invoke('rytm:backup', json),
  openBackupFolder: () => ipcRenderer.invoke('rytm:open-backups'),
  backupFolder: () => ipcRenderer.invoke('rytm:backup-folder'),
})
