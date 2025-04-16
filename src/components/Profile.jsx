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
  CircularProgress
} from "@mui/material";
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";

const Profile = () => {
  const { currentUser, userProfile, updateUserProfile, loading } = useAuth();
  const theme = useTheme();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobileNo: "",
    companyName: "",
    gstNo: "",
    gstOwnerName: "",
    address: {
      plotHouseNo: "",
      line1: "",
      area: "",
      landmark: "",
      city: "",
      state: "",
      pincode: "",
    },
  });
  const [error, setError] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const stateCityMap = {
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
      "Nashik",
      "Aurangabad",
      "Solapur",
      "Kolhapur",
      "Thane",
      "Navi Mumbai",
      "Amravati",
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
        address: {
          plotHouseNo: userProfile.address?.plotHouseNo || "",
          line1: userProfile.address?.line1 || "",
          area: userProfile.address?.area || "",
          landmark: userProfile.address?.landmark || "",
          city: userProfile.address?.city || "",
          state: userProfile.address?.state || "",
          pincode: userProfile.address?.pincode || "",
        },
      });
    }
  }, [userProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes("address.")) {
      const addressField = name.split(".")[1];
      if (addressField === "state") {
        setFormData((prev) => ({
          ...prev,
          address: { ...prev.address, state: value, city: "" },
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          address: { ...prev.address, [addressField]: value },
        }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
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
      address: {
        plotHouseNo: userProfile?.address?.plotHouseNo || "",
        line1: userProfile?.address?.line1 || "",
        area: userProfile?.address?.area || "",
        landmark: userProfile?.address?.landmark || "",
        city: userProfile?.address?.city || "",
        state: userProfile?.address?.state || "",
        pincode: userProfile?.address?.pincode || "",
      },
    });
    setIsEditing(false);
    setError("");
  };

  const validateForm = () => {
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
        address: formData.address,
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
        sx={{ mt: 4, display: "flex", justifyContent: "center", bgcolor: 'white', minHeight: '100vh' }}
      >
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, bgcolor: 'white', minHeight: '100vh' }}>
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
            bgcolor: 'white'
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "center", sm: "center" },
              justifyContent: "flex-start",
              mb: 4,
              gap: 3,
            }}
          >
            <Avatar
              sx={{
                width: { xs: 64, sm: 80 },
                height: { xs: 64, sm: 80 },
                bgcolor: '#2c3e50',
                fontSize: { xs: "1.75rem", sm: "2.25rem" },
                fontWeight: "bold",
              }}
            >
              {getAvatarText()}
            </Avatar>

            <Box
              sx={{
                textAlign: { xs: "center", sm: "left" },
                maxWidth: "100%",
              }}
            >
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontSize: { xs: "1.75rem", sm: "2.25rem", md: "2.75rem" },
                  fontWeight: 500,
                  color: '#2c3e50',
                  lineHeight: 1.3,
                }}
              >
                {formData.companyName}
              </Typography>
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

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ fontSize: { xs: "1rem", sm: "1.25rem" }, color: '#2c3e50' }}
            >
              User Information
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
                  sx={{
                    "& .MuiInputBase-input": {
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    },
                    '& .MuiInputLabel-root': { color: '#2c3e50' }
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
                  sx={{
                    "& .MuiInputBase-input": {
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    },
                    '& .MuiInputLabel-root': { color: '#2c3e50' }
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
                  sx={{
                    "& .MuiInputBase-input": {
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    },
                    '& .MuiInputLabel-root': { color: '#2c3e50' }
                  }}
                />
              </Grid>
            </Grid>

            <Typography
              variant="h6"
              gutterBottom
              sx={{ mt: 4, fontSize: { xs: "1rem", sm: "1.25rem" }, color: '#2c3e50' }}
            >
              GST Information
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
                  sx={{
                    "& .MuiInputBase-input": {
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    },
                    '& .MuiInputLabel-root': { color: '#2c3e50' }
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
                  sx={{
                    "& .MuiInputBase-input": {
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    },
                    '& .MuiInputLabel-root': { color: '#2c3e50' }
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
                  sx={{
                    "& .MuiInputBase-input": {
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    },
                    '& .MuiInputLabel-root': { color: '#2c3e50' }
                  }}
                />
              </Grid>
            </Grid>

            <Typography
              variant="h6"
              gutterBottom
              sx={{ mt: 4, fontSize: { xs: "1rem", sm: "1.25rem" }, color: '#2c3e50' }}
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
                  sx={{
                    "& .MuiInputBase-input": {
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    },
                    '& .MuiInputLabel-root': { color: '#2c3e50' }
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
                  sx={{
                    "& .MuiInputBase-input": {
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    },
                    '& .MuiInputLabel-root': { color: '#2c3e50' }
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
                  sx={{
                    "& .MuiInputBase-input": {
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    },
                    '& .MuiInputLabel-root': { color: '#2c3e50' }
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
                  sx={{
                    "& .MuiInputBase-input": {
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    },
                    '& .MuiInputLabel-root': { color: '#2c3e50' }
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
                  sx={{
                    "& .MuiInputBase-input": {
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    },
                    '& .MuiInputLabel-root': { color: '#2c3e50' }
                  }}
                >
                  <option value="">Select State</option>
                  {states.map((state) => (
                    <option key={state} value={state}>
                      {state}
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
                  sx={{
                    "& .MuiInputBase-input": {
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    },
                    '& .MuiInputLabel-root': { color: '#2c3e50' }
                  }}
                >
                  <option value="">Select City</option>
                  {formData.address.state &&
                    stateCityMap[formData.address.state].map((city) => (
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
                  sx={{
                    "& .MuiInputBase-input": {
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    },
                    '& .MuiInputLabel-root': { color: '#2c3e50' }
                  }}
                />
              </Grid>
            </Grid>

            <Box
              sx={{
                mt: 4,
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                justifyContent: "flex-start",
                gap: 2,
              }}
            >
              {!isEditing ? (
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={handleEdit}
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                    py: 1.5,
                    bgcolor: '#2c3e50',
                    color: 'white',
                    '&:hover': { bgcolor: '#34495e' },
                    borderRadius: 1
                  }}
                >
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    onClick={handleCancel}
                    sx={{
                      width: { xs: "100%", sm: "auto" },
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                      py: 1.5,
                      borderRadius: 1,
                      color: '#2c3e50',
                      borderColor: '#2c3e50'
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    sx={{
                      width: { xs: "100%", sm: "auto" },
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                      py: 1.5,
                      bgcolor: '#2c3e50',
                      color: 'white',
                      '&:hover': { bgcolor: '#34495e' },
                      borderRadius: 1
                    }}
                  >
                    Save Changes
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </Paper>
      </motion.div>
    </Container>
  );
};

export default Profile;