import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Link, 
  Card, 
  CardContent,
  useMediaQuery
} from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../contexts/AuthContext';

const ForgotPasswordSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email')
    .required('Email is required'),
});

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const isMobile = useMediaQuery('(max-width:600px)');

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      await resetPassword(values.email);
      toast.success('Password reset email sent successfully!', { autoClose: 2000 });
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      toast.error(`Failed to send reset email: ${error.message}`, { autoClose: 3000 });
    }
    setSubmitting(false);
  };

  return (
    <Container 
      sx={{ 
        minWidth: '100vw',
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f5f7fa',
        m: 0,
        p: 0
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ width: '100%', maxWidth: isMobile ? '90%' : '400px' }}
      >
        <Card
          sx={{
            width: '100%',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            borderRadius: 2,
            bgcolor: 'white',
          }}
        >
          <CardContent sx={{ p: isMobile ? 3 : 4 }}>
            <Typography 
              variant={isMobile ? 'h5' : 'h4'} 
              align='center' 
              sx={{ mb: 3, fontWeight: 'bold', color: '#2c3e50' }}
            >
              Reset Password
            </Typography>
            <Formik
              initialValues={{ email: '' }}
              validationSchema={ForgotPasswordSchema}
              onSubmit={handleSubmit}
            >
              {({ errors, touched, handleChange, handleBlur, values, isSubmitting }) => (
                <Form>
                  <TextField
                    fullWidth
                    margin='normal'
                    name='email'
                    label='Email'
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.email && Boolean(errors.email)}
                    helperText={touched.email && errors.email}
                    variant='outlined'
                    sx={{ mb: 3, '& .MuiInputLabel-root': { color: '#2c3e50' } }}
                  />
                  <Button
                    type='submit'
                    fullWidth
                    variant='contained'
                    disabled={isSubmitting}
                    sx={{
                      py: 1.5,
                      borderRadius: 1,
                      bgcolor: '#2c3e50',
                      color: 'white',
                      '&:hover': { bgcolor: '#34495e' },
                      fontSize: isMobile ? '0.9rem' : '1rem',
                    }}
                  >
                    {isSubmitting ? 'Sending...' : 'Reset Password'}
                  </Button>
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Link 
                      component={RouterLink} 
                      to='/login' 
                      variant='body2' 
                      sx={{ color: '#2c3e50' }}
                    >
                      Back to Login
                    </Link>
                  </Box>
                </Form>
              )}
            </Formik>
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  );
};

export default ForgotPassword;