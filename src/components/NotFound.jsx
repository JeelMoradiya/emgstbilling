import { Container, Typography, Button, Box, useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const NotFound = () => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:600px)');

  return (
    <Container sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'white' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ textAlign: 'center', maxWidth: '600px', mx: 'auto' }}>
          <Typography 
            variant={isMobile ? 'h3' : 'h1'} 
            sx={{ color: '#2c3e50', fontWeight: 'bold', mb: 2 }}
          >
            404
          </Typography>
          <Typography 
            variant={isMobile ? 'h6' : 'h5'} 
            sx={{ color: '#2c3e50', mb: 3 }}
          >
            Page Not Found
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ color: '#2c3e50', mb: 4 }}
          >
            The page you're looking for doesn't exist or has been moved.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/')}
            sx={{
              py: 1.5,
              borderRadius: 1,
              bgcolor: '#2c3e50',
              color: 'white',
              '&:hover': { bgcolor: '#34495e' },
              fontSize: isMobile ? '0.9rem' : '1rem',
              width: isMobile ? '100%' : 'auto'
            }}
          >
            Go to Home
          </Button>
        </Box>
      </motion.div>
    </Container>
  );
};

export default NotFound;