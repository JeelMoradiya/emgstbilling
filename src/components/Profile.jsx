import { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  Divider,
  Alert,
  Snackbar,
  Avatar,
  useTheme,
  CircularProgress,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  AccountBalance as BankIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const { currentUser, userProfile, updateUserProfile, loading } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobileNo: "",
    companyName: "",
    gstNo: "",
    gstOwnerName: "",
    udyamNo: "",
    address: {
      plotHouseNo: "",
      line1: "",
      area: "",
      landmark: "",
      city: "",
      state: "",
      pincode: "",
    },
    bankDetails: {
      bankName: "",
      accountName: "",
      accountNumber: "",
      ifscCode: "",
    },
  });
  const [error, setError] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const stateCityMap = {
    Gujarat: {
      cities: [
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
      gstCode: "24",
      udyamCode: "GJ",
    },
    Maharashtra: {
      cities: [
        "Mumbai",
        "Pune",
        "Nagpur",
        "Nashik",
        "Aurangabad",
        "Solapur",
        "Kolhapur",
        "Thane",
        "Navi Mumbai",
        "Amravati",
      ],
      gstCode: "27",
      udyamCode: "MH",
    },
    Delhi: {
      cities: ["New Delhi", "Delhi"],
      gstCode: "07",
      udyamCode: "DL",
    },
    Karnataka: {
      cities: [
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
      gstCode: "29",
      udyamCode: "KA",
    },
    "Tamil Nadu": {
      cities: [
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
      gstCode: "33",
      udyamCode: "TN",
    },
  };

  const states = Object.keys(stateCityMap);

  useEffect(() => {
    if (userProfile) {
      setFormData({
        fullName: userProfile.fullName || "",
        email: userProfile.email || "",
        mobileNo: userProfile.mobileNo || "",
        companyName: userProfile.companyName || "",
        gstNo: userProfile.gstNo || "",
        gstOwnerName: userProfile.gstOwnerName || "",
        udyamNo: userProfile.udyamNo || "",
        address: {
          plotHouseNo: userProfile.address?.plotHouseNo || "",
          line1: userProfile.address?.line1 || "",
          area: userProfile.address?.area || "",
          landmark: userProfile.address?.landmark || "",
          city: userProfile.address?.city || "",
          state: userProfile.address?.state || "",
          pincode: userProfile.address?.pincode || "",
        },
        bankDetails: {
          bankName: userProfile.bankDetails?.bankName || "",
          accountName: userProfile.bankDetails?.accountName || "",
          accountNumber: userProfile.bankDetails?.accountNumber || "",
          ifscCode: userProfile.bankDetails?.ifscCode || "",
        },
      });
    }
  }, [userProfile]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const upperCaseFields = [
      "companyName",
      "gstOwnerName",
      "udyamNo",
      "address.plotHouseNo",
      "address.line1",
      "address.area",
      "address.landmark",
      "bankDetails.bankName",
      "bankDetails.accountName",
    ];

    const formattedValue = upperCaseFields.includes(name) ? value.toUpperCase() : value;

    if (name.includes("address.")) {
      const addressField = name.split(".")[1];
      if (addressField === "state") {
        setFormData((prev) => ({
          ...prev,
          address: { ...prev.address, state: formattedValue, city: "" },
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          address: { ...prev.address, [addressField]: formattedValue },
        }));
      }
    } else if (name.includes("bankDetails.")) {
      const bankField = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        bankDetails: { ...prev.bankDetails, [bankField]: formattedValue },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: formattedValue }));
    }
  };

  const handleEdit = () => setIsEditing(true);

  const handleCancel = () => {
    setFormData({
      fullName: userProfile?.fullName || "",
      email: userProfile?.email || "",
      mobileNo: userProfile?.mobileNo || "",
      companyName: userProfile?.companyName || "",
      gstNo: userProfile?.gstNo || "",
      gstOwnerName: userProfile?.gstOwnerName || "",
      udyamNo: userProfile?.udyamNo || "",
      address: {
        plotHouseNo: userProfile?.address?.plotHouseNo || "",
        line1: userProfile?.address?.line1 || "",
        area: userProfile?.address?.area || "",
        landmark: userProfile?.address?.landmark || "",
        city: userProfile?.address?.city || "",
        state: userProfile?.address?.state || "",
        pincode: userProfile?.address?.pincode || "",
      },
      bankDetails: {
        bankName: userProfile?.bankDetails?.bankName || "",
        accountName: userProfile?.bankDetails?.accountName || "",
        accountNumber: userProfile?.bankDetails?.accountNumber || "",
        ifscCode: userProfile?.bankDetails?.ifscCode || "",
      },
    });
    setIsEditing(false);
    setError("");
  };

  const validateForm = () => {
    // User Information
    if (!formData.fullName) {
      setError("Full Name is required");
      return false;
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }
    if (formData.mobileNo && !/^[0-9]{10}$/.test(formData.mobileNo)) {
      setError("Please enter a valid 10-digit mobile number");
      return false;
    }

    // GST Information
    if (
      formData.gstNo &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
        formData.gstNo
      )
    ) {
      setError("Please enter a valid GST number");
      return false;
    }
    if (
      formData.gstNo &&
      formData.address.state &&
      formData.gstNo.slice(0, 2) !== stateCityMap[formData.address.state].gstCode
    ) {
      setError(
        `GST number must start with state code ${stateCityMap[formData.address.state].gstCode} for ${formData.address.state}`
      );
      return false;
    }

    // UDYAM Number Validation
    if (formData.udyamNo) {
      const udyamRegex = /^[A-Z]{2}-[0-9]{2}-[0-9]{7}$/;
      if (!udyamRegex.test(formData.udyamNo)) {
        setError("Please enter a valid UDYAM number (e.g., GJ-01-0000001)");
        return false;
      }
      if (formData.address.state) {
        const expectedUdyamCode = stateCityMap[formData.address.state].udyamCode;
        const udyamStateCode = formData.udyamNo.split("-")[0]; // Extract state code (e.g., GJ)
        if (udyamStateCode !== expectedUdyamCode) {
          setError(
            `UDYAM number state code must be ${expectedUdyamCode} for ${formData.address.state}`
          );
          return false;
        }
      }
    }

    // Address Information
    if (
      !formData.address.plotHouseNo ||
      !formData.address.line1 ||
      !formData.address.area ||
      !formData.address.city ||
      !formData.address.state ||
      !formData.address.pincode
    ) {
      setError("Required address fields are missing");
      return false;
    }
    if (!/^[0-9]{6}$/.test(formData.address.pincode)) {
      setError("Pincode must be 6 digits");
      return false;
    }

    // Bank Details (optional, but validate if provided)
    if (
      formData.bankDetails.bankName ||
      formData.bankDetails.accountName ||
      formData.bankDetails.accountNumber ||
      formData.bankDetails.ifscCode
    ) {
      if (!formData.bankDetails.bankName) {
        setError("Bank Name is required if bank details are provided");
        return false;
      }
      if (!formData.bankDetails.accountName) {
        setError("Account Name is required if bank details are provided");
        return false;
      }
      if (
        formData.bankDetails.accountNumber &&
        !/^[0-9]{9,18}$/.test(formData.bankDetails.accountNumber)
      ) {
        setError("Account Number must be between 9 and 18 digits");
        return false;
      }
      if (
        formData.bankDetails.ifscCode &&
        !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bankDetails.ifscCode)
      ) {
        setError("Please enter a valid IFSC Code (e.g., SBIN0001234)");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setError("");
      const updatedData = {
        fullName: formData.fullName,
        mobileNo: formData.mobileNo,
        companyName: formData.companyName,
        gstNo: formData.gstNo,
        gstOwnerName: formData.gstOwnerName,
        udyamNo: formData.udyamNo,
        address: formData.address,
        bankDetails: formData.bankDetails,
      };
      await updateUserProfile(updatedData);
      setSnackbar({
        open: true,
        message: "Profile updated successfully!",
        severity: "success",
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
      setError("Failed to update profile. Please try again.");
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleSettingsClick = () => {
    navigate("/settings");
  };

  const getAvatarText = () => {
    if (formData.companyName)
      return formData.companyName.charAt(0).toUpperCase();
    if (formData.fullName) return formData.fullName.charAt(0).toUpperCase();
    return "U";
  };

  if (loading || !currentUser) {
    return (
      <Container
        maxWidth="lg"
        sx={{ mt: 4, display: "flex", justifyContent: "center", bgcolor: "white", minHeight: "100vh" }}
      >
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container
      maxWidth="lg"
      sx={{ mt: 4, mb: 4, bgcolor: "white", minHeight: "100vh" }}
    >
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Paper
          elevation={4}
          sx={{
            p: { xs: 2, sm: 3, md: 4 },
            borderRadius: 2,
            bgcolor: "white",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "center", sm: "center" },
              justifyContent: "space-between",
              mb: 4,
              gap: 3,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Avatar
                sx={{
                  width: { xs: 64, sm: 80 },
                  height: { xs: 64, sm: 80 },
                  bgcolor: "#2c3e50",
                  fontSize: { xs: "1.75rem", sm: "2.25rem" },
                  fontWeight: "bold",
                }}
              >
                {getAvatarText()}
              </Avatar>
              <Typography
                variant="h4"
                sx={{
                  fontSize: { xs: "1.75rem", sm: "2.25rem", md: "2.75rem" },
                  fontWeight: 500,
                  color: "#2c3e50",
                }}
              >
                {formData.companyName || "User Profile"}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {!isEditing && (
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={handleEdit}
                  sx={{
                    bgcolor: "#2c3e50",
                    "&:hover": { bgcolor: "#34495e" },
                    borderRadius: 1,
                  }}
                >
                  Edit Profile
                </Button>
              )}
              <Tooltip title="Settings">
                <IconButton
                  onClick={handleSettingsClick}
                  sx={{
                    color: "#2c3e50",
                    "&:hover": { bgcolor: "#e8ecef" },
                  }}
                >
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Divider sx={{ mb: 4, border: "2px solid #2c3e50" }} />

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              }}
            >
              {error}
            </Alert>
          )}

          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{ mb: 4 }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Personal" icon={<PersonIcon />} iconPosition="start" />
            <Tab label="Business" icon={<BusinessIcon />} iconPosition="start" />
            <Tab label="Address" icon={<LocationIcon />} iconPosition="start" />
            <Tab label="Bank" icon={<BankIcon />} iconPosition="start" />
          </Tabs>

          <Box component="form" onSubmit={handleSubmit} noValidate>
            {tabValue === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ fontSize: { xs: "1rem", sm: "1.25rem" }, color: "#2c3e50" }}
                >
                  Personal Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      disabled={!isEditing}
                      required
                      variant="outlined"
                      size="small"
                      InputProps={{
                        startAdornment: isEditing && <PersonIcon color="action" sx={{ mr: 1 }} />,
                      }}
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                        "& .MuiInputLabel-root": { color: "#2c3e50" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      name="email"
                      value={formData.email}
                      disabled={true}
                      helperText={isEditing ? "Email cannot be changed" : ""}
                      variant="outlined"
                      size="small"
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                        "& .MuiInputLabel-root": { color: "#2c3e50" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Mobile Number"
                      name="mobileNo"
                      value={formData.mobileNo}
                      onChange={handleChange}
                      disabled={!isEditing}
                      variant="outlined"
                      size="small"
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                        "& .MuiInputLabel-root": { color: "#2c3e50" },
                      }}
                    />
                  </Grid>
                </Grid>
              </motion.div>
            )}

            {tabValue === 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ fontSize: { xs: "1rem", sm: "1.25rem" }, color: "#2c3e50" }}
                >
                  Business Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Company Name"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      disabled={!isEditing}
                      variant="outlined"
                      size="small"
                      InputProps={{
                        startAdornment: isEditing && <BusinessIcon color="action" sx={{ mr: 1 }} />,
                      }}
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                        "& .MuiInputLabel-root": { color: "#2c3e50" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="GST Number"
                      name="gstNo"
                      value={formData.gstNo}
                      onChange={handleChange}
                      disabled={!isEditing}
                      variant="outlined"
                      size="small"
                      helperText={
                        formData.address.state &&
                        `GST should start with ${stateCityMap[formData.address.state].gstCode} for ${formData.address.state}`
                      }
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                        "& .MuiInputLabel-root": { color: "#2c3e50" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="GST Owner Name"
                      name="gstOwnerName"
                      value={formData.gstOwnerName}
                      onChange={handleChange}
                      disabled={!isEditing}
                      variant="outlined"
                      size="small"
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                        "& .MuiInputLabel-root": { color: "#2c3e50" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="UDYAM Number (Optional)"
                      name="udyamNo"
                      value={formData.udyamNo}
                      onChange={handleChange}
                      disabled={!isEditing}
                      variant="outlined"
                      size="small"
                      helperText={
                        formData.address.state
                          ? `Format: ${stateCityMap[formData.address.state].udyamCode}-YY-NNNNNNN`
                          : "Format: XX-YY-NNNNNNN"
                      }
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                        "& .MuiInputLabel-root": { color: "#2c3e50" },
                      }}
                    />
                  </Grid>
                </Grid>
              </motion.div>
            )}

            {tabValue === 2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ fontSize: { xs: "1rem", sm: "1.25rem" }, color: "#2c3e50" }}
                >
                  Address Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Plot/House No."
                      name="address.plotHouseNo"
                      value={formData.address.plotHouseNo}
                      onChange={handleChange}
                      disabled={!isEditing}
                      required
                      variant="outlined"
                      size="small"
                      InputProps={{
                        startAdornment: isEditing && <LocationIcon color="action" sx={{ mr: 1 }} />,
                      }}
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                        "& .MuiInputLabel-root": { color: "#2c3e50" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Line 1"
                      name="address.line1"
                      value={formData.address.line1}
                      onChange={handleChange}
                      disabled={!isEditing}
                      required
                      variant="outlined"
                      size="small"
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                        "& .MuiInputLabel-root": { color: "#2c3e50" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Area"
                      name="address.area"
                      value={formData.address.area}
                      onChange={handleChange}
                      disabled={!isEditing}
                      required
                      variant="outlined"
                      size="small"
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                        "& .MuiInputLabel-root": { color: "#2c3e50" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Landmark"
                      name="address.landmark"
                      value={formData.address.landmark}
                      onChange={handleChange}
                      disabled={!isEditing}
                      variant="outlined"
                      size="small"
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                        "& .MuiInputLabel-root": { color: "#2c3e50" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="State"
                      name="address.state"
                      select
                      SelectProps={{ native: true }}
                      value={formData.address.state}
                      onChange={handleChange}
                      disabled={!isEditing}
                      required
                      variant="outlined"
                      size="small"
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                        "& .MuiInputLabel-root": { color: "#2c3e50" },
                      }}
                    >
                      <option value="">Select State</option>
                      {states.map((state) => (
                        <option key={state} value={state}>
                          {state} (GST Code: {stateCityMap[state].gstCode}, UDYAM Code: {stateCityMap[state].udyamCode})
                        </option>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="City"
                      name="address.city"
                      select
                      SelectProps={{ native: true }}
                      value={formData.address.city}
                      onChange={handleChange}
                      disabled={!isEditing || !formData.address.state}
                      required
                      variant="outlined"
                      size="small"
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                        "& .MuiInputLabel-root": { color: "#2c3e50" },
                      }}
                    >
                      <option value="">Select City</option>
                      {formData.address.state &&
                        stateCityMap[formData.address.state].cities.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Pincode"
                      name="address.pincode"
                      value={formData.address.pincode}
                      onChange={handleChange}
                      disabled={!isEditing}
                      required
                      variant="outlined"
                      size="small"
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                        "& .MuiInputLabel-root": { color: "#2c3e50" },
                      }}
                    />
                  </Grid>
                </Grid>
              </motion.div>
            )}

            {tabValue === 3 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ fontSize: { xs: "1rem", sm: "1.25rem" }, color: "#2c3e50" }}
                >
                  Bank Details (Optional)
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Bank Name"
                      name="bankDetails.bankName"
                      value={formData.bankDetails.bankName}
                      onChange={handleChange}
                      disabled={!isEditing}
                      variant="outlined"
                      size="small"
                      InputProps={{
                        startAdornment: isEditing && <BankIcon color="action" sx={{ mr: 1 }} />,
                      }}
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                        "& .MuiInputLabel-root": { color: "#2c3e50" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Account Name"
                      name="bankDetails.accountName"
                      value={formData.bankDetails.accountName}
                      onChange={handleChange}
                      disabled={!isEditing}
                      variant="outlined"
                      size="small"
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                        "& .MuiInputLabel-root": { color: "#2c3e50" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Account Number"
                      name="bankDetails.accountNumber"
                      value={formData.bankDetails.accountNumber}
                      onChange={handleChange}
                      disabled={!isEditing}
                      variant="outlined"
                      size="small"
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                        "& .MuiInputLabel-root": { color: "#2c3e50" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="IFSC Code"
                      name="bankDetails.ifscCode"
                      value={formData.bankDetails.ifscCode}
                      onChange={handleChange}
                      disabled={!isEditing}
                      variant="outlined"
                      size="small"
                      helperText="Format: XXXX0XXXXXX"
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                        "& .MuiInputLabel-root": { color: "#2c3e50" },
                      }}
                    />
                  </Grid>
                </Grid>
              </motion.div>
            )}

            {isEditing && (
              <Box
                sx={{
                  mt: 4,
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  justifyContent: "flex-start",
                  gap: 2,
                }}
              >
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={handleCancel}
                  size="small"
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    height: { xs: "40px", sm: "40px" },
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                    py: 1.5,
                    borderRadius: 1,
                    color: "#2c3e50",
                    borderColor: "#2c3e50",
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  size="small"
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    height: { xs: "40px", sm: "40px" },
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                    py: 1.5,
                    bgcolor: "#2c3e50",
                    color: "white",
                    "&:hover": { bgcolor: "#34495e" },
                    borderRadius: 1,
                  }}
                >
                  Save Changes
                </Button>
              </Box>
            )}
          </Box>
        </Paper>
      </motion.div>
    </Container>
  );
};

export default Profile;