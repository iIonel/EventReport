import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  IconButton,
} from '@mui/material'
import { Map, Add, Logout, Analytics } from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" elevation={0} sx={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
        <Toolbar>
          <Typography
            variant="h6"
            sx={{ flexGrow: 1, fontWeight: 700, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            EventReport
          </Typography>

          <Button
            color="inherit"
            startIcon={<Map />}
            onClick={() => navigate('/')}
            sx={{ mx: 1, opacity: location.pathname === '/' ? 1 : 0.8 }}
          >
            Map
          </Button>

          <Button
            color="inherit"
            startIcon={<Add />}
            onClick={() => navigate('/report')}
            sx={{ mx: 1, opacity: location.pathname === '/report' ? 1 : 0.8 }}
          >
            Report
          </Button>

          {user?.role === 'admin' && (
            <Button
              color="inherit"
              startIcon={<Analytics />}
              onClick={() => navigate('/analytics')}
              sx={{ mx: 1, opacity: location.pathname === '/analytics' ? 1 : 0.8 }}
            >
              Analytics
            </Button>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
            <Typography variant="body2" sx={{ mr: 2, opacity: 0.9 }}>
              {user?.first_name} {user?.last_name}
            </Typography>
            <IconButton color="inherit" onClick={logout}>
              <Logout />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ flex: 1, py: 3 }}>
        {children}
      </Container>
    </Box>
  )
}

export default Layout
