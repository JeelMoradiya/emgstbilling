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
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ width: '100%' }}
      >
        <Card
          sx={{
            maxWidth: 450,
            mx: 'auto',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
            borderRadius: 3,
            bgcolor: 'white',
            overflow: 'hidden',
            '&:hover': {
              boxShadow: '0 14px 40px rgba(0, 0, 0, 0.2)',
            },
          }}
        >
          <CardContent sx={{ p: 5 }}>
            <Typography 
              variant="h4" 
              align="center" 
              sx={{ mb: 4, fontWeight: 'bold', color: 'primary.main' }}
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
                    margin="normal"
                    name="email"
                    label="Email"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.email && Boolean(errors.email)}
                    helperText={touched.email && errors.email}
                    variant="outlined"
                    sx={{ mb: 4 }}
                  />
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={isSubmitting}
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                    }}
                  >
                    {isSubmitting ? 'Sending...' : 'Reset Password'}
                  </Button>
                  <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Link component={RouterLink} to="/login" variant="body2" color="text.secondary">
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