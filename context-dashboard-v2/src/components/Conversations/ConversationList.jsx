import React, { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, Button, Typography, Chip, Box, TextField,
  Tooltip, Divider, Alert
} from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CloseIcon from '@mui/icons-material/Close'
import StorageIcon from '@mui/icons-material/Storage'
import SummarizeIcon from '@mui/icons-material/Summarize'

function ConversationList({ open, onClose, project, conversations, onUpdate }) {
  const [selectedConv, setSelectedConv] = useState(null)
  const [viewDialog, setViewDialog] = useState(false)
  
  if (!project) return null
  
  // Filtrer et trier les conversations
  const projectConversations = conversations
    .filter(conv => conv.project_id === project.id)
    .sort((a, b) => {
      // D'abord par type (full avant summary)
      if (a.archive_type !== b.archive_type) {
        return a.archive_type === 'full' ? -1 : 1
      }
      // Puis par date (plus récent en premier)
      return new Date(b.timestamp || b.id) - new Date(a.timestamp || a.id)
    })
  
  const formatDate = (conv) => {
    if (conv.timestamp) {
      return new Date(conv.timestamp).toLocaleDateString('fr-FR')
    }
    // Essayer d'extraire la date de l'ID de conversation
    if (conv.id && conv.id.includes('_')) {
      const parts = conv.id.split('_')
      const timestamp = parseInt(parts[1])
      if (!isNaN(timestamp)) {
        return new Date(timestamp).toLocaleDateString('fr-FR')
      }
    }
    return 'Date inconnue'
  }
  
  const truncateText = (text, maxLength = 150) => {
    if (!text) return 'Pas de résumé disponible'
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }
  
  const handleView = (conv) => {
    setSelectedConv(conv)
    setViewDialog(true)
  }
  
  const handleDelete = async (convId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette conversation ?')) {
      // TODO: Implémenter la suppression via l'API
      console.log('Suppression de:', convId)
      onUpdate()
    }
  }
  
  // Utiliser display_summary ou summary
  const getSummaryText = (conv) => {
    return conv.display_summary || conv.summary || ''
  }
  
  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          <Box display='flex' justifyContent='space-between' alignItems='center'>
            <Typography variant='h6'>
              Conversations - {project.name}
            </Typography>
            <IconButton onClick={onClose} size='small'>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box mb={2}>
            <Typography variant='body2' color='textSecondary'>
              Total : {projectConversations.length} conversations
            </Typography>
            <Box display='flex' gap={1} mt={1}>
              <Chip 
                icon={<StorageIcon />} 
                label={'Full: ' + projectConversations.filter(c => c.archive_type === 'full').length}
                size='small'
                color='primary'
              />
              <Chip 
                icon={<SummarizeIcon />} 
                label={'Summary: ' + projectConversations.filter(c => c.archive_type === 'summary' || !c.archive_type).length}
                size='small'
                color='default'
              />
            </Box>
          </Box>
          
          <Divider />
          
          {projectConversations.length === 0 ? (
            <Alert severity='info' sx={{ mt: 2 }}>
              Aucune conversation archivée pour ce projet
            </Alert>
          ) : (
            <List>
              {projectConversations.map((conv, index) => (
                <React.Fragment key={conv.id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box display='flex' alignItems='center' gap={1}>
                          <Typography variant='subtitle2' component='span'>
                            {getSummaryText(conv) ? truncateText(getSummaryText(conv).split(':')[0], 50) : 'Conversation ' + (index + 1)}
                          </Typography>
                          <Chip 
                            label={conv.archive_type || 'summary'} 
                            size='small'
                            color={conv.archive_type === 'full' ? 'primary' : 'default'}
                            variant='outlined'
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant='body2' color='textSecondary' component='span' display='block'>
                            {truncateText(getSummaryText(conv) || conv.content, 150)}
                          </Typography>
                          <Typography variant='caption' color='textSecondary' component='span'>
                            {formatDate(conv)} • {conv.phase || 'N/A'}
                          </Typography>
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title='Voir'>
                        <IconButton size='small' onClick={() => handleView(conv)}>
                          <VisibilityIcon fontSize='small' />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title='Supprimer'>
                        <IconButton size='small' onClick={() => handleDelete(conv.id)} color='error'>
                          <DeleteIcon fontSize='small' />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < projectConversations.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose}>Fermer</Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog pour voir le détail d'une conversation */}
      <Dialog
        open={viewDialog}
        onClose={() => setViewDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          <Box display='flex' justifyContent='space-between' alignItems='center'>
            <Typography variant='h6'>Détail de la conversation</Typography>
            <IconButton onClick={() => setViewDialog(false)} size='small'>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedConv && (
            <Box>
              <Box mb={2}>
                <Chip 
                  label={selectedConv.archive_type || 'summary'} 
                  color={selectedConv.archive_type === 'full' ? 'primary' : 'default'}
                />
                <Typography variant='caption' color='textSecondary' sx={{ ml: 2 }}>
                  {formatDate(selectedConv)}
                </Typography>
              </Box>
              <Typography variant='subtitle1' gutterBottom fontWeight='bold'>
                Résumé :
              </Typography>
              <Typography variant='body2' paragraph>
                {getSummaryText(selectedConv) || 'Pas de résumé disponible'}
              </Typography>
              {selectedConv.archive_type === 'full' && selectedConv.content && (
                <>
                  <Typography variant='subtitle1' gutterBottom fontWeight='bold'>
                    Contenu complet :
                  </Typography>
                  <TextField
                    multiline
                    rows={10}
                    fullWidth
                    value={selectedConv.content}
                    InputProps={{ readOnly: true }}
                    variant='outlined'
                  />
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default ConversationList
