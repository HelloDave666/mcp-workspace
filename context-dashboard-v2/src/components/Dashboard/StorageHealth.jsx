import React from 'react'
import { Card, CardContent, Typography, Box, Chip, LinearProgress } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'

function StorageHealth({ health }) {
  if (!health) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6">Santé du Stockage</Typography>
          <Typography color="textSecondary">Chargement...</Typography>
        </CardContent>
      </Card>
    )
  }

  const isHealthy = health.mainStorage && health.backupCount > 0

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Santé du Stockage
        </Typography>
        
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          {isHealthy ? (
            <>
              <CheckCircleIcon color="success" />
              <Chip label="Opérationnel" color="success" size="small" />
            </>
          ) : (
            <>
              <ErrorIcon color="error" />
              <Chip label="Attention requise" color="error" size="small" />
            </>
          )}
        </Box>

        <Box mb={2}>
          <Typography variant="body2" color="textSecondary">
            Emplacement
          </Typography>
          <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
            {health.dataPath}
          </Typography>
        </Box>

        <Box mb={2}>
          <Typography variant="body2" color="textSecondary">
            Taille totale: {health.totalSize}
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={Math.min((parseFloat(health.totalSize) / 10), 100)} 
            sx={{ mt: 1 }}
          />
        </Box>

        <Typography variant="body2" color="textSecondary">
          {health.backupCount} sauvegardes disponibles
        </Typography>
      </CardContent>
    </Card>
  )
}

export default StorageHealth
