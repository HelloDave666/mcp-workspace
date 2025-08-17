import React from 'react'
import { Card, CardContent, Typography, Box, Chip, LinearProgress } from '@mui/material'
import BackupIcon from '@mui/icons-material/Backup'
import FolderIcon from '@mui/icons-material/Folder'

function BackupInfo({ storageHealth }) {
  if (!storageHealth) return null

  const backupStatus = storageHealth.backupCount > 5 ? 'success' : 
                       storageHealth.backupCount > 0 ? 'warning' : 'error'
  
  const backupMessage = storageHealth.backupCount > 5 ? 'Excellent' :
                        storageHealth.backupCount > 0 ? 'Acceptable' : 'Critique'

  return (
    <Card>
      <CardContent>
        <Box display='flex' alignItems='center' gap={1} mb={2}>
          <BackupIcon color='action' />
          <Typography variant='h6'>
            État des Sauvegardes
          </Typography>
        </Box>
        
        <Box mb={2}>
          <Box display='flex' justifyContent='space-between' alignItems='center' mb={1}>
            <Typography variant='body2' color='textSecondary'>
              Sauvegardes automatiques
            </Typography>
            <Chip 
              label={backupMessage} 
              color={backupStatus} 
              size='small' 
            />
          </Box>
          <LinearProgress 
            variant='determinate' 
            value={Math.min(storageHealth.backupCount * 10, 100)} 
            color={backupStatus}
          />
          <Typography variant='caption' color='textSecondary'>
            {storageHealth.backupCount} sauvegardes disponibles
          </Typography>
        </Box>
        
        <Box display='flex' alignItems='center' gap={1} mt={2}>
          <FolderIcon fontSize='small' color='action' />
          <Typography variant='caption' sx={{ fontFamily: 'monospace' }}>
            {storageHealth.dataPath}
          </Typography>
        </Box>
        
        <Box mt={2} p={1} bgcolor='background.default' borderRadius={1}>
          <Typography variant='caption' color='textSecondary'>
            💡 Conseil: Exportez régulièrement un backup complet via le menu ⋮
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

export default BackupInfo
