import { Container, Typography, Box, useMediaQuery } from '@mui/material';
import { motion } from 'framer-motion';

const PrivacyPolicy = () => {
  const isMobile = useMediaQuery('(max-width:600px)');

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