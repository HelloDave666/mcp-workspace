const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage, shell } = require('electron')
const path = require('path')
const fs = require('fs-extra')
const AutoLaunch = require('auto-launch')

// Configuration
const isDev = process.env.NODE_ENV === 'development'
const DATA_PATH = 'C:\\Users\\DAVE666\\ClaudeContextManager'
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

let mainWindow
let tray = null
let isQuitting = false

// Configuration auto-démarrage Windows
// ✅ Ne pas utiliser auto-launch en mode développement
const autoLauncher = isDev ? null : new AutoLaunch({
  name: 'Context Manager Dashboard',
  path: app.getPath('exe'),
  isHidden: false  // Changé de true à false pour meilleure compatibilité
})

// ✅ Nettoyage automatique de l'entrée "electron" au démarrage
if (!isDev) {
  const { exec } = require('child_process')
  exec('reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v electron /f', (error) => {
    if (!error) {
      console.log('🧹 Entrée electron.exe nettoyée du registre')
    }
  })
}

// Fonction pour créer le system tray
function createTray() {
  const iconPath = isDev 
    ? path.join(__dirname, '../public/icon.png')  
    : path.join(process.resourcesPath, 'icon.png')
  
  let trayIcon
  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath)
  } else {
    trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
  }
  
  tray = new Tray(trayIcon)
  tray.setToolTip('Context Manager Dashboard - Cliquez pour ouvrir')
  
  const getStats = async () => {
    try {
      const projectsFile = path.join(DATA_PATH, 'projects.json')
      if (await fs.pathExists(projectsFile)) {
        const data = await fs.readJson(projectsFile)
        return {
          projects: data.projects?.length || 0,
          conversations: data.conversations?.length || 0
        }
      }
    } catch (error) {
      console.error('Erreur récupération stats:', error)
    }
    return { projects: 0, conversations: 0 }
  }
  
  const updateContextMenu = async () => {
    const stats = await getStats()
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '📊 Context Manager Dashboard',
        enabled: false
      },
      { type: 'separator' },
      {
        label: '📈 Statistiques',
        submenu: [
          { 
            label: `Projets actifs: ${stats.projects}`,
            enabled: false
          },
          { 
            label: `Conversations archivées: ${stats.conversations}`,
            enabled: false
          },
          { type: 'separator' },
          { 
            label: '📂 Ouvrir le dossier de données',
            click: () => shell.openPath(DATA_PATH)
          }
        ]
      },
      {
        label: '🔍 Vue rapide',
        click: () => showQuickView(stats)
      },
      { type: 'separator' },
      {
        label: '💾 Créer une sauvegarde',
        click: async () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('trigger-backup')
          }
        }
      },
      {
        label: '🔄 Rafraîchir',
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('refresh-data')
          }
          updateContextMenu()
        }
      },
      { type: 'separator' },
      {
        label: '⚙️ Démarrage automatique',
        type: 'checkbox',
        checked: autoLauncher ? await autoLauncher.isEnabled() : false,  // ✅ Vérification ajoutée
        click: async (menuItem) => {
          if (autoLauncher) {  // ✅ Vérification ajoutée
            if (menuItem.checked) {
              await autoLauncher.enable()
            } else {
              await autoLauncher.disable()
            }
          }
        }
      },
      { type: 'separator' },
      {
        label: mainWindow && mainWindow.isVisible() ? '➖ Réduire' : '🚀 Ouvrir Dashboard',
        click: () => {
          if (mainWindow.isVisible()) {
            mainWindow.hide()
          } else {
            mainWindow.show()
            if (!isDev) {
              mainWindow.maximize()
            }
          }
          updateContextMenu()
        }
      },
      {
        label: '❌ Quitter',
        click: () => {
          isQuitting = true
          app.quit()
        }
      }
    ])
    
    tray.setContextMenu(contextMenu)
  }
  
  updateContextMenu()
  
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      if (!isDev) {
        mainWindow.maximize()
      }
    }
    updateContextMenu()
  })
  
  tray.on('double-click', async () => {
    const stats = await getStats()
    showQuickView(stats)
  })
  
  setInterval(updateContextMenu, 30000)
}

function showQuickView(stats) {
  const quickView = new BrowserWindow({
    width: 400,
    height: 350,
    resizable: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Vue Rapide</title>
      <style>
        body {
          margin: 0;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          user-select: none;
          cursor: default;
        }
        .header {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 25px;
          text-align: center;
          text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .stat-card {
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(10px);
          padding: 20px;
          margin: 15px 0;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.3s ease;
        }
        .stat-card:hover {
          background: rgba(255,255,255,0.25);
          transform: translateX(5px);
        }
        .stat-label {
          font-size: 16px;
          opacity: 0.95;
        }
        .stat-value {
          font-size: 28px;
          font-weight: bold;
        }
        .close-hint {
          position: absolute;
          bottom: 10px;
          right: 10px;
          font-size: 11px;
          opacity: 0.6;
          font-style: italic;
        }
        .storage-path {
          margin-top: 20px;
          padding: 10px;
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
          font-size: 12px;
          text-align: center;
          opacity: 0.8;
        }
      </style>
    </head>
    <body onclick="window.close()">
      <div class="header">📊 Context Manager Dashboard</div>
      <div class="stat-card">
        <div class="stat-label">📁 Projets Actifs</div>
        <div class="stat-value">${stats.projects}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">💬 Conversations</div>
        <div class="stat-value">${stats.conversations}</div>
      </div>
      <div class="storage-path">📂 ${DATA_PATH}</div>
      <div class="close-hint">Cliquez pour fermer</div>
    </body>
    </html>
  `
  
  quickView.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  
  setTimeout(() => {
    if (!quickView.isDestroyed()) {
      quickView.close()
    }
  }, 10000)
  
  quickView.on('blur', () => {
    quickView.close()
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: isDev ? false : true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    titleBarStyle: 'default',
    icon: path.join(__dirname, '../public/icon.png')
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html')
    mainWindow.loadFile(indexPath)
  }

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow.hide()
      
      if (tray && !app.getLoginItemSettings().wasOpenedAtLogin) {
        tray.displayBalloon({
          title: 'Context Manager Dashboard',
          content: 'L\'application continue de fonctionner en arrière-plan.'
        })
      }
      return false
    }
  })

  // ✅ CORRECTION : La fenêtre reste cachée au démarrage en production
  mainWindow.once('ready-to-show', () => {
    if (isDev) {
      // En mode développement, afficher la fenêtre pour faciliter le debug
      mainWindow.show()
    } else {
      // En production, la fenêtre reste cachée au démarrage
      // L'utilisateur peut l'ouvrir via le clic sur l'icône du tray
      console.log('Dashboard prêt - reste dans le tray. Cliquez sur l\'icône pour ouvrir.')
    }
  })

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

// ========== VOS IPC HANDLERS EXISTANTS (CONSERVÉS) ==========

ipcMain.handle('get-projects', async () => {
  try {
    const projectsFile = path.join(DATA_PATH, 'projects.json')
    if (await fs.pathExists(projectsFile)) {
      const data = await fs.readJson(projectsFile)
      
      if (data.conversations && Array.isArray(data.conversations)) {
        data.conversations = data.conversations.map(conv => {
          if (conv.archiveType === 'full') {
            conv.archive_type = 'full'
          } else if (conv.archiveType === 'summary') {
            conv.archive_type = 'summary'
          } else if (conv.summary && conv.summary.includes('[full]')) {
            conv.archive_type = 'full'
          } else {
            conv.archive_type = 'summary'
          }
          
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
    return { error: 'Fichier non trouvé' }
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
    console.error('Erreur analyse santé:', error)
    return {
      mainStorage: false,
      totalSize: '0 B',
      backupCount: 0,
      dataPath: DATA_PATH,
      lastModified: null
    }
  }
})

ipcMain.handle('rename-project', async (event, projectId, newName, newDescription) => {
  try {
    const projectsFile = path.join(DATA_PATH, 'projects.json')
    if (await fs.pathExists(projectsFile)) {
      const data = await fs.readJson(projectsFile)
      
      const project = data.projects.find(p => p.id === projectId)
      if (project) {
        project.name = newName
        if (newDescription !== undefined) {
          project.description = newDescription
        }
        
        await fs.writeJson(projectsFile, data, { spaces: 2 })
        return { success: true, project }
      }
    }
    return { success: false, error: 'Projet non trouvé' }
  } catch (error) {
    console.error('Erreur renommage projet:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('create-backup', async () => {
  try {
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-')
    const timestamp = dateStr + '_' + timeStr
    
    const backupDir = path.join(DATA_PATH, 'manual_backups')
    await fs.ensureDir(backupDir)
    
    const projectsFile = path.join(DATA_PATH, 'projects.json')
    const backupFile = path.join(backupDir, 'backup_manual_' + timestamp + '.json')
    
    if (await fs.pathExists(projectsFile)) {
      await fs.copy(projectsFile, backupFile)
      
      const mappingFile = path.join(DATA_PATH, 'conversation_id_mapping.json')
      if (await fs.pathExists(mappingFile)) {
        const mappingBackup = path.join(backupDir, 'mapping_manual_' + timestamp + '.json')
        await fs.copy(mappingFile, mappingBackup)
      }
      
      const backups = await fs.readdir(backupDir)
      const manualBackups = backups.filter(f => f.startsWith('backup_manual_'))
      
      return { 
        success: true, 
        filename: 'backup_manual_' + timestamp + '.json',
        path: backupDir,
        totalBackups: manualBackups.length
      }
    }
    return { success: false, error: 'Fichier projects.json non trouvé' }
  } catch (error) {
    console.error('Erreur création backup:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('export-backup', async () => {
  try {
    const dateStr = new Date().toISOString().split('T')[0]
    
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
      
      const exportDir = result.filePath.replace('.json', '_complete')
      await fs.ensureDir(exportDir)
      
      await fs.copy(DATA_PATH, exportDir, {
        filter: (src) => !src.includes('node_modules')
      })
      
      return { 
        success: true, 
        exportPath: result.filePath,
        completePath: exportDir
      }
    }
    return { success: false, error: 'Export annulé' }
  } catch (error) {
    console.error('Erreur export backup:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('open-folder', async (event, folderPath) => {
  try {
    await shell.openPath(folderPath)
    return { success: true }
  } catch (error) {
    console.error('Erreur ouverture dossier:', error)
    return { success: false, error: error.message }
  }
})

// ========== FONCTIONS UTILITAIRES ==========

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

// ========== EVENTS ELECTRON ==========

app.whenReady().then(async () => {
  createWindow()
  createTray()
  
  const isFirstRun = !await fs.pathExists(path.join(DATA_PATH, '.configured'))
  if (isFirstRun && autoLauncher) {  // ✅ Vérification ajoutée
    const { dialog } = require('electron')
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Oui', 'Non'],
      defaultId: 0,
      title: 'Démarrage automatique',
      message: 'Voulez-vous que Context Manager Dashboard se lance automatiquement au démarrage de Windows ?',
      detail: 'Vous pourrez changer ce paramètre plus tard via l\'icône dans la barre des tâches.'
    })
    
    if (result.response === 0) {
      await autoLauncher.enable()
    }
    
    await fs.writeFile(path.join(DATA_PATH, '.configured'), '')
  }
})

app.on('window-all-closed', (event) => {
  event.preventDefault()
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})