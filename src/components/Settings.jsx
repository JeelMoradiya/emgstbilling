import { useState, useEffect } from "react";
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Link, 
  Card, 
  CardContent, 
  Divider, 
  Grid, 
  Paper, 
  useMediaQuery,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert
} from '@mui/material';
import { 
  Lock as LockIcon,
  Security as SecurityIcon,
  PrivacyTip as PrivacyIcon,
  Notifications as NotificationsIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { Link as RouterLink } from 'react-router-dom';
import logo from "../assets/logo.gif"

const Settings = () => {
  const { changePassword, deleteAccount } = useAuth();
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const isMobile = useMediaQuery('(max-width:600px)');

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleNotificationChange = (type) => (e) => {
    setNotifications({ ...notifications, [type]: e.target.checked });
    toast.info(`${type.toUpperCase()} notifications ${e.target.checked ? 'enabled' : 'disabled'}`, { autoClose: 2000 });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
      setError('Passwords do not match');
      toast.error('Passwords do not match', { autoClose: 3000 });
      return;
    }
    try {
      await changePassword(passwordData.new);
      setSuccess(true);
      setPasswordData({ current: '', new: '', confirm: '' });
      setError('');
      toast.success('Password changed successfully!', { autoClose: 2000 });
    } catch (error) {
      setError(error.message);
      toast.error(`Failed to change password: ${error.message}`, { autoClose: 3000 });
    }
  };

  const handleOpenDeleteDialog = () => setOpenDeleteDialog(true);
  const handleCloseDeleteDialog = () => setOpenDeleteDialog(false);

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      toast.success('Account deleted successfully!', { autoClose: 2000 });
    } catch (error) {
      toast.error(`Failed to delete account: ${error.message}`, { autoClose: 3000 });
    }
    setOpenDeleteDialog(false);
  };

  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (loading) {
      setLoading(true);
      const timer = setTimeout(() => {
        setLoading(false);
      }, 3000); // 3 seconds

      return () => clearTimeout(timer); // Cleanup on unmount
    }
  }, [loading]);

  if (loading) {
    return (
      <Container
        maxWidth="lg"
        sx={{
          mt: { xs: 2, sm: 3, md: 4 },
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <img
          src={logo}
          alt="Logo"
          style={{ width: "100px", height: "100px" }}
        />
      </Container>
    );
  }

  return (
    <Container sx={{ py: isMobile ? 2 : 4, minHeight: '100vh', maxWidth: 'lg', bgcolor: 'white' }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Grid container spacing={3}>
          {/* Header */}
          <Grid item xs={12}>
            <Typography 
              variant={isMobile ? 'h5' : 'h4'} 
              sx={{ color: '#2c3e50', fontWeight: 'bold', mb: 2 }}
            >
              Your Account Settings
            </Typography>
            <Typography variant="body1" sx={{ color: '#2c3e50', mb: 3 }}>
              Manage your account preferences and security settings
            </Typography>
            <Divider sx={{ borderColor: '#e0e0e0' }} />
          </Grid>

          {/* Sidebar Navigation */}
          <Grid item xs={12} md={3}>
            <Paper sx={{ 
              p: 2, 
              borderRadius: 2, 
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              position: 'sticky',
              top: isMobile ? 0 : 24,
              bgcolor: '#f8f9fa'
            }}>
              <List>
                {[
                  { text: 'Password', icon: <LockIcon />, id: 'password' },
                  { text: 'Security', icon: <SecurityIcon />, id: 'security' },
                  { text: 'Notifications', icon: <NotificationsIcon />, id: 'notifications' },
                  { text: 'Privacy', icon: <PrivacyIcon />, id: 'privacy' },
                  { text: 'Delete Account', icon: <DeleteIcon />, id: 'delete' }
                ].map((item) => (
                  <ListItem 
                    key={item.id}
                    onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })}
                    sx={{ 
                      borderRadius: 1,
                      py: 1,
                      '&:hover': { bgcolor: '#e9ecef' },
                      cursor: 'pointer'
                    }}
                  >
                    <ListItemIcon sx={{ color: '#2c3e50', minWidth: 40 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.text} 
                      primaryTypographyProps={{ 
                        color: '#2c3e50', 
                        fontWeight: 'medium',
                        fontSize: isMobile ? '0.9rem' : '1rem'
                      }} 
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>

          {/* Main Content */}
          <Grid item xs={12} md={9}>
            {/* Password Section */}
            <Card id="password" sx={{ mb: 3, borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', bgcolor: '#fff' }}>
              <CardContent sx={{ p: isMobile ? 3 : 4 }}>
                <Typography variant="h6" sx={{ color: '#2c3e50', mb: 2, fontWeight: 'bold' }}>
                  Change Password
                </Typography>
                <Typography variant="body2" sx={{ color: '#2c3e50', mb: 2 }}>
                  Update your password to keep your account secure
                </Typography>
                <Divider sx={{ mb: 3, borderColor: '#e0e0e0' }} />
                {error && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 1 }}>
                    {error}
                  </Alert>
                )}
                {success && (
                  <Alert severity="success" sx={{ mb: 2, borderRadius: 1 }}>
                    Password changed successfully!
                  </Alert>
                )}
                <Box component="form" onSubmit={handlePasswordSubmit}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        type="password"
                        label="Current Password"
                        name="current"
                        value={passwordData.current}
                        onChange={handlePasswordChange}
                        variant="outlined"
                        sx={{ 
                          '& .MuiInputLabel-root': { color: '#2c3e50' },
                          '& .MuiOutlinedInput-root': { borderRadius: 1 }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        type="password"
                        label="New Password"
                        name="new"
                        value={passwordData.new}
                        onChange={handlePasswordChange}
                        variant="outlined"
                        sx={{ 
                          '& .MuiInputLabel-root': { color: '#2c3e50' },
                          '& .MuiOutlinedInput-root': { borderRadius: 1 }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        type="password"
                        label="Confirm New Password"
                        name="confirm"
                        value={passwordData.confirm}
                        onChange={handlePasswordChange}
                        variant="outlined"
                        sx={{ 
                          '& .MuiInputLabel-root': { color: '#2c3e50' },
                          '& .MuiOutlinedInput-root': { borderRadius: 1 }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        type="submit"
                        variant="contained"
                        sx={{
                          py: 1.5,
                          borderRadius: 1,
                          bgcolor: '#2c3e50',
                          color: 'white',
                          '&:hover': { bgcolor: '#34495e' },
                          fontSize: isMobile ? '0.9rem' : '1rem',
                          mt: 2,
                          width: isMobile ? '100%' : 'auto'
                        }}
                      >
                        Save Password
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>

            {/* Security Section */}
            <Card id="security" sx={{ mb: 3, borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', bgcolor: '#fff' }}>
              <CardContent sx={{ p: isMobile ? 3 : 4 }}>
                <Typography variant="h6" sx={{ color: '#2c3e50', mb: 2, fontWeight: 'bold' }}>
                  Security
                </Typography>
                <Typography variant="body2" sx={{ color: '#2c3e50', mb: 2 }}>
                  Enhance your account protection
                </Typography>
                <Divider sx={{ mb: 3, borderColor: '#e0e0e0' }} />
                <Box>
                  <Typography variant="body1" sx={{ color: '#2c3e50', fontWeight: 'medium', mb: 1 }}>
                    Two-Factor Authentication
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#2c3e50', mb: 2 }}>
                    Not enabled
                  </Typography>
                  <Button
                    variant="contained"
                    sx={{
                      py: 1.5,
                      borderRadius: 1,
                      bgcolor: '#2c3e50',
                      color: 'white',
                      '&:hover': { bgcolor: '#34495e' },
                      fontSize: isMobile ? '0.9rem' : '1rem',
                      width: isMobile ? '100%' : 'auto'
                    }}
                    onClick={() => toast.info('Two-Factor Authentication setup coming soon!', { autoClose: 2000 })}
                  >
                    Enable 2FA
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* Notifications Section */}
            <Card id="notifications" sx={{ mb: 3, borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', bgcolor: '#fff' }}>
              <CardContent sx={{ p: isMobile ? 3 : 4 }}>
                <Typography variant="h6" sx={{ color: '#2c3e50', mb: 2, fontWeight: 'bold' }}>
                  Notifications
                </Typography>
                <Typography variant="body2" sx={{ color: '#2c3e50', mb: 2 }}>
                  Control how you receive updates
                </Typography>
                <Divider sx={{ mb: 3, borderColor: '#e0e0e0' }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ color: '#2c3e50', fontWeight: 'medium' }}>
                      Email Notifications
                    </Typography>
                    <Switch
                      checked={notifications.email}
                      onChange={handleNotificationChange('email')}
                      sx={{ color: '#2c3e50' }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ color: '#2c3e50', fontWeight: 'medium' }}>
                      SMS Notifications
                    </Typography>
                    <Switch
                      checked={notifications.sms}
                      onChange={handleNotificationChange('sms')}
                      sx={{ color: '#2c3e50' }}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Privacy Section */}
            <Card id="privacy" sx={{ mb: 3, borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', bgcolor: '#fff' }}>
              <CardContent sx={{ p: isMobile ? 3 : 4 }}>
                <Typography variant="h6" sx={{ color: '#2c3e50', mb: 2, fontWeight: 'bold' }}>
                  Privacy
                </Typography>
                <Typography variant="body2" sx={{ color: '#2c3e50', mb: 2 }}>
                  Manage your privacy settings
                </Typography>
                <Divider sx={{ mb: 3, borderColor: '#e0e0e0' }} />
                <Box>
                  <Typography variant="body1" sx={{ color: '#2c3e50', fontWeight: 'medium', mb: 1 }}>
                    Privacy Policy
                  </Typography>
                  <Link component={RouterLink} to="/privacy-policy" sx={{ color: '#2c3e50', textDecoration: 'underline' }}>
                    View our Privacy Policy
                  </Link>
                </Box>
              </CardContent>
            </Card>

            {/* Delete Account Section */}
            <Card id="delete" sx={{ borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', bgcolor: '#fff' }}>
              <CardContent sx={{ p: isMobile ? 3 : 4 }}>
                <Typography variant="h6" sx={{ color: '#2c3e50', mb: 2, fontWeight: 'bold' }}>
                  Delete Account
                </Typography>
                <Typography variant="body2" sx={{ color: '#2c3e50', mb: 2 }}>
                  Permanently remove your account and all associated data
                </Typography>
                <Divider sx={{ mb: 3, borderColor: '#e0e0e0' }} />
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleOpenDeleteDialog}
                  sx={{
                    py: 1.5,
                    borderRadius: 1,
                    fontSize: isMobile ? '0.9rem' : '1rem',
                    width: isMobile ? '100%' : 'auto'
                  }}
                >
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Dialog
          open={openDeleteDialog}
          onClose={handleCloseDeleteDialog}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle sx={{ color: '#2c3e50', fontWeight: 'bold' }}>
            Delete Account
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ color: '#2c3e50' }}>
              Are you sure you want to delete your account? This action cannot be undone, and all your data will be permanently removed.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={handleCloseDeleteDialog}
              sx={{ 
                color: '#2c3e50',
                fontSize: isMobile ? '0.9rem' : '1rem'
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAccount}
              color="error"
              sx={{
                fontSize: isMobile ? '0.9rem' : '1rem'
              }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </motion.div>
    </Container>
  );
};

export default Settings;