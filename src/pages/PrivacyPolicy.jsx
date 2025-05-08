import { useState, useEffect } from "react";
import { Container, Typography, Box, useMediaQuery } from '@mui/material';
import { motion } from 'framer-motion';
import logo from "../assets/logo.gif"

const PrivacyPolicy = () => {
  const isMobile = useMediaQuery('(max-width:600px)');
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
        <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
          <Typography 
            variant={isMobile ? 'h5' : 'h4'} 
            sx={{ color: '#2c3e50', fontWeight: 'bold', mb: 3 }}
          >
            Privacy Policy
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ color: '#2c3e50', mb: 2 }}
          >
            This is a sample privacy policy for your application. Please update this content with your actual privacy policy details.
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ color: '#2c3e50', mb: 2 }}
          >
            Your privacy is important to us. This policy explains how we collect, use, and protect your personal information when you use our services.
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ color: '#2c3e50', fontWeight: 'bold', mt: 3, mb: 1 }}
          >
            Information We Collect
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ color: '#2c3e50', mb: 2 }}
          >
            We collect information you provide directly to us, such as when you create an account, update your profile, or contact us.
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ color: '#2c3e50', fontWeight: 'bold', mt: 3, mb: 1 }}
          >
            How We Use Your Information
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ color: '#2c3e50', mb: 2 }}
          >
            We use your information to provide and improve our services, process transactions, and communicate with you.
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ color: '#2c3e50', fontWeight: 'bold', mt: 3, mb: 1 }}
          >
            Contact Us
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ color: '#2c3e50', mb: 2 }}
          >
            If you have any questions about this Privacy Policy, please contact us at jeelmoradiya05@gmail.com.
          </Typography>
        </Box>
      </motion.div>
    </Container>
  );
};

export default PrivacyPolicy;