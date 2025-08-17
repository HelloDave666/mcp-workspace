import React, { useState } from 'react'
import { 
  Card, CardContent, Typography, Chip, Box, 
  IconButton, TextField, Stack, Button
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import SaveIcon from '@mui/icons-material/Save'
import CancelIcon from '@mui/icons-material/Cancel'
import ForumIcon from '@mui/icons-material/Forum'
import ConversationList from '../Conversations/ConversationList'

function ProjectCard({ project, conversations, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(project.name)
  const [editDescription, setEditDescription] = useState(project.description || '')
  const [showConversations, setShowConversations] = useState(false)
  
  const projectConversations = conversations.filter(conv => conv.project_id === project.id)

  const handleSave = async () => {
    if (editName.trim() && window.electronAPI) {
      const result = await window.electronAPI.renameProject(
        project.id, 
        editName.trim(), 
        editDescription.trim()
      )
      if (result.success) {
        onUpdate()
        setIsEditing(false)
      }
    }
  }

  const handleCancel = () => {
    setEditName(project.name)
    setEditDescription(project.description || '')
    setIsEditing(false)
  }

  const getPhaseColor = (phase) => {
    const colors = {
      'initial-setup': 'info',
      'development': 'warning',
      'production-ready': 'success',
      'completed': 'default'
    }
    return colors[phase] || 'default'
  }

  return (
    <>
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box display='flex' justifyContent='space-between' alignItems='flex-start'>
            {isEditing ? (
              <Stack spacing={2} sx={{ width: '100%' }}>
                <TextField
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  label='Nom du projet'
                  size='small'
                  fullWidth
                  autoFocus
                />
                <TextField
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  label='Description'
                  size='small'
                  fullWidth
                  multiline
                  rows={2}
                />
                <Box display='flex' gap={1}>
                  <IconButton size='small' onClick={handleSave} color='primary'>
                    <SaveIcon />
                  </IconButton>
                  <IconButton size='small' onClick={handleCancel} color='error'>
                    <CancelIcon />
                  </IconButton>
                </Box>
              </Stack>
            ) : (
              <>
                <Box flex={1}>
                  <Typography variant='h6' gutterBottom>
                    {project.name}
                  </Typography>
                  
                  <Chip 
                    label={project.phase || 'initial'} 
                    color={getPhaseColor(project.phase)}
                    size='small'
                    sx={{ mb: 2 }}
                  />
                  
                  <Typography variant='body2' color='textSecondary' gutterBottom>
                    {project.description || 'Pas de description'}
                  </Typography>
                  
                  <Box mt={2}>
                    <Button 
                      size='small' 
                      startIcon={<ForumIcon />}
                      onClick={() => setShowConversations(true)}
                      variant='outlined'
                    >
                      {projectConversations.length} conversations
                    </Button>
                  </Box>
                  
                  {project.technologies && project.technologies.length > 0 && (
                    <Box mt={2} display='flex' flexWrap='wrap' gap={0.5}>
                      {project.technologies.slice(0, 3).map((tech, idx) => (
                        <Chip 
                          key={idx}
                          label={tech}
                          size='small'
                          variant='outlined'
                        />
                      ))}
                      {project.technologies.length > 3 && (
                        <Chip 
                          label={'...' + (project.technologies.length - 3)}
                          size='small'
                          variant='outlined'
                        />
                      )}
                    </Box>
                  )}
                </Box>
                <IconButton size='small' onClick={() => setIsEditing(true)}>
                  <EditIcon />
                </IconButton>
              </>
            )}
          </Box>
        </CardContent>
      </Card>
      
      <ConversationList
        open={showConversations}
        onClose={() => setShowConversations(false)}
        project={project}
        conversations={conversations}
        onUpdate={onUpdate}
      />
    </>
  )
}

export default ProjectCard
