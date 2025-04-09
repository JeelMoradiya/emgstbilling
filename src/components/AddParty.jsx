import React, { useState, useEffect } from "react";
import {
  addDoc,
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuth } from "../contexts/AuthContext";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Card,
  CardContent,
  Collapse,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
} from "@mui/icons-material";

const PartyManagement = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState(null);
  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    const fetchParties = async () => {
      try {
        const q = query(
          collection(db, "parties"),
          where("createdBy", "==", currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        const partiesList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setParties(partiesList);
      } catch (err) {
        setError("Failed to fetch parties: " + err.message);
      }
    };
    fetchParties();
  }, [currentUser]);

  const validationSchema = Yup.object({
    fullName: Yup.string(),
    email: Yup.string().email("Invalid email address"),
    mobileNo: Yup.string()
      .matches(/^[0-9]{10}$/, "Mobile number must be 10 digits")
      .required("Required"),
    companyName: Yup.string().required("Required"),
    gstOwnerName: Yup.string().required("Required"),
    gstNo: Yup.string()
      .matches(
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
        "Invalid GST number"
      )
      .required("Required"),
    plotHouseNo: Yup.string().required("Required"),
    line1: Yup.string().required("Required"),
    area: Yup.string().required("Required"),
    landmark: Yup.string(),
    city: Yup.string().required("Required"),
    state: Yup.string().required("Required"),
  });

  const formik = useFormik({
    initialValues: {
      fullName: "",
      email: "",
      mobileNo: "",
      companyName: "",
      gstOwnerName: "",
      gstNo: "",
      plotHouseNo: "",
      line1: "",
      area: "",
      landmark: "",
      city: "",
      state: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      if (!currentUser) {
        setError("Please log in to manage parties");
        return;
      }

      setIsSubmitting(true);
      setSuccess("");
      setError(null);
      try {
        const partyData = {
          ...values,
          createdAt: new Date().toISOString(),
          createdBy: currentUser.uid,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.uid,
        };
        if (selectedParty) {
          await updateDoc(doc(db, "parties", selectedParty.id), partyData);
          setParties(
            parties.map((p) =>
              p.id === selectedParty.id ? { ...p, ...partyData } : p
            )
          );
          setSuccess("Updated");
        } else {
          const docRef = await addDoc(collection(db, "parties"), partyData);
          setParties([...parties, { id: docRef.id, ...partyData }]);
          setSuccess("Added");
        }
        formik.resetForm();
        setSelectedParty(null);
        setOpenDialog(false);
      } catch (error) {
        setError(
          `Failed to ${selectedParty ? "update" : "add"} party: ${
            error.message
          }`
        );
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const handleEdit = (party) => {
    setSelectedParty(party);
    formik.setValues({
      fullName: party.fullName || "",
      email: party.email || "",
      mobileNo: party.mobileNo || "",
      companyName: party.companyName || "",
      gstOwnerName: party.gstOwnerName || "",
      gstNo: party.gstNo || "",
      plotHouseNo: party.plotHouseNo || "",
      line1: party.line1 || "",
      area: party.area || "",
      landmark: party.landmark || "",
      city: party.city || "",
      state: party.state || "",
    });
    setOpenDialog(true);
  };

  const handleDelete = async (partyId) => {
    if (window.confirm("Are you sure you want to delete this party?")) {
      try {
        await deleteDoc(doc(db, "parties", partyId));
        setParties(parties.filter((p) => p.id !== partyId));
        setSuccess("Deleted");
      } catch (error) {
        setError("Failed to delete party: " + error.message);
      }
    }
  };

  const handleOpenDialog = () => {
    setSelectedParty(null);
    formik.resetForm();
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    formik.resetForm();
    setSelectedParty(null);
  };

  const handleToggleRow = (partyId) => {
    setExpandedRow(expandedRow === partyId ? null : partyId);
  };

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
  ];
  const states = [
    "Gujarat",
    "Maharashtra",
    "Delhi",
    "Karnataka",
    "Tamil Nadu",
    "West Bengal",
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{ fontWeight: "bold", color: "primary.main" }}
        >
          Party Management
        </Typography>
        
        {/* Success/Error Messages */}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Party {success} successfully!
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Add Party Section */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "end",
            alignItems: "end",
            mb: 3,
          }}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenDialog}
            startIcon={<AddIcon />}
            disabled={!currentUser}
          >
            Add Party
          </Button>
        </Box>

        {/* Parties List Section */}
        <TableContainer component={Paper} elevation={1}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>Sr. No.</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Company Name</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>
                  GST Owner Name
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>GST No</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Mobile No</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {parties.length > 0 ? (
                parties.map((party, index) => (
                  <React.Fragment key={party.id}>
                    <TableRow hover>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{party.companyName || "N/A"}</TableCell>
                      <TableCell>{party.gstOwnerName || "N/A"}</TableCell>
                      <TableCell>{party.gstNo || "N/A"}</TableCell>
                      <TableCell>{party.mobileNo || "N/A"}</TableCell>
                      <TableCell>
                        <IconButton
                          color="secondary"
                          onClick={() => handleToggleRow(party.id)}
                        >
                          {expandedRow === party.id ? (
                            <ArrowUpIcon />
                          ) : (
                            <ArrowDownIcon />
                          )}
                        </IconButton>
                        <IconButton
                          color="primary"
                          onClick={() => handleEdit(party)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleDelete(party.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        style={{ paddingBottom: 0, paddingTop: 0 }}
                        colSpan={6}
                      >
                        <Collapse
                          in={expandedRow === party.id}
                          timeout="auto"
                          unmountOnExit
                        >
                          <Box
                            sx={{
                              p: 2,
                              bgcolor: "#fafafa",
                              borderRadius: 1,
                            }}
                          >
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={4}>
                                <Typography
                                  variant="subtitle1"
                                  sx={{
                                    fontWeight: "bold",
                                    color: "#42a5f5",
                                    mb: 1,
                                  }}
                                >
                                  Party Information
                                </Typography>
                                <Typography variant="body2">
                                  Full Name: {party.fullName || "N/A"}
                                </Typography>
                                <Typography variant="body2">
                                  Email: {party.email || "N/A"}
                                </Typography>
                                <Typography variant="body2">
                                  Mobile No: {party.mobileNo || "N/A"}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <Typography
                                  variant="subtitle1"
                                  sx={{
                                    fontWeight: "bold",
                                    color: "#42a5f5",
                                    mb: 1,
                                  }}
                                >
                                  GST Information
                                </Typography>
                                <Typography variant="body2">
                                  Company Name: {party.companyName || "N/A"}
                                </Typography>
                                <Typography variant="body2">
                                  GST Owner: {party.gstOwnerName || "N/A"}
                                </Typography>
                                <Typography variant="body2">
                                  GST No: {party.gstNo || "N/A"}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <Typography
                                  variant="subtitle1"
                                  sx={{
                                    fontWeight: "bold",
                                    color: "#42a5f5",
                                    mb: 1,
                                  }}
                                >
                                  Address Information
                                </Typography>
                                <Typography variant="body2">
                                  {`${party.plotHouseNo || ""}, ${
                                    party.line1 || ""
                                  }, ${party.area || ""}, ${
                                    party.landmark || ""
                                  }, ${party.city || ""}, ${party.state || ""}`
                                    .replace(/, ,/g, ",")
                                    .replace(/^,|,$/g, "") || "N/A"}
                                </Typography>
                              </Grid>
                            </Grid>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body1" sx={{ py: 2 }}>
                      No parties found. Add a new party to get started!
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Add/Edit Party Dialog */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ bgcolor: "primary.main", color: "white", py: 2 }}>
            {selectedParty ? "Edit Party" : "Add New Party"}
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            {/* Party Information */}
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: "bold", color: "#42a5f5", mb: 2 }}
              >
                Party Information
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    id="fullName"
                    name="fullName"
                    label="Full Name"
                    value={formik.values.fullName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.fullName && Boolean(formik.errors.fullName)
                    }
                    helperText={
                      formik.touched.fullName && formik.errors.fullName
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    id="email"
                    name="email"
                    label="Email ID"
                    type="email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.email && Boolean(formik.errors.email)}
                    helperText={formik.touched.email && formik.errors.email}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    id="mobileNo"
                    name="mobileNo"
                    label="Mobile No"
                    value={formik.values.mobileNo}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.mobileNo && Boolean(formik.errors.mobileNo)
                    }
                    helperText={
                      formik.touched.mobileNo && formik.errors.mobileNo
                    }
                  />
                </Grid>
              </Grid>
            </Box>

            {/* GST Information */}
            <Divider sx={{ my: 2 }} />
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: "bold", color: "#42a5f5", mb: 2 }}
              >
                GST Information
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    id="companyName"
                    name="companyName"
                    label="Company Name"
                    value={formik.values.companyName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.companyName &&
                      Boolean(formik.errors.companyName)
                    }
                    helperText={
                      formik.touched.companyName && formik.errors.companyName
                    }
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    id="gstOwnerName"
                    name="gstOwnerName"
                    label="GST Owner Name"
                    value={formik.values.gstOwnerName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.gstOwnerName &&
                      Boolean(formik.errors.gstOwnerName)
                    }
                    helperText={
                      formik.touched.gstOwnerName && formik.errors.gstOwnerName
                    }
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    id="gstNo"
                    name="gstNo"
                    label="GST No"
                    value={formik.values.gstNo}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.gstNo && Boolean(formik.errors.gstNo)}
                    helperText={formik.touched.gstNo && formik.errors.gstNo}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Address Information */}
            <Divider sx={{ my: 2 }} />
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: "bold", color: "#42a5f5", mb: 2 }}
              >
                Address Information
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    id="plotHouseNo"
                    name="plotHouseNo"
                    label="Plot/House No"
                    value={formik.values.plotHouseNo}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.plotHouseNo &&
                      Boolean(formik.errors.plotHouseNo)
                    }
                    helperText={
                      formik.touched.plotHouseNo && formik.errors.plotHouseNo
                    }
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    id="line1"
                    name="line1"
                    label="Line 1"
                    value={formik.values.line1}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.line1 && Boolean(formik.errors.line1)}
                    helperText={formik.touched.line1 && formik.errors.line1}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    id="area"
                    name="area"
                    label="Area"
                    value={formik.values.area}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.area && Boolean(formik.errors.area)}
                    helperText={formik.touched.area && formik.errors.area}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    id="landmark"
                    name="landmark"
                    label="Landmark"
                    value={formik.values.landmark}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.landmark && Boolean(formik.errors.landmark)
                    }
                    helperText={
                      formik.touched.landmark && formik.errors.landmark
                    }
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl
                    fullWidth
                    error={formik.touched.city && Boolean(formik.errors.city)}
                  >
                    <InputLabel>City</InputLabel>
                    <Select
                      id="city"
                      name="city"
                      value={formik.values.city}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      label="City"
                    >
                      {cities.map((city) => (
                        <MenuItem key={city} value={city}>
                          {city}
                        </MenuItem>
                      ))}
                    </Select>
                    {formik.touched.city && formik.errors.city && (
                      <Typography variant="caption" color="error">
                        {formik.errors.city}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl
                    fullWidth
                    error={formik.touched.state && Boolean(formik.errors.state)}
                  >
                    <InputLabel>State</InputLabel>
                    <Select
                      id="state"
                      name="state"
                      value={formik.values.state}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      label="State"
                    >
                      {states.map((state) => (
                        <MenuItem key={state} value={state}>
                          {state}
                        </MenuItem>
                      ))}
                    </Select>
                    {formik.touched.state && formik.errors.state && (
                      <Typography variant="caption" color="error">
                        {formik.errors.state}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={handleCloseDialog}
              color="secondary"
              variant="outlined"
            >
              Cancel
            </Button>
            <Button
              color="primary"
              variant="contained"
              onClick={formik.handleSubmit}
              disabled={isSubmitting || !currentUser}
              sx={{ minWidth: 100 }}
            >
              {isSubmitting ? (
                <CircularProgress size={24} />
              ) : selectedParty ? (
                "Update"
              ) : (
                "Save"
              )}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
};

export default PartyManagement;
