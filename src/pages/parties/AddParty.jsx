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
import { db } from "../../firebase";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuth } from "../../contexts/AuthContext";
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
  Collapse,
  TablePagination,
  Menu as MenuAction,
  MenuItem as MenuItemAction,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Add as AddIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import logo from "../../assets/logo.gif";

const PartyManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState(null);
  const [parties, setParties] = useState([]);
  const [filteredParties, setFilteredParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [partyToDelete, setPartyToDelete] = useState(null);
  const [dialogMode, setDialogMode] = useState("add");
  const [expandedRow, setExpandedRow] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedPartyId, setSelectedPartyId] = useState(null);
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);

  const stateCities = {
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
      "Navi Mumbai",
    ],
    Delhi: ["New Delhi", "Delhi", "Noida", "Gurgaon"],
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

  const states = Object.keys(stateCities);

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
        setFilteredParties(partiesList);
      } catch (err) {
        setError("Failed to fetch parties: " + err.message);
      }
    };
    fetchParties();
  }, [currentUser]);

  const handleSearch = () => {
    const filtered = parties.filter(
      (party) =>
        (party.companyName || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (party.gstNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (party.gstOwnerName || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
    );
    setFilteredParties(filtered);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const validationSchema = Yup.object({
    fullName: Yup.string(),
    email: Yup.string().email("Invalid email address"),
    mobileNo: Yup.string()
      .matches(/^[0-9]{10}$/, "Mobile number must be 10 digits")
      .required("Required"),
    companyName: Yup.string().required("Required"),
    gstOwnerName: Yup.string(),
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
    pincode: Yup.string()
      .matches(/^[0-9]{6}$/, "Pincode must be 6 digits")
      .required("Required"),
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
      pincode: "",
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
        if (selectedParty && dialogMode === "edit") {
          await updateDoc(doc(db, "parties", selectedParty.id), partyData);
          setParties(
            parties.map((p) =>
              p.id === selectedParty.id ? { ...p, ...partyData } : p
            )
          );
          setFilteredParties(
            filteredParties.map((p) =>
              p.id === selectedParty.id ? { ...p, ...partyData } : p
            )
          );
          setSuccess("Updated");
        } else {
          const docRef = await addDoc(collection(db, "parties"), partyData);
          const newParty = { id: docRef.id, ...partyData };
          setParties([...parties, newParty]);
          setFilteredParties([...filteredParties, newParty]);
          setSuccess("Added");
        }
        formik.resetForm();
        setSelectedParty(null);
        setOpenDialog(false);
        setDialogMode("add");
      } catch (error) {
        setError(
          `Failed to ${
            selectedParty && dialogMode === "edit" ? "update" : "add"
          } party: ${error.message}`
        );
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const handleEdit = (party) => {
    setSelectedParty(party);
    setDialogMode("edit");
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
      pincode: party.pincode || "",
    });
    setOpenDialog(true);
  };

  const handleView = (party) => {
    setSelectedParty(party);
    setDialogMode("view");
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
      pincode: party.pincode || "",
    });
    setOpenDialog(true);
  };

  const handleDelete = (partyId) => {
    setPartyToDelete(partyId);
    setOpenDeleteDialog(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, "parties", partyToDelete));
      setParties(parties.filter((p) => p.id !== partyToDelete));
      setFilteredParties(filteredParties.filter((p) => p.id !== partyToDelete));
      setSuccess("Deleted");
      setOpenDeleteDialog(false);
      setPartyToDelete(null);
    } catch (error) {
      setError("Failed to delete party: " + error.message);
      setOpenDeleteDialog(false);
    }
  };

  const handleOpenDialog = () => {
    setSelectedParty(null);
    setDialogMode("add");
    formik.resetForm();
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    formik.resetForm();
    setSelectedParty(null);
    setDialogMode("add");
  };

  const handleMenuOpen = (event, partyId) => {
    setAnchorEl(event.currentTarget);
    setSelectedPartyId(partyId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPartyId(null);
  };

  const handleEditWithClose = (party) => {
    handleEdit(party);
    handleMenuClose();
  };

  const handleViewWithClose = (party) => {
    handleView(party);
    handleMenuClose();
  };

  const handleDeleteWithClose = (partyId) => {
    handleDelete(partyId);
    handleMenuClose();
  };

  const handleSwitchToEdit = () => {
    setDialogMode("edit");
  };

  const formatAddress = (party) => {
    return [
      party.plotHouseNo,
      party.line1,
      party.area,
      party.landmark,
      party.city,
      party.state,
      party.pincode,
    ]
      .filter(Boolean)
      .join(", ");
  };

  const handleStateChange = (event) => {
    formik.handleChange(event);
    formik.setFieldValue("city", "");
  };

  // Handler to convert text input to uppercase
  const handleUpperCaseInput = (e) => {
    const { name, value } = e.target;
    formik.setFieldValue(name, value.toUpperCase());
  };

  useEffect(() => {
    if (loading) {
      setLoading(true);
      const timer = setTimeout(() => {
        setLoading(false);
      }, 3000); // 3 seconds

      return () => clearTimeout(timer); // Cleanup on unmount
    }
  }, [loading]);

  if (loading) {
    return (
      <Container
        maxWidth="lg"
        sx={{
          mt: { xs: 2, sm: 3, md: 4 },
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <img
          src={logo}
          alt="Logo"
          style={{ width: "100px", height: "100px" }}
        />
      </Container>
    );
  }

  return (
    <Container
      maxWidth="lg"
      sx={{
        mt: { xs: 2, sm: 3, md: 4 },
        mb: { xs: 2, sm: 3, md: 4 },
        px: { xs: 1, sm: 2 },
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          borderRadius: 2,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <Typography
          variant={isMobile ? "h5" : "h4"}
          gutterBottom
          sx={{
            fontWeight: "bold",
            color: "primary.main",
            textAlign: { xs: "center", sm: "left" },
            fontSize: { xs: "1rem", sm: "1.5rem", md: "1.75rem" },
          }}
        >
          Party Management
        </Typography>

        {success && (
          <Alert
            severity="success"
            sx={{
              mb: 3,
              width: "100%",
              fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
            }}
          >
            Party {success} successfully!
          </Alert>
        )}
        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              width: "100%",
              fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
            }}
          >
            {error}
          </Alert>
        )}

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            mb: 3,
            alignItems: { xs: "stretch", sm: "center" },
            gap: { xs: 2, sm: 2 },
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              width: { xs: "100%", sm: "82%" },
            }}
          >
            <TextField
              fullWidth
              placeholder="Search by Company name or GST number or owner name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{
                "& .MuiInputBase-root": {
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                },
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleSearch}
              size="small"
              sx={{
                minWidth: { xs: "100%", sm: "100px" },
                height: { xs: "40px", sm: "40px" },
                fontSize: { xs: "0.9rem", sm: "1rem" },
                textTransform: "none",
              }}
            >
              <SearchIcon />
            </Button>
          </Box>
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenDialog}
            startIcon={<AddIcon />}
            disabled={!currentUser}
            size="small"
            sx={{
              minWidth: { xs: "100%", sm: "100px" },
              height: { xs: "40px", sm: "40px" },
              fontSize: { xs: "0.9rem", sm: "1rem" },
              textTransform: "none",
            }}
          >
            Add New Party
          </Button>
        </Box>

        <TableContainer
          component={Paper}
          elevation={2}
          sx={{
            borderRadius: 2,
            maxWidth: "100%",
            overflowX: "auto",
          }}
        >
          <Table sx={{ minWidth: { xs: 300, sm: 650 } }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: "primary.light" }}>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                  }}
                >
                  No.
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                  }}
                >
                  Company Name
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                  }}
                >
                  GST No
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                  }}
                >
                  Mobile No
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                  }}
                >
                  GST Owner Name
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                  }}
                ></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredParties.length > 0 ? (
                filteredParties
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((party, index) => (
                    <React.Fragment key={party.id}>
                      <TableRow hover>
                        <TableCell
                          sx={{
                            fontSize: {
                              xs: "0.8rem",
                              sm: "0.9rem",
                              md: "1rem",
                            },
                          }}
                        >
                          {index + 1}
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: {
                              xs: "0.8rem",
                              sm: "0.9rem",
                              md: "1rem",
                            },
                          }}
                        >
                          {party.companyName || "N/A"}
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: {
                              xs: "0.8rem",
                              sm: "0.9rem",
                              md: "1rem",
                            },
                          }}
                        >
                          {party.gstNo || "N/A"}
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: {
                              xs: "0.8rem",
                              sm: "0.9rem",
                              md: "1rem",
                            },
                          }}
                        >
                          {party.mobileNo || "N/A"}
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: {
                              xs: "0.8rem",
                              sm: "0.9rem",
                              md: "1rem",
                            },
                          }}
                        >
                          {party.gstOwnerName || "N/A"}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            onClick={(e) => handleMenuOpen(e, party.id)}
                            size={isMobile ? "small" : "medium"}
                          >
                            <MoreVertIcon />
                          </IconButton>
                          <MenuAction
                            anchorEl={anchorEl}
                            open={
                              Boolean(anchorEl) && selectedPartyId === party.id
                            }
                            onClose={handleMenuClose}
                          >
                            <MenuItemAction
                              onClick={() => handleViewWithClose(party)}
                              sx={{
                                fontSize: { xs: "0.85rem", sm: "0.95rem" },
                              }}
                            >
                              View
                            </MenuItemAction>
                            <MenuItemAction
                              onClick={() => handleEditWithClose(party)}
                              sx={{
                                fontSize: { xs: "0.85rem", sm: "0.95rem" },
                              }}
                            >
                              Edit
                            </MenuItemAction>
                            <MenuItemAction
                              onClick={() => handleDeleteWithClose(party.id)}
                              sx={{
                                fontSize: { xs: "0.85rem", sm: "0.95rem" },
                              }}
                            >
                              Delete
                            </MenuItemAction>
                          </MenuAction>
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
                                p: { xs: 1, sm: 2 },
                                bgcolor: "#fafafa",
                                borderRadius: 1,
                              }}
                            >
                              <Grid
                                container
                                spacing={2}
                                direction={isMobile ? "column" : "row"}
                              >
                                <Grid item xs={12} sm={4}>
                                  <Typography
                                    variant="subtitle1"
                                    sx={{
                                      fontWeight: "bold",
                                      color: "#2c3e50",
                                      mb: 1,
                                      fontSize: {
                                        xs: "0.85rem",
                                        sm: "1rem",
                                      },
                                    }}
                                  >
                                    Party Information
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontSize: {
                                        xs: "0.75rem",
                                        sm: "0.875rem",
                                      },
                                    }}
                                  >
                                    Full Name: {party.fullName || "N/A"}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontSize: {
                                        xs: "0.75rem",
                                        sm: "0.875rem",
                                      },
                                    }}
                                  >
                                    Email: {party.email || "N/A"}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                  <Typography
                                    variant="subtitle1"
                                    sx={{
                                      fontWeight: "bold",
                                      color: "#2c3e50",
                                      mb: 1,
                                      fontSize: {
                                        xs: "0.85rem",
                                        sm: "1rem",
                                      },
                                    }}
                                  >
                                    GST Information
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontSize: {
                                        xs: "0.75rem",
                                        sm: "0.875rem",
                                      },
                                    }}
                                  >
                                    Company Name: {party.companyName || "N/A"}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontSize: {
                                        xs: "0.75rem",
                                        sm: "0.875rem",
                                      },
                                    }}
                                  >
                                    GST No: {party.gstNo || "N/A"}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontSize: {
                                        xs: "0.75rem",
                                        sm: "0.875rem",
                                      },
                                    }}
                                  >
                                    Mobile No: {party.mobileNo || "N/A"}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontSize: {
                                        xs: "0.75rem",
                                        sm: "0.875rem",
                                      },
                                    }}
                                  >
                                    GST Owner: {party.gstOwnerName || "N/A"}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                  <Typography
                                    variant="subtitle1"
                                    sx={{
                                      fontWeight: "bold",
                                      color: "#2c3e50",
                                      mb: 1,
                                      fontSize: {
                                        xs: "0.85rem",
                                        sm: "1rem",
                                      },
                                    }}
                                  >
                                    Address Information
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontSize: {
                                        xs: "0.75rem",
                                        sm: "0.875rem",
                                      },
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {formatAddress(party) || "N/A"}
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
                    <Typography
                      variant="body1"
                      sx={{
                        py: 3,
                        color: "text.secondary",
                        fontSize: { xs: "0.9rem", sm: "1rem" },
                      }}
                    >
                      No parties found. Add a new party to get started!
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={filteredParties.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          sx={{
            mt: 2,
            "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
              {
                fontSize: { xs: "0.85rem", sm: "0.95rem" },
              },
          }}
        />

        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle
            sx={{
              bgcolor: "primary.main",
              color: "white",
              py: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography
                variant={isMobile ? "h6" : "h5"}
                sx={{
                  color: "white",
                  fontSize: { xs: "1rem", sm: "1.25rem" },
                }}
              >
                {dialogMode === "view"
                  ? "View Party"
                  : dialogMode === "edit"
                  ? "Edit Party"
                  : "Add New Party"}
              </Typography>
            </Box>
            <Box>
              {dialogMode === "view" && (
                <IconButton
                  edge="end"
                  color="inherit"
                  onClick={handleSwitchToEdit}
                  sx={{ mr: 1 }}
                  size={isMobile ? "small" : "medium"}
                >
                  <EditIcon />
                </IconButton>
              )}
              <IconButton
                edge="end"
                color="inherit"
                onClick={handleCloseDialog}
                size={isMobile ? "small" : "medium"}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent sx={{ mt: 2, px: { xs: 2, sm: 3 } }}>
            {dialogMode === "view" ? (
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: "bold",
                      color: "#2c3e50",
                      mb: 2,
                      fontSize: { xs: "1rem", sm: "1.25rem" },
                    }}
                  >
                    GST Information
                  </Typography>
                  <Grid container spacing={{ xs: 2, sm: 3 }}>
                    <Grid item xs={12} md={6}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                      >
                        Company Name
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
                      >
                        {formik.values.companyName || "N/A"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                      >
                        GST No
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
                      >
                        {formik.values.gstNo || "N/A"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                      >
                        Mobile No
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
                      >
                        {formik.values.mobileNo || "N/A"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                      >
                        GST Owner Name
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
                      >
                        {formik.values.gstOwnerName || "N/A"}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 2 }} />
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: "bold",
                      color: "#2c3e50",
                      mb: 2,
                      fontSize: { xs: "1rem", sm: "1.25rem" },
                    }}
                  >
                    Party Information
                  </Typography>
                  <Grid container spacing={{ xs: 2, sm: 3 }}>
                    <Grid item xs={12} md={6}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                      >
                        Full Name
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
                      >
                        {formik.values.fullName || "N/A"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                      >
                        Email ID
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
                      >
                        {formik.values.email || "N/A"}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 2 }} />
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: "bold",
                      color: "#2c3e50",
                      mb: 2,
                      fontSize: { xs: "1rem", sm: "1.25rem" },
                    }}
                  >
                    Address Information
                  </Typography>
                  <Grid container spacing={{ xs: 2, sm: 3 }}>
                    <Grid item xs={12} md={4}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                      >
                        Plot/House No
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
                      >
                        {formik.values.plotHouseNo || "N/A"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                      >
                        Line 1
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
                      >
                        {formik.values.line1 || "N/A"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                      >
                        Area
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
                      >
                        {formik.values.area || "N/A"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                      >
                        Landmark
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
                      >
                        {formik.values.landmark || "N/A"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                      >
                        City
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
                      >
                        {formik.values.city || "N/A"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                      >
                        State
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
                      >
                        {formik.values.state || "N/A"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                      >
                        Pincode
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
                      >
                        {formik.values.pincode || "N/A"}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </>
            ) : (
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: "bold",
                      color: "#2c3e50",
                      mb: 2,
                      fontSize: { xs: "1rem", sm: "1.25rem" },
                    }}
                  >
                    GST Information
                  </Typography>
                  <Grid container spacing={{ xs: 2, sm: 3 }}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        id="companyName"
                        name="companyName"
                        label="Company Name"
                        value={formik.values.companyName}
                        onChange={handleUpperCaseInput}
                        onBlur={formik.handleBlur}
                        error={
                          formik.touched.companyName &&
                          Boolean(formik.errors.companyName)
                        }
                        helperText={
                          formik.touched.companyName &&
                          formik.errors.companyName
                        }
                        variant="outlined"
                        size="small"
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        id="gstNo"
                        name="gstNo"
                        label="GST No"
                        value={formik.values.gstNo}
                        onChange={handleUpperCaseInput}
                        onBlur={formik.handleBlur}
                        error={
                          formik.touched.gstNo && Boolean(formik.errors.gstNo)
                        }
                        helperText={formik.touched.gstNo && formik.errors.gstNo}
                        variant="outlined"
                        size="small"
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                          },
                        }}
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
                          formik.touched.mobileNo &&
                          Boolean(formik.errors.mobileNo)
                        }
                        helperText={
                          formik.touched.mobileNo && formik.errors.mobileNo
                        }
                        variant="outlined"
                        size="small"
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        id="gstOwnerName"
                        name="gstOwnerName"
                        label="GST Owner Name"
                        value={formik.values.gstOwnerName}
                        onChange={handleUpperCaseInput}
                        onBlur={formik.handleBlur}
                        error={
                          formik.touched.gstOwnerName &&
                          Boolean(formik.errors.gstOwnerName)
                        }
                        helperText={
                          formik.touched.gstOwnerName &&
                          formik.errors.gstOwnerName
                        }
                        variant="outlined"
                        size="small"
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                          },
                        }}
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: "bold",
                      color: "#2c3e50",
                      mb: 2,
                      fontSize: { xs: "1rem", sm: "1.25rem" },
                    }}
                  >
                    Party Information
                  </Typography>
                  <Grid container spacing={{ xs: 2, sm: 3 }}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        id="fullName"
                        name="fullName"
                        label="Full Name"
                        value={formik.values.fullName}
                        onChange={handleUpperCaseInput}
                        onBlur={formik.handleBlur}
                        error={
                          formik.touched.fullName &&
                          Boolean(formik.errors.fullName)
                        }
                        helperText={
                          formik.touched.fullName && formik.errors.fullName
                        }
                        variant="outlined"
                        size="small"
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                          },
                        }}
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
                        error={
                          formik.touched.email && Boolean(formik.errors.email)
                        }
                        helperText={formik.touched.email && formik.errors.email}
                        variant="outlined"
                        size="small"
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                          },
                        }}
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 2 }} />
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: "bold",
                      color: "#2c3e50",
                      mb: 2,
                      fontSize: { xs: "1rem", sm: "1.25rem" },
                    }}
                  >
                    Address Information
                  </Typography>
                  <Grid container spacing={{ xs: 2, sm: 3 }}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        id="plotHouseNo"
                        name="plotHouseNo"
                        label="Plot/House No"
                        value={formik.values.plotHouseNo}
                        onChange={handleUpperCaseInput}
                        onBlur={formik.handleBlur}
                        error={
                          formik.touched.plotHouseNo &&
                          Boolean(formik.errors.plotHouseNo)
                        }
                        helperText={
                          formik.touched.plotHouseNo &&
                          formik.errors.plotHouseNo
                        }
                        variant="outlined"
                        size="small"
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        id="line1"
                        name="line1"
                        label="Line 1"
                        value={formik.values.line1}
                        onChange={handleUpperCaseInput}
                        onBlur={formik.handleBlur}
                        error={
                          formik.touched.line1 && Boolean(formik.errors.line1)
                        }
                        helperText={formik.touched.line1 && formik.errors.line1}
                        variant="outlined"
                        size="small"
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        id="area"
                        name="area"
                        label="Area"
                        value={formik.values.area}
                        onChange={handleUpperCaseInput}
                        onBlur={formik.handleBlur}
                        error={
                          formik.touched.area && Boolean(formik.errors.area)
                        }
                        helperText={formik.touched.area && formik.errors.area}
                        variant="outlined"
                        size="small"
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        id="landmark"
                        name="landmark"
                        label="Landmark"
                        value={formik.values.landmark}
                        onChange={handleUpperCaseInput}
                        onBlur={formik.handleBlur}
                        error={
                          formik.touched.landmark &&
                          Boolean(formik.errors.landmark)
                        }
                        helperText={
                          formik.touched.landmark && formik.errors.landmark
                        }
                        variant="outlined"
                        size="small"
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <FormControl
                        fullWidth
                        error={
                          formik.touched.state && Boolean(formik.errors.state)
                        }
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                          },
                        }}
                      >
                        <Select
                          id="state"
                          name="state"
                          value={formik.values.state}
                          onChange={handleStateChange}
                          onBlur={() => formik.setFieldTouched("state", true)}
                          displayEmpty
                          size="small"
                          renderValue={(selected) => {
                            if (!selected) {
                              return <em>Select State *</em>;
                            }
                            return selected;
                          }}
                          sx={{
                            "& .MuiInputBase-root": {
                              fontSize: { xs: "0.9rem", sm: "1rem" },
                            },
                          }}
                        >
                          <MenuItem value="">
                            <em>Select State</em>
                          </MenuItem>
                          {states.map((state) => (
                            <MenuItem
                              key={state}
                              value={state}
                              sx={{
                                fontSize: { xs: "0.9rem", sm: "1rem" },
                              }}
                            >
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
                    <Grid item xs={12} md={4}>
                      <FormControl
                        fullWidth
                        error={
                          formik.touched.city && Boolean(formik.errors.city)
                        }
                        disabled={!formik.values.state}
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                          },
                        }}
                      >
                        <Select
                          id="city"
                          name="city"
                          value={formik.values.city}
                          onChange={formik.handleChange}
                          onBlur={() => formik.setFieldTouched("city", true)}
                          displayEmpty
                          size="small"
                          renderValue={(selected) => {
                            if (!selected) {
                              return <em>Select City *</em>;
                            }
                            return selected;
                          }}
                          sx={{
                            "& .MuiInputBase-root": {
                              fontSize: { xs: "0.9rem", sm: "1rem" },
                            },
                          }}
                        >
                          <MenuItem value="">
                            <em>Select City</em>
                          </MenuItem>
                          {formik.values.state &&
                            stateCities[formik.values.state]?.map((city) => (
                              <MenuItem
                                key={city}
                                value={city}
                                sx={{
                                  fontSize: { xs: "0.9rem", sm: "1rem" },
                                }}
                              >
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
                      <TextField
                        fullWidth
                        id="pincode"
                        name="pincode"
                        label="Pincode"
                        value={formik.values.pincode}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={
                          formik.touched.pincode &&
                          Boolean(formik.errors.pincode)
                        }
                        helperText={
                          formik.touched.pincode && formik.errors.pincode
                        }
                        variant="outlined"
                        size="small"
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                          },
                        }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ p: { xs: 1, sm: 2 } }}>
            {dialogMode === "view" ? null : (
              <>
                {(dialogMode === "edit" || dialogMode === "add") && (
                  <Button
                    color="primary"
                    variant="contained"
                    onClick={formik.handleSubmit}
                    disabled={isSubmitting || !currentUser}
                    size="small"
                    sx={{
                      minWidth: { xs: "100%", sm: "100px" },
                      height: { xs: "40px", sm: "40px" },
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                      textTransform: "none",
                    }}
                  >
                    {isSubmitting ? (
                      <CircularProgress size={24} />
                    ) : dialogMode === "edit" ? (
                      "Update"
                    ) : (
                      "Save"
                    )}
                  </Button>
                )}
              </>
            )}
          </DialogActions>
        </Dialog>

        <Dialog
          open={openDeleteDialog}
          onClose={() => setOpenDeleteDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle
            sx={{
              bgcolor: "primary.main",
              color: "white",
              py: 2,
              fontSize: { xs: "1rem", sm: "1.25rem" },
            }}
          >
            Confirm Delete
          </DialogTitle>
          <DialogContent sx={{ mt: 2, px: { xs: 2, sm: 3 } }}>
            <Typography
              sx={{ fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" } }}
            >
              Are you sure you want to delete this party? This action cannot be
              undone.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: { xs: 1, sm: 2 } }}>
            <Button
              onClick={() => setOpenDeleteDialog(false)}
              variant="outlined"
              color="primary"
              size="small"
              sx={{
                minWidth: { xs: "100%", sm: "100px" },
                height: { xs: "40px", sm: "40px" },
                fontSize: { xs: "0.9rem", sm: "1rem" },
                textTransform: "none",
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              variant="contained"
              color="error"
              size="small"
              startIcon={<DeleteIcon />}
              sx={{
                minWidth: { xs: "100%", sm: "100px" },
                height: { xs: "40px", sm: "40px" },
                fontSize: { xs: "0.9rem", sm: "1rem" },
                textTransform: "none",
              }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
};

export default PartyManagement;
