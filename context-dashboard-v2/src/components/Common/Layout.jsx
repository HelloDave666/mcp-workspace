import React, { useState } from 'react'
import { 
  AppBar, Toolbar, Typography, IconButton, Container, 
  Menu, MenuItem, ListItemIcon, ListItemText, Divider,
  Snackbar, Alert, Button, Box
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import BackupIcon from '@mui/icons-material/Backup'
import SaveAltIcon from '@mui/icons-material/SaveAlt'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import BugReportIcon from '@mui/icons-material/BugReport'

function Layout({ children, onRefresh }) {
  const [anchorEl, setAnchorEl] = useState(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success', path: null })

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleCreateBackup = async () => {
    handleMenuClose()
    if (window.electronAPI) {
      const result = await window.electronAPI.createBackup()
      if (result.success) {
        setSnackbar({
          open: true,
          message: 'Backup créé avec succès : ' + result.filename,
          severity: 'success',
          path: result.path
        })
      } else {
        setSnackbar({
          open: true,
          message: 'Erreur: ' + result.error,
          severity: 'error',
          path: null
        })
      }
    }
  }

  const handleExportBackup = async () => {
    handleMenuClose()
    if (window.electronAPI) {
      const result = await window.electronAPI.exportBackup()
      if (result.success) {
        setSnackbar({
          open: true,
          message: 'Backup exporté avec succès',
          severity: 'success',
          path: result.exportPath
        })
      } else if (result.error !== 'Export annulé') {
        setSnackbar({
          open: true,
          message: 'Erreur: ' + result.error,
          severity: 'error',
          path: null
        })
      }
    }
  }

  const handleAnalyze = async () => {
    handleMenuClose()
    if (window.electronAPI) {
      const analysis = await window.electronAPI.analyzeConversations()
      console.log('=== ANALYSE DES CONVERSATIONS ===')
      console.log('Total conversations:', analysis.total)
      console.log('Marquées [full]:', analysis.markedFull)
      console.log('Marquées [summary]:', analysis.markedSummary)
      console.log('Avec contenu complet:', analysis.withContent)
      console.log('Full avec contenu:', analysis.fullWithContent)
      console.log('Summary avec contenu:', analysis.summaryWithContent)
      console.log('Taille moyenne contenu Full:', analysis.avgContentLengthFull)
      console.log('Taille moyenne contenu Summary:', analysis.avgContentLengthSummary)
      console.log('Échantillons:', analysis.samples)
      
      const message = 'Analyse terminée:\n' +
        'Total: ' + analysis.total + ' conversations\n' +
        'Full: ' + analysis.markedFull + ' (avec contenu: ' + analysis.fullWithContent + ')\n' +
        'Summary: ' + analysis.markedSummary + ' (avec contenu: ' + analysis.summaryWithContent + ')\n' +
        'Voir la console (F12) pour plus de détails'
      
      alert(message)
    }
  }

  const handleOpenFolder = () => {
    if (snackbar.path && window.electronAPI) {
      window.electronAPI.openFolder(snackbar.path)
    }
  }

  return (
    <>
      <AppBar position='fixed'>
        <Toolbar>
          <Typography variant='h6' component='div' sx={{ flexGrow: 1 }}>
            Context Manager Dashboard
          </Typography>
          
          <IconButton color='inherit' onClick={onRefresh} title='Actualiser'>
            <RefreshIcon />
          </IconButton>
          
          <IconButton color='inherit' onClick={handleMenuOpen} title='Plus d options'>
            <MoreVertIcon />
          </IconButton>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleCreateBackup}>
              <ListItemIcon>
                <BackupIcon fontSize='small' />
              </ListItemIcon>
              <ListItemText>Créer un backup local</ListItemText>
            </MenuItem>
            
            <MenuItem onClick={handleExportBackup}>
              <ListItemIcon>
                <SaveAltIcon fontSize='small' />
              </ListItemIcon>
              <ListItemText>Exporter backup complet</ListItemText>
            </MenuItem>
            
            <Divider />
            
            <MenuItem onClick={handleAnalyze}>
              <ListItemIcon>
                <BugReportIcon fontSize='small' />
              </ListItemIcon>
              <ListItemText>Analyser les conversations (Debug)</ListItemText>
            </MenuItem>
            
            <Divider />
            
            <MenuItem onClick={() => {
              handleMenuClose()
              onRefresh()
            }}>
              <ListItemIcon>
                <RefreshIcon fontSize='small' />
              </ListItemIcon>
              <ListItemText>Actualiser les données</ListItemText>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth='xl' sx={{ mt: 10, mb: 4 }}>
        {children}
      </Container>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={10000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          action={
            snackbar.path && (
              <Button 
                color='inherit' 
                size='small' 
                startIcon={<FolderOpenIcon />}
                onClick={handleOpenFolder}
              >
                Ouvrir le dossier
              </Button>
            )
          }
        >
          <Box>
            <Typography variant='body2'>{snackbar.message}</Typography>
            {snackbar.path && (
              <Typography variant='caption' sx={{ display: 'block', mt: 1, fontFamily: 'monospace' }}>
                {snackbar.path}
              </Typography>
            )}
          </Box>
        </Alert>
      </Snackbar>
    </>
  )
}

export default Layout
