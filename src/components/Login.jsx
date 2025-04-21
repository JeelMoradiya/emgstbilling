import { useState } from "react";
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
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/weblogo.png";

const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .required("Email or Mobile is required")
    .test("emailOrMobile", "Invalid email or mobile number", (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const mobileRegex = /^[0-9]{10}$/;
      return emailRegex.test(value) || mobileRegex.test(value);
    }),
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .required("Password is required"),
});

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const isMobile = useMediaQuery("(max-width:600px)");

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      await login(values.email, values.password, rememberMe);
      toast.success("Login successful!", { autoClose: 2000 });
      setTimeout(() => navigate("/home"), 2000);
    } catch (error) {
      toast.error(`Login failed: ${error.message}`, { autoClose: 3000 });
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
              variant={isMobile ? "h5" : "h4"}
              align="left"
              sx={{ mb: 2, fontWeight: "bold", color: "#2c3e50" }}
            >
              Sign In
            </Typography>
            <Formik
              initialValues={{ email: "", password: "" }}
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
                    margin="normal"
                    name="email"
                    label="Email or Mobile"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.email && Boolean(errors.email)}
                    helperText={touched.email && errors.email}
                    variant="outlined"
                    sx={{
                      mb: 2,
                      "& .MuiInputLabel-root": { color: "#2c3e50" },
                    }}
                  />
                  <TextField
                    fullWidth
                    margin="normal"
                    name="password"
                    label="Password"
                    type={showPassword ? "text" : "password"}
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
                    sx={{
                      mb: 2,
                      "& .MuiInputLabel-root": { color: "#2c3e50" },
                    }}
                  />
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                      flexDirection: isMobile ? "column" : "row",
                      gap: isMobile ? 1 : 0,
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          sx={{ color: "#2c3e50" }}
                        />
                      }
                      label="Remember Me"
                      sx={{ color: "#2c3e50" }}
                    />
                    <Link
                      component={RouterLink}
                      to="/forgot-password"
                      variant="body2"
                      sx={{ color: "#2c3e50" }}
                    >
                      Forgot Password?
                    </Link>
                  </Box>
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
                    {isSubmitting ? "Logging in..." : "Login"}
                  </Button>
                  <Box sx={{ mt: 2, textAlign: "center" }}>
                    Don’t have an account?{" "}
                    <Link
                      component={RouterLink}
                      to="/register"
                      variant="body2"
                      sx={{ color: "#2c3e50" }}
                    >
                      Create One Now!
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
