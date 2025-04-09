// src/components/Login.jsx
import { useState } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  IconButton, 
  InputAdornment, 
  Link, 
  Card, 
  CardContent 
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../contexts/AuthContext';
import Cookies from 'js-cookie';

const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .required('Email or Mobile is required')
    .test('emailOrMobile', 'Invalid email or mobile number', (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const mobileRegex = /^[0-9]{10}$/;
      return emailRegex.test(value) || mobileRegex.test(value);
    }),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
});

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      await login(values.email, values.password);
      // Store login data in localStorage and cookies for 1 day
      const loginData = { email: values.email, timestamp: Date.now() };
      localStorage.setItem('loginData', JSON.stringify(loginData));
      Cookies.set('loginData', JSON.stringify(loginData), { expires: 1 }); // 1 day expiry
      toast.success('Login successful!', { autoClose: 2000 });
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      toast.error(`Login failed: ${error.message}`, { autoClose: 3000 });
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
              Login
            </Typography>
            <Formik
              initialValues={{ email: '', password: '' }}
              validationSchema={LoginSchema}
              onSubmit={handleSubmit}
            >
              {({ errors, touched, handleChange, handleBlur, values, isSubmitting }) => (
                <Form>
                  <TextField
                    fullWidth
                    margin="normal"
                    name="email"
                    label="Email or Mobile"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.email && Boolean(errors.email)}
                    helperText={touched.email && errors.email}
                    variant="outlined"
                    sx={{ mb: 3 }}
                  />
                  <TextField
                    fullWidth
                    margin="normal"
                    name="password"
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.password && Boolean(errors.password)}
                    helperText={touched.password && errors.password}
                    variant="outlined"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton 
                            onClick={() => setShowPassword(!showPassword)} 
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
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
                    {isSubmitting ? 'Logging in...' : 'Login'}
                  </Button>
                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                    <Link component={RouterLink} to="/forgot-password" variant="body2" color="text.secondary">
                      Forgot Password?
                    </Link>
                    <Link component={RouterLink} to="/register" variant="body2" color="text.secondary">
                      Create Account
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

export default Login;