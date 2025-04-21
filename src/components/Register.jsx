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
  Stepper,
  Step,
  StepLabel,
  MenuItem,
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

const RegisterSchema = Yup.object().shape({
  fullName: Yup.string()
    .min(2, "Too Short!")
    .max(50, "Too Long!")
    .required("Full name is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  mobileNo: Yup.string()
    .matches(/^[0-9]{10}$/, "Mobile number must be 10 digits")
    .required("Mobile number is required"),
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .matches(/[a-z]/, "Password must contain at least one lowercase letter")
    .matches(/[A-Z]/, "Password must contain at least one uppercase letter")
    .matches(/[0-9]/, "Password must contain at least one number")
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password"), null], "Passwords must match")
    .required("Confirm password is required"),
  companyName: Yup.string()
    .min(2, "Too Short!")
    .required("Company name is required"),
  gstOwnerName: Yup.string()
    .min(2, "Too Short!")
    .required("GST owner name is required"),
  gstNo: Yup.string()
    .matches(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      "Invalid GST number"
    )
    .required("GST number is required"),
  plotHouseNo: Yup.string().required("Plot/House No. is required"),
  line1: Yup.string().required("Line 1 is required"),
  area: Yup.string().required("Area is required"),
  landmark: Yup.string().required("Landmark is required"),
  city: Yup.string().required("City is required"),
  state: Yup.string().required("State is required"),
  pincode: Yup.string()
    .matches(/^[0-9]{6}$/, "Pincode must be 6 digits")
    .required("Pincode is required"),
});

const steps = ["User Information", "GST Information", "Address Information"];

const stateCityMapping = {
  Gujarat: [
    "Ahmedabad",
    "Surat",
    "Vadodara",
    "Rajkot",
    "Bhavnagar",
    "Jamnagar",
    "Gandhinagar",
    "Junagadh",
    "Anand",
    "Nadiad",
  ],
  Maharashtra: [
    "Mumbai",
    "Pune",
    "Nagpur",
    "Thane",
    "Nashik",
    "Aurangabad",
    "Solapur",
    "Kolhapur",
    "Amravati",
    "Nanded",
  ],
  Delhi: ["New Delhi", "Delhi"],
  Karnataka: [
    "Bangalore",
    "Mysore",
    "Hubli",
    "Mangalore",
    "Belgaum",
    "Gulbarga",
    "Davanagere",
    "Bellary",
    "Bijapur",
    "Shimoga",
  ],
  "Tamil Nadu": [
    "Chennai",
    "Coimbatore",
    "Madurai",
    "Tiruchirappalli",
    "Salem",
    "Tirunelveli",
    "Erode",
    "Vellore",
    "Thoothukudi",
    "Dindigul",
  ],
};

const Register = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedState, setSelectedState] = useState("");
  const navigate = useNavigate();
  const { register } = useAuth();
  const isMobile = useMediaQuery("(max-width:600px)");

  const states = Object.keys(stateCityMapping);

  const handleSubmit = async (values) => {
    try {
      const userData = {
        fullName: values.fullName,
        email: values.email,
        mobileNo: values.mobileNo,
        companyName: values.companyName,
        gstOwnerName: values.gstOwnerName,
        gstNo: values.gstNo,
        address: {
          plotHouseNo: values.plotHouseNo,
          line1: values.line1,
          area: values.area,
          landmark: values.landmark,
          city: values.city,
          state: values.state,
          pincode: values.pincode,
        },
      };
      await register(values.email, values.password, userData, "user");
      toast.success("Registration successful!", { autoClose: 2000 });
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (error) {
      toast.error(`Registration failed: ${error.message}`, { autoClose: 3000 });
    }
  };

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const getStepContent = (
    step,
    { errors, touched, handleChange, handleBlur, values }
  ) => {
    switch (step) {
      case 0:
        return (
          <Box
            sx={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
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
              sx={{ flex: isMobile ? "1 1 100%" : "1 1 48%" }}
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
              sx={{ flex: isMobile ? "1 1 100%" : "1 1 48%" }}
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
              sx={{ flex: isMobile ? "1 1 100%" : "1 1 48%" }}
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
              sx={{ flex: isMobile ? "1 1 100%" : "1 1 48%" }}
            />
            <TextField
              fullWidth
              margin="normal"
              name="confirmPassword"
              label="Confirm Password"
              type={showPassword ? "text" : "password"}
              value={values.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.confirmPassword && Boolean(errors.confirmPassword)}
              helperText={touched.confirmPassword && errors.confirmPassword}
              sx={{ flex: isMobile ? "1 1 100%" : "1 1 48%" }}
            />
          </Box>
        );
      case 1:
        return (
          <Box
            sx={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
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
              sx={{ flex: isMobile ? "1 1 100%" : "1 1 48%" }}
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
              sx={{ flex: isMobile ? "1 1 100%" : "1 1 48%" }}
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
              sx={{ flex: isMobile ? "1 1 100%" : "1 1 48%" }}
            />
          </Box>
        );
      case 2:
        return (
          <Box
            sx={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <TextField
              fullWidth
              margin="normal"
              name="plotHouseNo"
              label="Plot/House No."
              value={values.plotHouseNo}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.plotHouseNo && Boolean(errors.plotHouseNo)}
              helperText={touched.plotHouseNo && errors.plotHouseNo}
              sx={{ flex: isMobile ? "1 1 100%" : "1 1 48%" }}
            />
            <TextField
              fullWidth
              margin="normal"
              name="line1"
              label="Line 1"
              value={values.line1}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.line1 && Boolean(errors.line1)}
              helperText={touched.line1 && errors.line1}
              sx={{ flex: isMobile ? "1 1 100%" : "1 1 48%" }}
            />
            <TextField
              fullWidth
              margin="normal"
              name="area"
              label="Area"
              value={values.area}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.area && Boolean(errors.area)}
              helperText={touched.area && errors.area}
              sx={{ flex: isMobile ? "1 1 100%" : "1 1 48%" }}
            />
            <TextField
              fullWidth
              margin="normal"
              name="landmark"
              label="Landmark"
              value={values.landmark}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.landmark && Boolean(errors.landmark)}
              helperText={touched.landmark && errors.landmark}
              sx={{ flex: isMobile ? "1 1 100%" : "1 1 48%" }}
            />
            <TextField
              fullWidth
              margin="normal"
              select
              name="state"
              label="State"
              value={values.state}
              onChange={(e) => {
                setSelectedState(e.target.value);
                handleChange(e);
              }}
              onBlur={handleBlur}
              error={touched.state && Boolean(errors.state)}
              helperText={touched.state && errors.state}
              sx={{ flex: isMobile ? "1 1 100%" : "1 1 48%" }}
            >
              {states.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              margin="normal"
              select
              name="city"
              label="City"
              value={values.city}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.city && Boolean(errors.city)}
              helperText={touched.city && errors.city}
              disabled={!selectedState}
              sx={{ flex: isMobile ? "1 1 100%" : "1 1 48%" }}
            >
              {(stateCityMapping[selectedState] || []).map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              margin="normal"
              name="pincode"
              label="Pincode"
              value={values.pincode}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.pincode && Boolean(errors.pincode)}
              helperText={touched.pincode && errors.pincode}
              sx={{ flex: isMobile ? "1 1 100%" : "1 1 48%" }}
            />
          </Box>
        );
      default:
        return "Unknown step";
    }
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
        py: isMobile ? 2 : 4,
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        style={{
          width: "100%",
          maxWidth: isMobile ? "90%" : "600px",
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
              sx={{ mb: 3, fontWeight: "bold", color: "#2c3e50" }}
            >
              Sign Up
            </Typography>
            <Stepper
              activeStep={activeStep}
              sx={{ mb: 3 }}
              orientation={isMobile ? "vertical" : "horizontal"}
            >
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            <Formik
              initialValues={{
                fullName: "",
                email: "",
                mobileNo: "",
                password: "",
                confirmPassword: "",
                companyName: "",
                gstOwnerName: "",
                gstNo: "",
                plotHouseNo: "",
                line1: "",
                area: "",
                landmark: "",
                city: "",
                state: "",
                pincode: "",
              }}
              validationSchema={RegisterSchema}
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
                  {getStepContent(activeStep, {
                    errors,
                    touched,
                    handleChange,
                    handleBlur,
                    values,
                  })}
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      pt: 2,
                      gap: isMobile ? 1 : 2,
                    }}
                  >
                    <Button
                      color="inherit"
                      disabled={activeStep === 0}
                      onClick={handleBack}
                      sx={{
                        py: 1.5,
                        borderRadius: 1,
                        outline: "1px solid #2c3e50",
                        color: "#2c3e50",
                        fontSize: isMobile ? "0.9rem" : "1rem",
                        width: isMobile ? "100%" : "auto",
                      }}
                    >
                      Back
                    </Button>
                    <Box sx={{ flex: isMobile ? "0" : "1 1 auto" }} />
                    {activeStep < steps.length - 1 ? (
                      <Button
                        variant="contained"
                        onClick={handleNext}
                        sx={{
                          py: 1.5,
                          borderRadius: 1,
                          bgcolor: "#2c3e50",
                          color: "white",
                          "&:hover": { bgcolor: "#34495e" },
                          fontSize: isMobile ? "0.9rem" : "1rem",
                          width: isMobile ? "100%" : "auto",
                        }}
                      >
                        Next
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={isSubmitting}
                        sx={{
                          py: 1.5,
                          borderRadius: 1,
                          bgcolor: "#2c3e50",
                          color: "white",
                          "&:hover": { bgcolor: "#34495e" },
                          fontSize: isMobile ? "0.9rem" : "1rem",
                          width: isMobile ? "100%" : "auto",
                        }}
                      >
                        {isSubmitting ? "Registering..." : "Register"}
                      </Button>
                    )}
                  </Box>
                  <Box sx={{ mt: 2, textAlign: "center" }}>
                  Already have an account?{" "}
                    <Link
                      component={RouterLink}
                      to="/login"
                      variant="body2"
                      sx={{ color: "#2c3e50" }}
                    >
                      Sign In Now!
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
