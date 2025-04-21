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
import logo from '../assets/weblogo.png';

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
        minWidth: "100vw",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(rgba(245, 247, 250, 0.8), rgba(245, 247, 250, 0.8)), url(${logo}) no-repeat left center/cover`,
        backgroundSize: "45%",
        position: "relative",
        m: 0,
        p: 0,
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(245, 247, 250, 0.5)",
          zIndex: 1,
        },
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          width: "100%",
          maxWidth: isMobile ? "90%" : "400px",
          zIndex: 2,
        }}
      >
        <Card
          sx={{
            width: "100%",
            boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
            borderRadius: 2,
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
          }}
        >
          <CardContent sx={{ p: isMobile ? 3 : 4 }}>
            <Typography
              variant={isMobile ? "h6" : "h5"}
              align="left"
              sx={{ mb: 1, fontWeight: "bold", color: "#2c3e50" }}
            >
              Forgot your password?
            </Typography>
            <Typography
              align="left"
              sx={{
                mb: 1,
                color: "#2c3e50",
                fontSize: isMobile ? "1rem" : "1rem",
              }}
            >
              Please enter the email address associated with your account
            </Typography>
            <Formik
              initialValues={{ email: "" }}
              validationSchema={ForgotPasswordSchema}
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
                    margin="normal"
                    name="email"
                    label="Email"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.email && Boolean(errors.email)}
                    helperText={touched.email && errors.email}
                    variant="outlined"
                    sx={{
                      mb: 3,
                      "& .MuiInputLabel-root": { color: "#2c3e50" },
                    }}
                  />
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={isSubmitting}
                    sx={{
                      py: 1.5,
                      borderRadius: 1,
                      bgcolor: "#2c3e50",
                      color: "white",
                      "&:hover": { bgcolor: "#34495e" },
                      fontSize: isMobile ? "0.9rem" : "1rem",
                    }}
                  >
                    {isSubmitting ? "Sending..." : "Reset Password"}
                  </Button>
                  <Box sx={{ mt: 2, textAlign: "center" }}>
                    <Link
                      component={RouterLink}
                      to="/login"
                      variant="body2"
                      sx={{ color: "#2c3e50" }}
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