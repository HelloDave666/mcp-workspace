import React from 'react'
import { Grid, CircularProgress, Box } from '@mui/material'
import MetricsCards from './MetricsCards'
import StorageHealth from './StorageHealth'
import BackupInfo from './BackupInfo'
import ProjectGrid from '../Projects/ProjectGrid'

function Overview({ projects, conversations, storageHealth, loading, onUpdate }) {
  if (loading) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' minHeight='60vh'>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <MetricsCards 
          projectCount={projects.length}
          conversationCount={conversations.length}
          storageHealth={storageHealth}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <StorageHealth health={storageHealth} />
      </Grid>
      <Grid item xs={12} md={6}>
        <BackupInfo storageHealth={storageHealth} />
      </Grid>
      <Grid item xs={12}>
        <ProjectGrid 
          projects={projects} 
          conversations={conversations}
          onUpdate={onUpdate}
        />
      </Grid>
    </Grid>
  )
}

export default Overview
