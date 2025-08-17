import React from 'react'
import { Typography, Grid } from '@mui/material'
import ProjectCard from './ProjectCard'

function ProjectGrid({ projects, conversations, onUpdate }) {
  if (!projects || projects.length === 0) {
    return (
      <Typography color='textSecondary'>Aucun projet trouvé</Typography>
    )
  }

  return (
    <>
      <Typography variant='h5' gutterBottom sx={{ mb: 3 }}>
        Projets ({projects.length})
      </Typography>
      <Grid container spacing={2}>
        {projects.map((project) => (
          <Grid item xs={12} md={6} lg={4} key={project.id}>
            <ProjectCard 
              project={project}
              conversations={conversations}
              onUpdate={onUpdate}
            />
          </Grid>
        ))}
      </Grid>
    </>
  )
}

export default ProjectGrid
