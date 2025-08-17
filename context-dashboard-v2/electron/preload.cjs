const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getProjects: () => ipcRenderer.invoke('get-projects'),
  getStorageHealth: () => ipcRenderer.invoke('get-storage-health'),
  renameProject: (projectId, newName, newDescription) => 
    ipcRenderer.invoke('rename-project', projectId, newName, newDescription),
  createBackup: () => ipcRenderer.invoke('create-backup'),
  exportBackup: () => ipcRenderer.invoke('export-backup'),
  openFolder: (path) => ipcRenderer.invoke('open-folder', path),
  analyzeConversations: () => ipcRenderer.invoke('analyze-conversations')
})
