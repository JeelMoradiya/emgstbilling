import { useState, useEffect } from 'react';
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
  CardContent,
  FormControlLabel,
  Checkbox,
  useMediaQuery,
  useTheme
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
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Get initial values from localStorage or cookies
  const getInitialValues = () => {
    const storedData = JSON.parse(localStorage.getItem('loginData') || '{}') || 
                      JSON.parse(Cookies.get('loginData') || '{}');
    return {
      email: storedData.email || '',
      password: storedData.password || '',
    };
  };

  // Check if "Remember Me" should be checked on mount
  useEffect(() => {
    const storedData = JSON.parse(localStorage.getItem('loginData') || '{}') || 
                      JSON.parse(Cookies.get('loginData') || '{}');
    if (storedData.rememberMe && storedData.timestamp) {
      // Check if data is less than 2 hours old
      const twoHoursInMs = 2 * 60 * 60 * 1000;
      if (Date.now() - storedData.timestamp < twoHoursInMs) {
        setRememberMe(true);
      }
    }
  }, []);

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      await login(values.email, values.password);
      if (rememberMe) {
        const loginData = { 
          email: values.email,
          password: values.password,
          timestamp: Date.now(),
          rememberMe: true 
        };
        localStorage.setItem('loginData', JSON.stringify(loginData));
        // Set cookie to expire in 2 hours (2/24 of a day)
        Cookies.set('loginData', JSON.stringify(loginData), { expires: 2 / 24 });
      } else {
        localStorage.removeItem('loginData');
        Cookies.remove('loginData');
      }
      toast.success('Login successful!', { autoClose: 2000 });
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      toast.error(`Login failed: ${error.message}`, { autoClose: 3000 });
    }
    setSubmitting(false);
  };

  return (
    <Container
      maxWidth={false}
      sx={{
        minWidth: '100vw',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        m: 0,
        p: 0
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: isMobile ? '90%' : 450 }}
      >
        <Card
          sx={{
            width: '100%',
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
          <CardContent sx={{ p: isMobile ? 3 : 5 }}>
            <Typography
              variant={isMobile ? 'h5' : 'h4'}
              align='center'
              sx={{ mb: 4, fontWeight: 'bold', color: 'primary.main' }}
            >
              Login
            </Typography>
            <Formik
              initialValues={getInitialValues()}
              validationSchema={LoginSchema}
              onSubmit={handleSubmit}
            >
              {({
                errors,
                touched,
                handleChange,
                handleBlur,
                values,
                isSubmitting,
              }) => (
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
                    sx={{ mb: 3 }}
                  />
                  <TextField
                    fullWidth
                    margin='normal'
                    name='password'
                    label='Password'
                    type={showPassword ? 'text' : 'password'}
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.password && Boolean(errors.password)}
                    helperText={touched.password && errors.password}
                    variant='outlined'
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position='end'>
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge='end'
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 2 }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        color='primary'
                      />
                    }
                    label='Remember Me'
                    sx={{ mb: 2 }}
                  />
                  <Button
                    type='submit'
                    fullWidth
                    variant='contained'
                    disabled={isSubmitting}
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                      fontSize: isMobile ? '0.9rem' : '1rem',
                    }}
                  >
                    {isSubmitting ? 'Logging in...' : 'Login'}
                  </Button>
                  <Box
                    sx={{
                      mt: 3,
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: isMobile ? 2 : 0
                    }}
                  >
                    <Link
                      component={RouterLink}
                      to='/forgot-password'
                      variant='body2'
                      color='text.secondary'
                    >
                      Forgot Password?
                    </Link>
                    <Link
                      component={RouterLink}
                      to='/register'
                      variant='body2'
                      color='text.secondary'
                    >
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