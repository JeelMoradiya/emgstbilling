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

const RegisterSchema = Yup.object().shape({
  fullName: Yup.string().min(2, 'Too Short!').max(50, 'Too Long!').required('Full name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  mobileNo: Yup.string().matches(/^[0-9]{10}$/, 'Mobile number must be 10 digits').required('Mobile number is required'),
  address: Yup.string().min(5, 'Address too short').required('Address is required'),
  gstNo: Yup.string().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number').required('GST number is required'),
  gstOwnerName: Yup.string().min(2, 'Too Short!').required('GST owner name is required'),
  companyName: Yup.string().min(2, 'Too Short!').required('Company name is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .required('Password is required'),
  confirmPassword: Yup.string().oneOf([Yup.ref('password'), null], 'Passwords must match').required('Confirm password is required'),
});

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      const userData = {
        fullName: values.fullName,
        email: values.email,
        mobileNo: values.mobileNo,
        address: values.address,
        gstNo: values.gstNo,
        gstOwnerName: values.gstOwnerName,
        companyName: values.companyName,
      };
      await register(values.email, values.password, userData);
      toast.success('Registration successful');
      navigate('/');
    } catch (error) {
      console.error('Registration error:', error.code, error.message);
      switch (error.code) {
        case 'auth/invalid-email':
          toast.error('Invalid email format');
          break;
        case 'auth/weak-password':
          toast.error('Password must be at least 6 characters');
          break;
        case 'auth/email-already-in-use':
          toast.error('Email already registered');
          break;
        default:
          toast.error(error.message || 'Registration failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container 
      maxWidth="md" 
      sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'center',
        py: 4
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: 600 }}
      >
        <Card
          sx={{
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            borderRadius: 4,
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
            },
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Typography 
              variant="h5" 
              align="center" 
              sx={{ mb: 3, fontWeight: 'bold', color: 'primary.main' }}
            >
              Register
            </Typography>
            <Formik
              initialValues={{
                fullName: '',
                email: '',
                mobileNo: '',
                address: '',
                gstNo: '',
                gstOwnerName: '',
                companyName: '',
                password: '',
                confirmPassword: ''
              }}
              validationSchema={RegisterSchema}
              onSubmit={handleSubmit}
            >
              {({ errors, touched, handleChange, handleBlur, values, isSubmitting }) => (
                <Form>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <TextField 
                      fullWidth 
                      margin="normal" 
                      name="fullName" 
                      label="Full Name" 
                      value={values.fullName} 
                      onChange={handleChange} 
                      onBlur={handleBlur} 
                      error={touched.fullName && Boolean(errors.fullName)} 
                      helperText={touched.fullName && errors.fullName} 
                      sx={{ flex: '1 1 48%' }} 
                    />
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
                      sx={{ flex: '1 1 48%' }} 
                    />
                    <TextField 
                      fullWidth 
                      margin="normal" 
                      name="mobileNo" 
                      label="Mobile No." 
                      value={values.mobileNo} 
                      onChange={handleChange} 
                      onBlur={handleBlur} 
                      error={touched.mobileNo && Boolean(errors.mobileNo)} 
                      helperText={touched.mobileNo && errors.mobileNo} 
                      sx={{ flex: '1 1 48%' }} 
                    />
                    <TextField 
                      fullWidth 
                      margin="normal" 
                      name="gstNo" 
                      label="GST No" 
                      value={values.gstNo} 
                      onChange={handleChange} 
                      onBlur={handleBlur} 
                      error={touched.gstNo && Boolean(errors.gstNo)} 
                      helperText={touched.gstNo && errors.gstNo} 
                      sx={{ flex: '1 1 48%' }} 
                    />
                    <TextField 
                      fullWidth 
                      margin="normal" 
                      name="gstOwnerName" 
                      label="GST Owner Name" 
                      value={values.gstOwnerName} 
                      onChange={handleChange} 
                      onBlur={handleBlur} 
                      error={touched.gstOwnerName && Boolean(errors.gstOwnerName)} 
                      helperText={touched.gstOwnerName && errors.gstOwnerName} 
                      sx={{ flex: '1 1 48%' }} 
                    />
                    <TextField 
                      fullWidth 
                      margin="normal" 
                      name="companyName" 
                      label="Company Name" 
                      value={values.companyName} 
                      onChange={handleChange} 
                      onBlur={handleBlur} 
                      error={touched.companyName && Boolean(errors.companyName)} 
                      helperText={touched.companyName && errors.companyName} 
                      sx={{ flex: '1 1 48%' }} 
                    />
                    <TextField 
                      fullWidth 
                      margin="normal" 
                      name="address" 
                      label="Address" 
                      value={values.address} 
                      onChange={handleChange} 
                      onBlur={handleBlur} 
                      error={touched.address && Boolean(errors.address)} 
                      helperText={touched.address && errors.address} 
                      sx={{ flex: '1 1 100%' }} 
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
                      sx={{ flex: '1 1 48%' }}
                    />
                    <TextField
                      fullWidth
                      margin="normal"
                      name="confirmPassword"
                      label="Confirm Password"
                      type={showPassword ? 'text' : 'password'}
                      value={values.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.confirmPassword && Boolean(errors.confirmPassword)}
                      helperText={touched.confirmPassword && errors.confirmPassword}
                      sx={{ flex: '1 1 48%' }}
                    />
                  </Box>
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={isSubmitting}
                    sx={{
                      mt: 3,
                      py: 1.5,
                      borderRadius: 2,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      '&:hover': { boxShadow: '0 6px 16px rgba(0,0,0,0.2)' }
                    }}
                  >
                    {isSubmitting ? 'Registering...' : 'Register'}
                  </Button>
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Link component={RouterLink} to="/login" variant="body2">
                      Already have an account? Login
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

export default Register;