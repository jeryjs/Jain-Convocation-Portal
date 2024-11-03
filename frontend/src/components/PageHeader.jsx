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
  Paper,
  Breadcrumbs,
  Divider,
} from '@mui/material';
import {
  ArrowBack,
  KeyboardArrowDown,
  Logout as LogoutIcon,
  NavigateNext
} from '@mui/icons-material';
import JGIBanner from '../assets/jain.png';
import config from '../config';

function PageHeader({
  pageTitle,
  pageSubtitle,
  breadcrumbs = [],
  onBack,
  actionButtons,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const userdata = config.userdata;

  const handleProfileClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('userdata');
    window.location.reload();
  };

  return (
    <>
      {/* Main Header */}
      <AppBar position="fixed" elevation={0} sx={{ backgroundColor: '#2a3042' }}>
        <Toolbar sx={{ justifyContent: 'space-between', px: 4, width: '100%' }}>
          <img src={JGIBanner} alt="JGI Banner" style={{ height: '50px' }} />

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
              {(userdata?.name || userdata?.username)?.[0]?.toUpperCase()}
            </Avatar>
            <Typography variant="subtitle2" color="white" sx={{ mr: 1 }}>
              {userdata?.name || userdata?.username}
            </Typography>
            <KeyboardArrowDown sx={{ color: 'white', fontSize: 20 }} />
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
          <ListItem button onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon color="error" />
            </ListItemIcon>
            <ListItemText
              primary="Logout"
              primaryTypographyProps={{ color: 'error' }}
            />
          </ListItem>
        </List>
      </Popover>

      {/* Page Header */}
      <Box
        sx={{
          mt: '24px',
          px: 4,
          py: 3,
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #e9ecef',
          width: '90vw'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Box>
            {onBack && (
              <IconButton
                onClick={onBack}
                sx={{ mr: 2, backgroundColor: 'white', boxShadow: 1 }}
              >
                <ArrowBack />
              </IconButton>
            )}

            <Box sx={{ display: 'inline-block' }}>
              {breadcrumbs.length > 0 && (
                <Breadcrumbs
                  separator={<NavigateNext fontSize="small" />}
                  sx={{ mb: 1 }}
                >
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

              <Typography variant="h5" sx={{ color: '#2a3042', fontWeight: 600 }}>
                {pageTitle}
              </Typography>

              {pageSubtitle && (
                <Typography variant="subtitle1" color="text.secondary">
                  {pageSubtitle}
                </Typography>
              )}
            </Box>
          </Box>

          {actionButtons && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              {actionButtons}
            </Box>
          )}
        </Box>
      </Box>
    </>
  );
}

export default PageHeader;