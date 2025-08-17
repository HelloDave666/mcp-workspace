import React from 'react'
import { Grid, Card, CardContent, Typography, Box } from '@mui/material'
import FolderIcon from '@mui/icons-material/Folder'
import ChatIcon from '@mui/icons-material/Chat'
import StorageIcon from '@mui/icons-material/Storage'
import BackupIcon from '@mui/icons-material/Backup'

function MetricsCards({ projectCount, conversationCount, storageHealth }) {
  const cards = [
    {
      title: 'Projets',
      value: projectCount || 0,
      icon: <FolderIcon fontSize="large" />,
      color: '#1976d2'
    },
    {
      title: 'Conversations',
      value: conversationCount || 0,
      icon: <ChatIcon fontSize="large" />,
      color: '#388e3c'
    },
    {
      title: 'Stockage',
      value: storageHealth?.totalSize || '0 B',
      icon: <StorageIcon fontSize="large" />,
      color: '#f57c00'
    },
    {
      title: 'Sauvegardes',
      value: storageHealth?.backupCount || 0,
      icon: <BackupIcon fontSize="large" />,
      color: '#7b1fa2'
    }
  ]

  return (
    <Grid container spacing={2}>
      {cards.map((card, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    {card.title}
                  </Typography>
                  <Typography variant="h4">
                    {card.value}
                  </Typography>
                </Box>
                <Box sx={{ color: card.color }}>
                  {card.icon}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

export default MetricsCards
