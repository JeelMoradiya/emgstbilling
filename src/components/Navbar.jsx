// src/components/Navbar.js
import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Avatar,
  Box,
  Menu,
  MenuItem,
  IconButton,
  Divider,
  ListItemIcon,
  Drawer,
  useTheme,
} from '@mui/material';
import {
  AccountCircle,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

const Navbar = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  const open = Boolean(anchorEl);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    handleClose();
    navigate('/profile');
  };

  const handleSettings = () => {
    handleClose();
    navigate('/settings');
  };

  const handleLogout = async () => {
    try {
      handleClose();
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const getAvatarText = () => {
    if (userProfile?.companyName) {
      return userProfile.companyName.charAt(0).toUpperCase();
    } else if (userProfile?.fullName) {
      return userProfile.fullName.charAt(0).toUpperCase();
    } else if (currentUser?.displayName) {
      return currentUser.displayName.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const drawerContent = (
    <Box
      sx={{
        width: 250,
        height: '100%',
        bgcolor: theme.palette.primary.main,
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        p: 2,
      }}
    >
      <Typography
        variant="h6"
        sx={{ fontWeight: 'bold', mb: 3, textAlign: 'center' }}
      >
        GST Billing System
      </Typography>
      <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.3)', mb: 2 }} />
      <Button
        color="inherit"
        component={RouterLink}
        to="/"
        sx={{ mb: 2, justifyContent: 'flex-start', color: 'white' }}
        onClick={toggleDrawer}
      >
        Home
      </Button>
      <Button
        color="inherit"
        component={RouterLink}
        to="/parties"
        sx={{ mb: 2, justifyContent: 'flex-start', color: 'white' }}
        onClick={toggleDrawer}
      >
        All Parties
      </Button>
      <Box sx={{ flexGrow: 1 }} />
      <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.3)', mb: 2 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Avatar
          sx={{
            width: 40,
            height: 40,
            bgcolor: theme.palette.secondary.main,
            fontSize: '1.2rem',
            fontWeight: 'bold',
            mr: 1,
          }}
        >
          {getAvatarText()}
        </Avatar>
        <Typography variant="subtitle1" fontWeight="bold">
          {userProfile?.fullName || currentUser?.displayName || 'User'}
        </Typography>
      </Box>
      <Button
        color="inherit"
        onClick={handleProfile}
        sx={{ justifyContent: 'flex-start', color: 'white' }}
      >
        Profile
      </Button>
      <Button
        color="inherit"
        onClick={handleSettings}
        sx={{ justifyContent: 'flex-start', color: 'white' }}
      >
        Settings
      </Button>
      <Button
        color="inherit"
        onClick={handleLogout}
        sx={{ justifyContent: 'flex-start', color: 'white' }}
      >
        Logout
      </Button>
    </Box>
  );

  return (
    <AppBar
      position="static"
      elevation={4}
      sx={{
        background: "linear-gradient(45deg, #1976d2, #42a5f5)",
        borderBottom: `3px solid ${theme.palette.primary.dark}`,
        boxShadow: "6 5px 25px rgba(84, 84, 84, 0.1)",
      }}
    >
      <Container maxWidth="xl">
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={toggleDrawer}
            sx={{ display: { xs: "block", md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              textDecoration: "none",
              color: "white",
              fontWeight: "bold",
              display: { xs: "none", md: "block" },
            }}
          >
            GST Billing System
          </Typography>

          <Box
            sx={{ display: { xs: "none", md: "flex" }, alignItems: "center" }}
          >
            <Button
              color="inherit"
              component={RouterLink}
              to="/"
              sx={{
                mx: 1,
                fontWeight: "medium",
                "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)" },
              }}
            >
              Home
            </Button>
            <Button
              color="inherit"
              component={RouterLink}
              to="/parties"
              sx={{
                mx: 1,
                fontWeight: "medium",
                "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)" },
              }}
            >
              All Parties
            </Button>

            <Box sx={{ ml: 2 }}>
              <IconButton
                onClick={handleMenu}
                size="medium"
                aria-controls={open ? "account-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={open ? "true" : undefined}
              >
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: theme.palette.secondary.main,
                    fontSize: "1.2rem",
                    fontWeight: "bold",
                  }}
                >
                  {getAvatarText()}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                id="account-menu"
                open={open}
                onClose={handleClose}
                PaperProps={{
                  elevation: 5,
                  sx: {
                    overflow: "visible",
                    filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.15))",
                    mt: 1.5,
                    minWidth: 200,
                    borderRadius: 2,
                    bgcolor: "background.paper",
                  },
                }}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {userProfile?.fullName ||
                      currentUser?.displayName ||
                      "User"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {userProfile?.companyName || "No company"}
                  </Typography>
                </Box>
                <Divider />
                <MenuItem onClick={handleProfile}>
                  <ListItemIcon>
                    <AccountCircle fontSize="small" />
                  </ListItemIcon>
                  Profile
                </MenuItem>
                <MenuItem onClick={handleSettings}>
                  <ListItemIcon>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  Settings
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>
            </Box>
          </Box>
        </Toolbar>
      </Container>

      {/* Drawer for mobile view */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer}
        sx={{ "& .MuiDrawer-paper": { width: 250 } }}
      >
        <motion.div
          initial={{ x: -250 }}
          animate={{ x: 0 }}
          exit={{ x: -250 }}
          transition={{ duration: 0.3 }}
        >
          {drawerContent}
        </motion.div>
      </Drawer>
    </AppBar>
  );
};

export default Navbar;