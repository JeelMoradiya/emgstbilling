// src/components/ForgotPassword.jsx
import { 
    Container, 
    Box, 
    Typography, 
    TextField, 
    Button, 
    Link, 
    Card, 
    CardContent 
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
  
    const handleSubmit = async (values, { setSubmitting }) => {
      try {
        await resetPassword(values.email);
        toast.success('Password reset email sent successfully');
        setTimeout(() => navigate('/login'), 2000);
      } catch (error) {
        toast.error(error.message);
      }
      setSubmitting(false);
    };
  
    return (
      <Container 
        maxWidth="sm" 
        sx={{ 
          height: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          overflow: 'hidden' 
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotateX: 20 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: '100%' }}
        >
          <Card
            sx={{
              maxWidth: 400,
              mx: 'auto',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              transform: 'perspective(1000px) rotateX(2deg)',
              transition: 'transform 0.3s ease-in-out',
              '&:hover': {
                transform: 'perspective(1000px) rotateX(0deg) translateY(-5px)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
              },
              bgcolor: 'background.paper',
              borderRadius: 4,
              overflow: 'hidden',
              scrollbarWidth: 'none', // Firefox
              '&::-webkit-scrollbar': { display: 'none' } // Webkit
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Typography 
                variant="h5" 
                align="center" 
                sx={{ mb: 3, fontWeight: 700, color: 'primary.main' }}
              >
                Forgot Password
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
                      margin="normal"
                      name="email"
                      label="Email"
                      value={values.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.email && Boolean(errors.email)}
                      helperText={touched.email && errors.email}
                      variant="outlined"
                      sx={{ mb: 3 }}
                    />
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      disabled={isSubmitting}
                      sx={{
                        py: 1.5,
                        borderRadius: 2,
                        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                        '&:hover': { boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)' },
                      }}
                    >
                      {isSubmitting ? 'Sending...' : 'Reset Password'}
                    </Button>
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                      <Link component={RouterLink} to="/login" variant="body2">
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