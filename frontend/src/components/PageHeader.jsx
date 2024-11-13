// components/PageHeader.jsx
import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  Typography,
  Avatar,
  Popover,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Breadcrumbs,
  Stack,
} from '@mui/material';
import {
  ArrowBack,
  KeyboardArrowDown,
  Logout as LogoutIcon,
  Home,
  NavigateNext,
  Info as InfoIcon,
  QuestionAnswer as FaqIcon,
  Feedback as FeedbackIcon,
} from '@mui/icons-material';
import JGIBanner from '../assets/jain.webp';
import JGILogo from '../assets/jain1.webp';
import { useAuth } from '../config/AuthContext';
import { useNavigate } from 'react-router-dom';

function PageHeader({
  pageTitle,
  pageSubtitle,
  breadcrumbs = [],
  onBack,
  actionButtons,
  sx
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const { userData, logout } = useAuth();
  const navigate = useNavigate();

  const handleProfileClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigate = (path) => {
    navigate(path);
    handleClose();
  };

  return (
    <>
      {/* Main Header */}
      <AppBar position="fixed" elevation={0} sx={{ backgroundColor: '#2a3042' }}>
        <Toolbar sx={{ justifyContent: 'space-between', px: 2, width: '100%' }}>
          <Box component="img" src={JGILogo} sx={{ display: { xs: 'block', md: 'none' }, height: '40px' }} />
          <Box component="img" src={JGIBanner} sx={{ display: { xs: 'none', md: 'block' }, height: '50px' }} />

          <Box
            onClick={handleProfileClick}
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '24px',
              padding: '4px 16px 4px 4px'
            }}
          >
            <Avatar
              sx={{
                bgcolor: '#556ee6',
                width: 32,
                height: 32,
                fontSize: '14px',
                marginRight: 1
              }}
            >
              {(userData?.name || userData?.username)?.[0]?.toUpperCase()}
            </Avatar>
            <Typography variant="subtitle2" color="white" sx={{ mr: 1 }}>
              {userData?.name || userData?.username}
            </Typography>
            <KeyboardArrowDown sx={{ color: 'white', fontSize: 20, rotate: anchorEl ? '-180deg' : '0deg', transition: 'all 0.2s ease-in-out' }} />
          </Box>
        </Toolbar>
      </AppBar>

      {/* Profile Dropdown */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          elevation: 0,
          sx: {
            mt: 1,
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
      >
        <List sx={{ width: 200 }}>
          <ListItem button onClick={() => handleNavigate('/faq')}>
            <ListItemIcon><FaqIcon color="primary" /></ListItemIcon>
            <ListItemText primary="FAQ" />
          </ListItem>
          {/* <ListItem button onClick={() => handleNavigate('/feedback')}>
            <ListItemIcon><FeedbackIcon color="primary" /></ListItemIcon>
            <ListItemText primary="Feedback" />
          </ListItem> */}
          <ListItem button onClick={() => handleNavigate('/about')}>
            <ListItemIcon><InfoIcon color="primary" /></ListItemIcon>
            <ListItemText primary="About" />
          </ListItem>
          <ListItem button onClick={handleLogout}>
            <ListItemIcon><LogoutIcon color="error" /></ListItemIcon>
            <ListItemText primary="Logout" primaryTypographyProps={{ color: 'error' }} />
          </ListItem>
        </List>
      </Popover>

      {/* Page Header */}
      <Stack variant='elevation' elevation='2' sx={{ mt: '48px', px: 4, py: 3, backgroundColor: 'white', width: {xs:'100vw', md:'90vw'}, ...sx }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Box>
            {breadcrumbs.length > 0 && (
              <Breadcrumbs separator={<NavigateNext fontSize="small" />} sx={{ mb: 1 }}>
                {breadcrumbs.map((item, index) => (
                  <Typography
                    key={index}
                    color={index === breadcrumbs.length - 1 ? 'text.primary' : 'text.secondary'}
                    variant="body2"
                  >
                    {item}
                  </Typography>
                ))}
              </Breadcrumbs>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton
                onClick={onBack}
                sx={{ mr: 2, height: '100%', backgroundColor: 'white', boxShadow: 1 }}
              >
                {onBack ? <ArrowBack /> : <Home />}
              </IconButton>

              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="h5" sx={{ color: '#2a3042', fontWeight: 600 }}>
                  {pageTitle}
                </Typography>

                <Typography variant="subtitle1" color="text.secondary">
                  {pageSubtitle}
                </Typography>
              </Box>
            </Box>
          </Box>

          {actionButtons && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              {actionButtons}
            </Box>
          )}
        </Box>
      </Stack>
    </>
  );
}

export default PageHeader;