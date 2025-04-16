import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import {
  Container,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  Box,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  ArrowBack,
  Edit,
  PictureAsPdf,
  Save,
  Cancel,
  Add,
  Delete,
} from "@mui/icons-material";
import { PDFDownloadLink } from "@react-pdf/renderer";
import BillPDF from "./BillPDF";
import { numberToWords } from "../utils";
import { useAuth } from "../contexts/AuthContext";
import { format } from "date-fns";

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
  Delhi: [
    "New Delhi",
    "South Delhi",
    "North Delhi",
    "East Delhi",
    "West Delhi",
  ],
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

const ViewBill = () => {
  const { billId } = useParams();
  const { userProfile } = useAuth();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBill, setEditedBill] = useState(null);
  const [openAddItem, setOpenAddItem] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    hsn: "",
    quantity: 0,
    price: 0,
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const docRef = doc(db, "bills", billId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const billData = { id: docSnap.id, ...docSnap.data() };
          // Sanitize items to ensure price and quantity are numbers
          const sanitizedBill = {
            ...billData,
            items: (billData.items || []).map((item) => ({
              ...item,
              price: parseFloat(item.price) || 0,
              quantity: parseFloat(item.quantity) || 1,
            })),
            total: parseFloat(billData.total) || 0,
            subtotal: parseFloat(billData.subtotal) || 0,
            taxableAmount: parseFloat(billData.taxableAmount) || 0,
            discountAmount: parseFloat(billData.discountAmount) || 0,
            cgst: parseFloat(billData.cgst) || 0,
            sgst: parseFloat(billData.sgst) || 0,
          };
          setBill(sanitizedBill);
          setEditedBill(sanitizedBill);
        }
      } catch (error) {
        console.error("Error fetching bill: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBill();
  }, [billId]);

  const formatAddress = (address) => {
    if (!address || typeof address !== "object") return "N/A";
    const { plotHouseNo, line1, area, landmark, city, state, pincode } =
      address;
    return [plotHouseNo, line1, area, landmark, city, state, pincode]
      .filter(Boolean)
      .join(", ");
  };

  const calculateTotals = () => {
    const subtotal = editedBill.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );
    const discountAmount = subtotal * (editedBill.discount / 100);
    const taxableAmount = subtotal - discountAmount;
    const cgst = taxableAmount * (editedBill.gstRate / 100 / 2);
    const sgst = taxableAmount * (editedBill.gstRate / 100 / 2);
    const total = taxableAmount + cgst + sgst;
    return { subtotal, discountAmount, taxableAmount, cgst, sgst, total };
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      setEditedBill(bill);
    }
  };

  const handleSave = async () => {
    try {
      const { subtotal, discountAmount, taxableAmount, cgst, sgst, total } =
        calculateTotals();
      const updatedBill = {
        ...editedBill,
        subtotal,
        discountAmount,
        taxableAmount,
        cgst,
        sgst,
        total,
      };
      const docRef = doc(db, "bills", billId);
      await updateDoc(docRef, updatedBill);
      setBill(updatedBill);
      setIsEditing(false);
      setSnackbar({
        open: true,
        message: "Invoice updated successfully!",
        severity: "success",
      });
    } catch (error) {
      console.error("Error updating bill: ", error);
      setSnackbar({
        open: true,
        message: "Failed to update invoice",
        severity: "error",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, "bills", billId));
      setSnackbar({
        open: true,
        message: "Invoice deleted successfully!",
        severity: "success",
      });
      setTimeout(() => {
        window.location.href = `/party-bills/${bill.partyId}`;
      }, 1500);
    } catch (error) {
      console.error("Error deleting bill: ", error);
      setSnackbar({
        open: true,
        message: "Failed to delete invoice",
        severity: "error",
      });
    }
  };

  const handleInputChange = (field, value) => {
    setEditedBill((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddressChange = (field, value) => {
    setEditedBill((prev) => ({
      ...prev,
      partyDetails: {
        ...prev.partyDetails,
        [field]: value,
        ...(field === "state" && { city: "" }), // Reset city when state changes
      },
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...editedBill.items];
    updatedItems[index][field] =
      field === "quantity" || field === "price" ? Number(value) || 0 : value;
    setEditedBill((prev) => ({
      ...prev,
      items: updatedItems,
    }));
  };

  const handleAddItem = () => {
    setEditedBill((prev) => ({
      ...prev,
      items: [...prev.items, { ...newItem }],
    }));
    setNewItem({ name: "", hsn: "", quantity: 0, price: 0 });
    setOpenAddItem(false);
  };

  const handleDeleteItem = (index) => {
    if (editedBill.items.length <= 1) {
      setSnackbar({
        open: true,
        message: "An invoice must have at least one item",
        severity: "warning",
      });
      return;
    }
    const updatedItems = editedBill.items.filter((_, i) => i !== index);
    setEditedBill((prev) => ({
      ...prev,
      items: updatedItems,
    }));
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return (
      <Container
        sx={{
          mt: 4,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "80vh",
        }}
      >
        <CircularProgress />
      </Container>
    );
  }

  if (!bill) {
    return (
      <Container sx={{ mt: 4, px: { xs: 2, sm: 3 } }}>
        <Paper
          elevation={3}
          sx={{
            p: { xs: 2, sm: 3, md: 4 },
            borderRadius: 2,
            maxWidth: "100%",
          }}
        >
          <Typography variant="h6" color="error" sx={{ mb: 2 }}>
            Invoice not found
          </Typography>
          <Button
            component={Link}
            to="/parties"
            startIcon={<ArrowBack />}
            variant="outlined"
            size="medium"
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            Back to All Parties
          </Button>
        </Paper>
      </Container>
    );
  }

  const { subtotal, discountAmount, taxableAmount, cgst, sgst, total } =
    calculateTotals();

  return (
    <Container sx={{ mt: 4, mb: 4, px: { xs: 2, sm: 3 } }}>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: 2,
        }}
      >
        <Button
          component={Link}
          to={`/party-bills/${bill.partyId}`}
          startIcon={<ArrowBack />}
          variant="outlined"
          size="medium"
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          Back to Party Invoices
        </Button>
        <Box
          sx={{
            display: "flex",
            gap: 1.5,
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "flex-start",
            p: 1,
          }}
        >
          {isEditing ? (
            <>
              <Tooltip title="Save Changes">
                <IconButton
                  onClick={handleSave}
                  size="medium"
                  sx={{
                    bgcolor: "success.main",
                    color: "common.white",
                    borderRadius: "12px",
                    boxShadow: 3,
                    transition: "all 0.3s ease",
                    "&:hover": {
                      bgcolor: "success.dark",
                      transform: "scale(1.05)",
                    },
                  }}
                >
                  <Save />
                </IconButton>
              </Tooltip>
              <Tooltip title="Cancel Editing">
                <IconButton
                  onClick={handleEditToggle}
                  size="medium"
                  sx={{
                    bgcolor: "error.main",
                    color: "common.white",
                    borderRadius: "12px",
                    boxShadow: 3,
                    transition: "all 0.3s ease",
                    "&:hover": {
                      bgcolor: "error.dark",
                      transform: "scale(1.05)",
                    },
                  }}
                >
                  <Cancel />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip title="Edit Invoice">
                <IconButton
                  onClick={handleEditToggle}
                  size="medium"
                  sx={{
                    bgcolor: "primary.main",
                    color: "common.white",
                    borderRadius: "12px",
                    boxShadow: 3,
                    transition: "all 0.3s ease",
                    "&:hover": {
                      bgcolor: "primary.dark",
                      transform: "scale(1.05)",
                    },
                  }}
                >
                  <Edit />
                </IconButton>
              </Tooltip>

              <PDFDownloadLink
                document={<BillPDF bill={bill} user={userProfile} />}
                fileName={`invoice_${bill.billNo}.pdf`}
              >
                {({ loading }) => (
                  <Tooltip title="Download PDF">
                    <span>
                      <IconButton
                        disabled={loading}
                        size="medium"
                        sx={{
                          bgcolor: loading ? "grey.400" : "secondary.main",
                          color: "common.white",
                          borderRadius: "12px",
                          boxShadow: 3,
                          transition: "all 0.3s ease",
                          "&:hover": {
                            bgcolor: loading ? "grey.500" : "secondary.dark",
                            transform: loading ? "none" : "scale(1.05)",
                          },
                        }}
                      >
                        <PictureAsPdf />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </PDFDownloadLink>

              <Tooltip title="Delete Invoice">
                <IconButton
                  onClick={() => setOpenDeleteDialog(true)}
                  size="medium"
                  sx={{
                    bgcolor: "error.main",
                    color: "common.white",
                    borderRadius: "12px",
                    boxShadow: 3,
                    transition: "all 0.3s ease",
                    "&:hover": {
                      bgcolor: "error.dark",
                      transform: "scale(1.05)",
                    },
                  }}
                >
                  <Delete />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      </Box>

      <Paper
        elevation={3}
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          borderRadius: 2,
          maxWidth: "100%",
        }}
      >
        <Grid
          container
          justifyContent="space-between"
          alignItems="flex-start"
          sx={{ mb: 4, flexDirection: { xs: "column", md: "row" } }}
        >
          <Grid item xs={12} md={6} sx={{ mb: { xs: 2, md: 0 } }}>
            <Typography
              variant="h4"
              gutterBottom
              sx={{
                fontWeight: "bold",
                color: "primary.main",
                fontSize: { xs: "1.5rem", sm: "2rem" },
              }}
            >
              {userProfile?.companyName || "N/A"}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
            >
              GSTIN: {userProfile?.gstNo || "N/A"}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
            >
              Address: {formatAddress(userProfile?.address)}
            </Typography>
          </Grid>
          <Grid
            item
            xs={12}
            md={6}
            sx={{ textAlign: { xs: "left", md: "right" } }}
          >
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                fontWeight: "bold",
                color: "primary.main",
                fontSize: { xs: "1rem", sm: "1.25rem" },
              }}
            >
              TAX INVOICE
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
            >
              <strong>Invoice No.:</strong> {bill.billNo}
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
            >
              <strong>Date:</strong> {format(new Date(bill.date), "dd-MM-yyyy")}
            </Typography>
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Typography
              variant="subtitle1"
              gutterBottom
              sx={{
                fontWeight: "bold",
                fontSize: { xs: "1rem", sm: "1.125rem" },
              }}
            >
              Billed To:
            </Typography>
            {isEditing ? (
              <>
                <TextField
                  fullWidth
                  label="Company Name"
                  value={editedBill.partyDetails.companyName || ""}
                  onChange={(e) =>
                    handleAddressChange("companyName", e.target.value)
                  }
                  sx={{ mb: 2 }}
                  variant="outlined"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="GSTIN"
                  value={editedBill.partyDetails.gstNo || ""}
                  onChange={(e) => handleAddressChange("gstNo", e.target.value)}
                  sx={{ mb: 2 }}
                  variant="outlined"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Mobile"
                  value={editedBill.partyDetails.mobileNo || ""}
                  onChange={(e) =>
                    handleAddressChange("mobileNo", e.target.value)
                  }
                  sx={{ mb: 2 }}
                  variant="outlined"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Plot/House No"
                  value={editedBill.partyDetails.plotHouseNo || ""}
                  onChange={(e) =>
                    handleAddressChange("plotHouseNo", e.target.value)
                  }
                  sx={{ mb: 2 }}
                  variant="outlined"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Line 1"
                  value={editedBill.partyDetails.line1 || ""}
                  onChange={(e) => handleAddressChange("line1", e.target.value)}
                  sx={{ mb: 2 }}
                  variant="outlined"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Area"
                  value={editedBill.partyDetails.area || ""}
                  onChange={(e) => handleAddressChange("area", e.target.value)}
                  sx={{ mb: 2 }}
                  variant="outlined"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Landmark"
                  value={editedBill.partyDetails.landmark || ""}
                  onChange={(e) =>
                    handleAddressChange("landmark", e.target.value)
                  }
                  sx={{ mb: 2 }}
                  variant="outlined"
                  size="small"
                />
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>State</InputLabel>
                  <Select
                    value={editedBill.partyDetails.state || ""}
                    onChange={(e) =>
                      handleAddressChange("state", e.target.value)
                    }
                    label="State"
                    size="small"
                  >
                    {Object.keys(stateCities).map((state) => (
                      <MenuItem key={state} value={state}>
                        {state}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>City</InputLabel>
                  <Select
                    value={editedBill.partyDetails.city || ""}
                    onChange={(e) =>
                      handleAddressChange("city", e.target.value)
                    }
                    label="City"
                    size="small"
                    disabled={!editedBill.partyDetails.state}
                  >
                    {(stateCities[editedBill.partyDetails.state] || []).map(
                      (city) => (
                        <MenuItem key={city} value={city}>
                          {city}
                        </MenuItem>
                      )
                    )}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Pincode"
                  value={editedBill.partyDetails.pincode || ""}
                  onChange={(e) =>
                    handleAddressChange("pincode", e.target.value)
                  }
                  sx={{ mb: 2 }}
                  variant="outlined"
                  size="small"
                />
              </>
            ) : (
              <>
                <Typography
                  sx={{ fontSize: { xs: "0.9rem", sm: "1rem" }, mb: 0.5 }}
                >
                  {bill.partyDetails.companyName || "N/A"}
                </Typography>
                <Typography
                  sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" }, mb: 0.5 }}
                >
                  GSTIN: {bill.partyDetails.gstNo || "N/A"}
                </Typography>
                <Typography
                  sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" }, mb: 0.5 }}
                >
                  Mobile: {bill.partyDetails.mobileNo || "N/A"}
                </Typography>
                <Typography sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}>
                  {formatAddress(bill.partyDetails)}
                </Typography>
              </>
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography
              variant="subtitle1"
              gutterBottom
              sx={{
                fontWeight: "bold",
                fontSize: { xs: "1rem", sm: "1.125rem" },
              }}
            >
              Payment Details:
            </Typography>
            {isEditing ? (
              <>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={editedBill.paymentMethod}
                    onChange={(e) =>
                      handleInputChange("paymentMethod", e.target.value)
                    }
                    label="Payment Method"
                    size="small"
                  >
                    <MenuItem value="cheque">Cheque</MenuItem>
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="upi">UPI</MenuItem>
                    <MenuItem value="netbanking">Net Banking</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={editedBill.status}
                    onChange={(e) =>
                      handleInputChange("status", e.target.value)
                    }
                    label="Status"
                    size="small"
                  >
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                  </Select>
                </FormControl>
              </>
            ) : (
              <>
                <Typography
                  sx={{ fontSize: { xs: "0.9rem", sm: "1rem" }, mb: 1 }}
                >
                  <strong>Method:</strong> {bill.paymentMethod.toUpperCase()}
                </Typography>
                <Box>
                  <strong>Status:</strong>{" "}
                  <Chip
                    label={bill.status.toUpperCase()}
                    color={
                      bill.status === "paid"
                        ? "success"
                        : bill.status === "pending"
                        ? "warning"
                        : "error"
                    }
                    size="small"
                    variant="outlined"
                  />
                </Box>
              </>
            )}
          </Grid>
        </Grid>

        <TableContainer
          component={Paper}
          elevation={2}
          sx={{ mb: 4, borderRadius: 2, overflowX: "auto" }}
        >
          <Table sx={{ minWidth: { xs: 600, sm: 650 } }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: "primary.light" }}>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: {
                      xs: "0.85rem",
                      sm: "0.95rem",
                      md: "1rem",
                    },
                  }}
                >
                  No
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: {
                      xs: "0.85rem",
                      sm: "0.95rem",
                      md: "1rem",
                    },
                  }}
                >
                  Item Name
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: {
                      xs: "0.85rem",
                      sm: "0.95rem",
                      md: "1rem",
                    },
                  }}
                >
                  HSN
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: {
                      xs: "0.85rem",
                      sm: "0.95rem",
                      md: "1rem",
                    },
                  }}
                >
                  Quantity
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: {
                      xs: "0.85rem",
                      sm: "0.95rem",
                      md: "1rem",
                    },
                  }}
                >
                  Price (₹)
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: {
                      xs: "0.85rem",
                      sm: "0.95rem",
                      md: "1rem",
                    },
                  }}
                >
                  Amount (₹)
                </TableCell>
                {isEditing && (
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      fontSize: {
                        xs: "0.85rem",
                        sm: "0.95rem",
                        md: "1rem",
                      },
                    }}
                  >
                    Action
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {editedBill.items && editedBill.items.length > 0 ? (
                editedBill.items.map((item, index) => (
                  <TableRow key={index} hover>
                    <TableCell
                      sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
                    >
                      {index + 1}
                    </TableCell>
                    <TableCell
                      sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
                    >
                      {isEditing ? (
                        <TextField
                          value={item.name}
                          onChange={(e) =>
                            handleItemChange(index, "name", e.target.value)
                          }
                          size="small"
                          fullWidth
                          sx={{
                            minWidth: { xs: 100, sm: 150 },
                            "& .MuiInputBase-root": {
                              fontSize: { xs: "0.9rem", sm: "1rem" },
                            },
                            "& .MuiFormHelperText-root": {
                              color: "error.main",
                            },
                          }}
                        />
                      ) : (
                        item.name
                      )}
                    </TableCell>
                    <TableCell
                      sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
                    >
                      {isEditing ? (
                        <TextField
                          value={item.hsn}
                          onChange={(e) =>
                            handleItemChange(index, "hsn", e.target.value)
                          }
                          size="small"
                          fullWidth
                          sx={{
                            minWidth: { xs: 80, sm: 120 },
                            "& .MuiInputBase-root": {
                              fontSize: { xs: "0.9rem", sm: "1rem" },
                            },
                            "& .MuiFormHelperText-root": {
                              color: "error.main",
                            },
                          }}
                        />
                      ) : (
                        item.hsn
                      )}
                    </TableCell>
                    <TableCell
                      sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
                    >
                      {isEditing ? (
                        <TextField
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(index, "quantity", e.target.value)
                          }
                          size="small"
                          fullWidth
                          sx={{
                            minWidth: { xs: 60, sm: 80 },
                            "& .MuiInputBase-root": {
                              fontSize: { xs: "0.9rem", sm: "1rem" },
                            },
                            "& .MuiFormHelperText-root": {
                              color: "error.main",
                            },
                          }}
                          inputProps={{ min: 1 }}
                        />
                      ) : (
                        item.quantity
                      )}
                    </TableCell>
                    <TableCell
                      sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
                    >
                      {isEditing ? (
                        <TextField
                          type="number"
                          value={item.price}
                          onChange={(e) =>
                            handleItemChange(index, "price", e.target.value)
                          }
                          size="small"
                          fullWidth
                          sx={{
                            minWidth: { xs: 80, sm: 100 },
                            "& .MuiInputBase-root": {
                              fontSize: { xs: "0.9rem", sm: "1rem" },
                            },
                            "& .MuiFormHelperText-root": {
                              color: "error.main",
                            },
                          }}
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                      ) : (
                        `₹${(Number(item.price) || 0).toFixed(2)}`
                      )}
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
                      ₹{(item.quantity * (Number(item.price) || 0)).toFixed(2)}
                    </TableCell>
                    {isEditing && (
                      <TableCell>
                        <IconButton
                          onClick={() => handleDeleteItem(index)}
                          color="error"
                          size="small"
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={isEditing ? 7 : 6} align="center">
                    <Typography
                      sx={{ py: 2, fontSize: { xs: "0.9rem", sm: "1rem" } }}
                    >
                      No items available
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {isEditing && (
          <Button
            variant="outlined"
            color="primary"
            startIcon={<Add />}
            onClick={() => setOpenAddItem(true)}
            size="large"
            sx={{
              mb: 3,
              minWidth: { xs: "100%", sm: "160px" },
              height: { xs: "48px", sm: "56px" },
              fontSize: { xs: "0.9rem", sm: "1rem" },
              textTransform: "none",
            }}
          >
            Add New Item
          </Button>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography
              variant="subtitle1"
              gutterBottom
              sx={{
                fontWeight: "bold",
                fontSize: { xs: "1rem", sm: "1.125rem" },
              }}
            >
              Additional Details:
            </Typography>
            {isEditing ? (
              <>
                <TextField
                  fullWidth
                  label="Discount (%)"
                  type="number"
                  value={editedBill.discount || 0}
                  onChange={(e) =>
                    handleInputChange(
                      "discount",
                      Math.min(100, Math.max(0, Number(e.target.value) || 0))
                    )
                  }
                  inputProps={{ min: 0, max: 100, step: 0.01 }}
                  sx={{ mb: 2 }}
                  variant="outlined"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Notes"
                  value={editedBill.notes || ""}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  multiline
                  rows={3}
                  sx={{
                    "& .MuiInputBase-root": {
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                    },
                  }}
                  variant="outlined"
                  size="small"
                />
              </>
            ) : (
              <>
                <Typography
                  sx={{ fontSize: { xs: "0.9rem", sm: "1rem" }, mb: 1 }}
                >
                  <strong>Notes:</strong> {bill.notes || "N/A"}
                </Typography>
              </>
            )}
            <Typography
              variant="body1"
              gutterBottom
              sx={{ mt: 2, fontSize: { xs: "0.9rem", sm: "1rem" } }}
            >
              <strong>Amount in Words:</strong> {numberToWords(total)}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper
              elevation={2}
              sx={{
                p: { xs: 2, sm: 3 },
                borderRadius: 2,
                backgroundColor: "background.default",
              }}
            >
              <Box sx={{ mb: 1 }}>
                <Grid container justifyContent="space-between">
                  <Typography
                    sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
                  >
                    Subtotal:
                  </Typography>
                  <Typography
                    sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
                  >
                    ₹{subtotal.toFixed(2)}
                  </Typography>
                </Grid>
              </Box>
              <Box sx={{ mb: 1 }}>
                <Grid container justifyContent="space-between">
                  <Typography
                    sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
                  >
                    Discount ({editedBill.discount}%):
                  </Typography>
                  <Typography
                    sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
                  >
                    ₹{discountAmount.toFixed(2)}
                  </Typography>
                </Grid>
              </Box>
              <Box sx={{ mb: 1 }}>
                <Grid container justifyContent="space-between">
                  <Typography
                    sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
                  >
                    Taxable Amount:
                  </Typography>
                  <Typography
                    sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
                  >
                    ₹{taxableAmount.toFixed(2)}
                  </Typography>
                </Grid>
              </Box>
              {isEditing ? (
                <Box sx={{ mb: 1 }}>
                  <FormControl fullWidth>
                    <InputLabel>GST Rate (%)</InputLabel>
                    <Select
                      value={editedBill.gstRate}
                      onChange={(e) =>
                        handleInputChange("gstRate", Number(e.target.value))
                      }
                      label="GST Rate (%)"
                      size="small"
                    >
                      <MenuItem value={0}>0% (Exempt)</MenuItem>
                      <MenuItem value={5}>5%</MenuItem>
                      <MenuItem value={12}>12%</MenuItem>
                      <MenuItem value={18}>18%</MenuItem>
                      <MenuItem value={28}>28%</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              ) : (
                <>
                  <Box sx={{ mb: 1 }}>
                    <Grid container justifyContent="space-between">
                      <Typography
                        sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
                      >
                        CGST ({bill.gstRate / 2}%):
                      </Typography>
                      <Typography
                        sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
                      >
                        ₹{cgst.toFixed(2)}
                      </Typography>
                    </Grid>
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <Grid container justifyContent="space-between">
                      <Typography
                        sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
                      >
                        SGST ({bill.gstRate / 2}%):
                      </Typography>
                      <Typography
                        sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
                      >
                        ₹{sgst.toFixed(2)}
                      </Typography>
                    </Grid>
                  </Box>
                </>
              )}
              <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
                <Grid container justifyContent="space-between">
                  <Typography
                    variant="subtitle1"
                    sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                  >
                    <strong>Total:</strong>
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    color="primary.main"
                    sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                  >
                    <strong>₹{total.toFixed(2)}</strong>
                  </Typography>
                </Grid>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      <Dialog
        open={openAddItem}
        onClose={() => setOpenAddItem(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add New Item</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Item Name"
            value={newItem.name}
            onChange={(e) =>
              setNewItem((prev) => ({ ...prev, name: e.target.value }))
            }
            sx={{ mt: 2 }}
            variant="outlined"
            size="small"
          />
          <TextField
            fullWidth
            label="HSN Code"
            value={newItem.hsn}
            onChange={(e) =>
              setNewItem((prev) => ({ ...prev, hsn: e.target.value }))
            }
            sx={{ mt: 2 }}
            variant="outlined"
            size="small"
          />
          <TextField
            fullWidth
            type="number"
            label="Quantity"
            value={newItem.quantity}
            onChange={(e) =>
              setNewItem((prev) => ({
                ...prev,
                quantity: Number(e.target.value) || 1,
              }))
            }
            sx={{ mt: 2 }}
            inputProps={{ min: 1 }}
            variant="outlined"
            size="small"
          />
          <TextField
            fullWidth
            type="number"
            label="Price (₹)"
            value={newItem.price}
            onChange={(e) =>
              setNewItem((prev) => ({
                ...prev,
                price: Number(e.target.value) || 0,
              }))
            }
            sx={{ mt: 2 }}
            inputProps={{ min: 0, step: 0.01 }}
            variant="outlined"
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenAddItem(false)}
            color="error"
            size="medium"
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddItem}
            variant="contained"
            color="primary"
            size="medium"
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            Add Item
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Delete Invoice</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}>
            Are you sure you want to delete Invoice #{bill.billNo}? This action
            cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenDeleteDialog(false)}
            color="error"
            size="medium"
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            size="medium"
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ViewBill;