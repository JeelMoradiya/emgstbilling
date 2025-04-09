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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase"; // Assuming you have a firebase config file
import { deleteUser } from "firebase/auth";

const Profile = () => {
  const { currentUser, userProfile, updateUserProfile, loading } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();

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
    },
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const cities = [
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
    "Morbi",
    "Navsari",
    "Bharuch",
    "Vapi",
    "Gandhidham",
    "Veraval",
    "Bhuj",
    "Porbandar",
    "Mehsana",
    "Palanpur",
    "Surendranagar",
    "Amreli",
    "Godhra",
    "Valsad",
    "Dahod",
    "Botad",
    "Patan",
    "Deesa",
    "Modasa",
    "Lunawada",
    "Chhota Udaipur",
    "Mandvi",
    "Dwarka",
    "Dhoraji",
    "Jetpur",
    "Keshod",
    "Khambhat",
    "Wadhwan",
    "Upleta",
    "Kalol",
    "Sanand",
    "Halol",
    "Borsad",
    "Viramgam",
    "Unjha",
    "Manavadar",
    "Mangrol",
    "Morva Hadaf",
    "Kapadvanj",
    "Visnagar",
    "Kadi",
    "Jhalod",
    "Tharad",
    "Mahudha",
    "Savarkundla",
    "Mahuva",
    "Ranavav",
    "Songadh",
    "Babra",
    "Talaja",
    "Vijapur",
  ]; // Expand as needed
  const states = [
    "Gujarat",
    "Maharashtra",
    "Delhi",
    "Karnataka",
    "Telangana",
    "Tamil Nadu",
  ]; // Expand as needed

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
        },
      });
    }
  }, [userProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes("address.")) {
      const addressField = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        address: { ...prev.address, [addressField]: value },
      }));
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
      !formData.address.landmark ||
      !formData.address.city ||
      !formData.address.state
    ) {
      setError("All address fields are required");
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
      setSuccess(true);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
      setError("Failed to update profile. Please try again.");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteUser(auth.currentUser);
      navigate("/login"); // Redirect to login after deletion
      toast.success("Account deleted successfully");
    } catch (error) {
      console.error("Failed to delete account:", error);
      setError("Failed to delete account. Please try again.");
    }
    setOpenDeleteDialog(false);
  };

  const handleCloseSnackbar = () => setSuccess(false);
  const handleOpenDeleteDialog = () => setOpenDeleteDialog(true);
  const handleCloseDeleteDialog = () => setOpenDeleteDialog(false);

  const getAvatarText = () => {
    if (formData.companyName)
      return formData.companyName.charAt(0).toUpperCase();
    if (formData.fullName) return formData.fullName.charAt(0).toUpperCase();
    return "U";
  };

  if (loading || !currentUser) {
    return (
      <Container
        maxWidth="md"
        sx={{ mt: 4, display: "flex", justifyContent: "center" }}
      >
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Snackbar
        open={success}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="success"
          sx={{ width: "100%" }}
        >
          Profile updated successfully!
        </Alert>
      </Snackbar>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Paper elevation={4} sx={{ p: 4, borderRadius: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: theme.palette.primary.main,
                fontSize: "2rem",
                fontWeight: "bold",
                mr: 3,
              }}
            >
              {getAvatarText()}
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                My Profile
              </Typography>
              <Typography variant="body1" color="text.secondary">
                View and update your account information
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 4 }} />

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            {/* User Information */}
            <Typography variant="h6" gutterBottom>
              User Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  disabled={!isEditing}
                  required
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
                />
              </Grid>
            </Grid>

            {/* GST Information */}
            <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
              GST Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Company Name"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  disabled={!isEditing}
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
                />
              </Grid>
            </Grid>

            {/* Address Information */}
            <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
              Address Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Plot/House No."
                  name="address.plotHouseNo"
                  value={formData.address.plotHouseNo}
                  onChange={handleChange}
                  disabled={!isEditing}
                  required
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
                  required
                />
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
                  disabled={!isEditing}
                  required
                >
                  <option value="">Select City</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </TextField>
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
                >
                  <option value="">Select State</option>
                  {states.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <Box
              sx={{ mt: 4, display: "flex", justifyContent: "space-between" }}
            >
              {!isEditing ? (
                <>
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={handleEdit}
                  >
                    Edit Profile
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={handleOpenDeleteDialog}
                  >
                    Delete Account
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    onClick={handleCancel}
                    sx={{ mr: 2 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SaveIcon />}
                  >
                    Save Changes
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </Paper>
      </motion.div>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete your account? This action cannot be
            undone, and all your data will be permanently removed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleDeleteAccount} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Profile;
