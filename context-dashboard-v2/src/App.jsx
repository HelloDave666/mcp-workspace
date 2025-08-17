import React, { useState, useEffect } from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Box from '@mui/material/Box'
import Layout from './components/Common/Layout'
import Overview from './components/Dashboard/Overview'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
})

function App() {
  const [projects, setProjects] = useState([])
  const [conversations, setConversations] = useState([])
  const [storageHealth, setStorageHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      if (window.electronAPI) {
        const projectsData = await window.electronAPI.getProjects()
        const healthData = await window.electronAPI.getStorageHealth()
        
        setProjects(projectsData.projects || [])
        setConversations(projectsData.conversations || [])
        setStorageHealth(healthData)
      }
    } catch (error) {
      console.error('Erreur chargement données:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Layout onRefresh={loadData}>
          <Overview 
            projects={projects}
            conversations={conversations}
            storageHealth={storageHealth}
            loading={loading}
            onUpdate={loadData}
          />
        </Layout>
      </Box>
    </ThemeProvider>
  )
}

export default App

