const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs-extra')

// Configuration
const isDev = process.env.NODE_ENV === 'development'
const DATA_PATH = 'C:\\Users\\DAVE666\\ClaudeContextManager'
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: isDev ? false : true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    show: false,
    titleBarStyle: 'default'
  })

  // Charger l'application
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // En production, charger depuis le bon chemin
    const indexPath = path.join(__dirname, '../dist/index.html')
    mainWindow.loadFile(indexPath)
    // DevTools dÃ©sactivÃ©s en production
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Raccourci F12 pour ouvrir/fermer DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools()
      event.preventDefault()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// IPC Handlers pour communication avec React
ipcMain.handle('get-projects', async () => {
  try {
    const projectsFile = path.join(DATA_PATH, 'projects.json')
    if (await fs.pathExists(projectsFile)) {
      const data = await fs.readJson(projectsFile)
      
      // Mapper les conversations pour ajouter archive_type
      if (data.conversations && Array.isArray(data.conversations)) {
        data.conversations = data.conversations.map(conv => {
          // Parser le type d'archivage - PrioritÃ© au champ archiveType
          if (conv.archiveType === 'full') {
            conv.archive_type = 'full'
          } else if (conv.archiveType === 'summary') {
            conv.archive_type = 'summary'
          } else if (conv.summary && conv.summary.includes('[full]')) {
            conv.archive_type = 'full'
          } else {
            conv.archive_type = 'summary'
          }
          
          // Nettoyer le summary pour l'affichage
          conv.display_summary = conv.summary ? conv.summary.replace(/\s*\[(full|summary)\]\s*/gi, '') : ''
          
          return conv
        })
      }
      
      return data
    }
    return { projects: [], conversations: [] }
  } catch (error) {
    console.error('Erreur lecture projets:', error)
    return { projects: [], conversations: [] }
  }
})


// Handler pour analyser la structure des conversations
ipcMain.handle('analyze-conversations', async () => {
  try {
    const projectsFile = path.join(DATA_PATH, 'projects.json')
    if (await fs.pathExists(projectsFile)) {
      const data = await fs.readJson(projectsFile)
      
      const analysis = {
        total: data.conversations.length,
        withContent: 0,
        withArchiveType: 0,
        markedFull: 0,
        markedSummary: 0,
        fullWithContent: 0,
        summaryWithContent: 0,
        avgContentLengthFull: 0,
        avgContentLengthSummary: 0
      }
      
      let totalFullLength = 0
      let totalSummaryLength = 0
      let fullCount = 0
      let summaryCount = 0
      
      data.conversations.forEach(conv => {
        if (conv.content) analysis.withContent++
        if (conv.archiveType) analysis.withArchiveType++
        
        if (conv.archiveType === 'full') {
          analysis.markedFull++
          if (conv.content) {
            fullCount++
            totalFullLength += conv.content.length
            analysis.fullWithContent++
          }
        } else {
          analysis.markedSummary++
          if (conv.content) {
            summaryCount++
            totalSummaryLength += conv.content.length
            analysis.summaryWithContent++
          }
        }
      })
      
      if (fullCount > 0) {
        analysis.avgContentLengthFull = Math.round(totalFullLength / fullCount)
      }
      if (summaryCount > 0) {
        analysis.avgContentLengthSummary = Math.round(totalSummaryLength / summaryCount)
      }
      
      return analysis
    }
    return { error: 'Fichier non trouvÃ©' }
  } catch (error) {
    console.error('Erreur analyse:', error)
    return { error: error.message }
  }
})
ipcMain.handle('get-storage-health', async () => {
  try {
    const projectsFile = path.join(DATA_PATH, 'projects.json')
    const mappingFile = path.join(DATA_PATH, 'conversation_id_mapping.json')
    const backupDir = path.join(DATA_PATH, 'backups')
    
    let totalSize = 0
    let backupCount = 0
    
    if (await fs.pathExists(projectsFile)) {
      const stats = await fs.stat(projectsFile)
      totalSize += stats.size
    }
    
    if (await fs.pathExists(mappingFile)) {
      const stats = await fs.stat(mappingFile)
      totalSize += stats.size
    }
    
    if (await fs.pathExists(backupDir)) {
      const backups = await fs.readdir(backupDir)
      backupCount = backups.filter(name => name.startsWith('backup_')).length
    }
    
    return {
      mainStorage: await fs.pathExists(projectsFile),
      totalSize: formatBytes(totalSize),
      backupCount,
      dataPath: DATA_PATH,
      lastModified: await getLastModified(projectsFile)
    }
  } catch (error) {
    console.error('Erreur analyse santÃ©:', error)
    return {
      mainStorage: false,
      totalSize: '0 B',
      backupCount: 0,
      dataPath: DATA_PATH,
      lastModified: null
    }
  }
})

// Handler pour renommer un projet
ipcMain.handle('rename-project', async (event, projectId, newName, newDescription) => {
  try {
    const projectsFile = path.join(DATA_PATH, 'projects.json')
    if (await fs.pathExists(projectsFile)) {
      const data = await fs.readJson(projectsFile)
      
      // Trouver et modifier le projet
      const project = data.projects.find(p => p.id === projectId)
      if (project) {
        project.name = newName
        if (newDescription !== undefined) {
          project.description = newDescription
        }
        
        // Sauvegarder les modifications
        await fs.writeJson(projectsFile, data, { spaces: 2 })
        return { success: true, project }
      }
    }
    return { success: false, error: 'Projet non trouvÃ©' }
  } catch (error) {
    console.error('Erreur renommage projet:', error)
    return { success: false, error: error.message }
  }
})

// Handler pour crÃ©er un backup manuel
ipcMain.handle('create-backup', async () => {
  try {
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-')
    const timestamp = dateStr + '_' + timeStr
    
    const backupDir = path.join(DATA_PATH, 'manual_backups')
    await fs.ensureDir(backupDir)
    
    // Sauvegarder projects.json
    const projectsFile = path.join(DATA_PATH, 'projects.json')
    const backupFile = path.join(backupDir, 'backup_manual_' + timestamp + '.json')
    
    if (await fs.pathExists(projectsFile)) {
      await fs.copy(projectsFile, backupFile)
      
      // Sauvegarder aussi le mapping des conversations
      const mappingFile = path.join(DATA_PATH, 'conversation_id_mapping.json')
      if (await fs.pathExists(mappingFile)) {
        const mappingBackup = path.join(backupDir, 'mapping_manual_' + timestamp + '.json')
        await fs.copy(mappingFile, mappingBackup)
      }
      
      // Compter les fichiers de backup
      const backups = await fs.readdir(backupDir)
      const manualBackups = backups.filter(f => f.startsWith('backup_manual_'))
      
      return { 
        success: true, 
        filename: 'backup_manual_' + timestamp + '.json',
        path: backupDir,
        totalBackups: manualBackups.length
      }
    }
    return { success: false, error: 'Fichier projects.json non trouvÃ©' }
  } catch (error) {
    console.error('Erreur crÃ©ation backup:', error)
    return { success: false, error: error.message }
  }
})

// Handler pour exporter un backup vers un dossier choisi
ipcMain.handle('export-backup', async () => {
  try {
    const dateStr = new Date().toISOString().split('T')[0]
    
    // Demander oÃ¹ sauvegarder
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Exporter la sauvegarde',
      defaultPath: 'context-manager-backup-' + dateStr + '.json',
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    
    if (!result.canceled && result.filePath) {
      const projectsFile = path.join(DATA_PATH, 'projects.json')
      await fs.copy(projectsFile, result.filePath)
      
      // CrÃ©er aussi un dossier avec toutes les donnÃ©es
      const exportDir = result.filePath.replace('.json', '_complete')
      await fs.ensureDir(exportDir)
      
      // Copier tout le contenu
      await fs.copy(DATA_PATH, exportDir, {
        filter: (src) => !src.includes('node_modules')
      })
      
      return { 
        success: true, 
        exportPath: result.filePath,
        completePath: exportDir
      }
    }
    return { success: false, error: 'Export annulÃ©' }
  } catch (error) {
    console.error('Erreur export backup:', error)
    return { success: false, error: error.message }
  }
})


// Handler pour ouvrir un dossier dans l'explorateur
ipcMain.handle('open-folder', async (event, folderPath) => {
  const { shell } = require('electron')
  try {
    await shell.openPath(folderPath)
    return { success: true }
  } catch (error) {
    console.error('Erreur ouverture dossier:', error)
    return { success: false, error: error.message }
  }
})

// Utilitaires
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

async function getLastModified(filePath) {
  try {
    if (await fs.pathExists(filePath)) {
      const stats = await fs.stat(filePath)
      return stats.mtime
    }
    return null
  } catch (error) {
    return null
  }
}

// Events Electron
app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})







