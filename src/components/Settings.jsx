// src/components/Settings.jsx
import { useState } from 'react';
import { Container, Box, Typography, TextField, Button, Switch, Link } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

const Settings = ({ setThemeMode }) => {
  const { changePassword } = useAuth();
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [darkMode, setDarkMode] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
      setError('Passwords do not match');
      return;
    }
    try {
      await changePassword(passwordData.new);
      setSuccess(true);
      setPasswordData({ current: '', new: '', confirm: '' });
      setError('');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleThemeChange = (event) => {
    setDarkMode(event.target.checked);
    setThemeMode(event.target.checked ? 'dark' : 'light');
  };

  return (
    <Container maxWidth="sm">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Box sx={{ mt: 4 }}>
          <Typography variant="h4" gutterBottom>Settings</Typography>
          
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6">Theme</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography>Light</Typography>
              <Switch checked={darkMode} onChange={handleThemeChange} />
              <Typography>Dark</Typography>
            </Box>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h6">Change Password</Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>Password changed successfully!</Alert>}
            <Box component="form" onSubmit={handlePasswordSubmit}>
              <TextField
                fullWidth
                margin="normal"
                type="password"
                label="Current Password"
                name="current"
                value={passwordData.current}
                onChange={handlePasswordChange}
              />
              <TextField
                fullWidth
                margin="normal"
                type="password"
                label="New Password"
                name="new"
                value={passwordData.new}
                onChange={handlePasswordChange}
              />
              <TextField
                fullWidth
                margin="normal"
                type="password"
                label="Confirm New Password"
                name="confirm"
                value={passwordData.confirm}
                onChange={handlePasswordChange}
              />
              <Button type="submit" variant="contained" sx={{ mt: 2 }}>
                Change Password
              </Button>
            </Box>
          </Box>

          <Box>
            <Link href="/privacy-policy" target="_blank">Privacy Policy</Link>
          </Box>
        </Box>
      </motion.div>
    </Container>
  );
};

export default Settings;