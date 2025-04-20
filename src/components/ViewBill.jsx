import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useFormik } from "formik";
import * as Yup from "yup";
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
  useMediaQuery,
  useTheme,
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { billId } = useParams();
  const { userProfile, currentUser } = useAuth();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [openAddItem, setOpenAddItem] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    hsn: "",
    quantity: "",
    price: "",
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [userState, setUserState] = useState("");

  const validationSchema = Yup.object({
    partyDetails: Yup.object({
      companyName: Yup.string()
        .trim()
        .required("Company name is required")
        .min(1, "Company name cannot be empty")
        .max(100, "Company name cannot exceed 100 characters"),
      gstNo: Yup.string()
        .required("GSTIN is required")
        .matches(
          /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
          "Invalid GSTIN format"
        ),
      mobileNo: Yup.string()
        .optional()
        .matches(/^[0-9]{10}$/, {
          message: "Mobile number must be 10 digits",
          excludeEmptyString: true,
        }),
      plotHouseNo: Yup.string()
        .optional()
        .max(50, "Plot/House No cannot exceed 50 characters"),
      line1: Yup.string()
        .optional()
        .max(100, "Address Line 1 cannot exceed 100 characters"),
      area: Yup.string()
        .optional()
        .max(100, "Area cannot exceed 100 characters"),
      landmark: Yup.string()
        .optional()
        .max(100, "Landmark cannot exceed 100 characters"),
      state: Yup.string()
        .required("State is required")
        .oneOf(Object.keys(stateCities), "Invalid state"),
      city: Yup.string()
        .required("City is required")
        .test(
          "valid-city",
          "Invalid city for selected state",
          function (value) {
            const { state } = this.parent;
            return state && stateCities[state]?.includes(value);
          }
        ),
      pincode: Yup.string()
        .optional()
        .matches(/^[0-9]{6}$/, {
          message: "Pincode must be 6 digits",
          excludeEmptyString: true,
        }),
    }),
    paymentMethod: Yup.string()
      .required("Payment method is required")
      .oneOf(["cheque", "cash", "upi", "netbanking"], "Invalid payment method"),
    gstRate: Yup.number()
      .required("GST rate is required")
      .min(0, "GST rate cannot be negative")
      .oneOf([0, 5, 12, 18, 28], "Invalid GST rate"),
    date: Yup.date()
      .required("Invoice date is required")
      .max(new Date(), "Date cannot be in the future")
      .typeError("Invalid date format"),
    challanNo: Yup.string()
      .required("Party challan number is required")
      .matches(/^[0-9-]{1,20}$/, "Invalid challan number format")
      .max(20, "Challan number cannot exceed 20 characters"),
    items: Yup.array()
      .of(
        Yup.object({
          name: Yup.string()
            .trim()
            .required("Item name is required")
            .min(1, "Item name cannot be empty")
            .max(100, "Item name cannot exceed 100 characters"),
          hsn: Yup.string()
            .optional()
            .matches(/^\d{4,8}$/, {
              message: "HSN code must be 4 to 8 digits",
              excludeEmptyString: true,
            })
            .max(8, "HSN code cannot exceed 8 characters"),
          quantity: Yup.number()
            .required("Quantity is required")
            .min(1, "Quantity must be at least 1")
            .max(10000, "Quantity cannot exceed 10,000")
            .typeError("Quantity must be a number"),
          price: Yup.number()
            .required("Price is required")
            .min(0.01, "Price must be greater than 0")
            .max(1000000, "Price cannot exceed 1,000,000")
            .typeError("Price must be a number"),
        })
      )
      .min(1, "At least one item is required")
      .required("Items are required"),
    discount: Yup.number()
      .optional()
      .min(0, "Discount cannot be negative")
      .max(100, "Discount cannot exceed 100%")
      .typeError("Discount must be a number"),
    notes: Yup.string()
      .optional()
      .max(500, "Notes cannot exceed 500 characters"),
  });

  useEffect(() => {
    const fetchBillAndUserState = async () => {
      try {
        // Fetch user state
        if (currentUser) {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setUserState(userSnap.data().address?.state || "");
          }
        }

        // Fetch bill
        const docRef = doc(db, "bills", billId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const billData = { id: docSnap.id, ...docSnap.data() };
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
            igst: parseFloat(billData.igst) || 0,
            discount: parseFloat(billData.discount) || 0,
            date: billData.date
              ? format(new Date(billData.date), "yyyy-MM-dd")
              : format(new Date(), "yyyy-MM-dd"),
            challanNo: billData.challanNo || "",
          };
          setBill(sanitizedBill);
          formik.setValues(sanitizedBill);
        }
      } catch (error) {
        console.error("Error fetching bill: ", error);
        setSnackbar({
          open: true,
          message: "Failed to fetch invoice",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchBillAndUserState();
  }, [billId, currentUser]);

  const formatAddress = (address) => {
    if (!address || typeof address !== "object") return "N/A";
    const { plotHouseNo, line1, area, landmark, city, state, pincode } =
      address;
    return [plotHouseNo, line1, area, landmark, city, state, pincode]
      .filter(Boolean)
      .join(", ");
  };

  const calculateTotals = (values) => {
    const subtotal = values.items.reduce(
      (sum, item) =>
        sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0),
      0
    );
    const discountAmount =
      subtotal * ((parseFloat(values.discount) || 0) / 100);
    const taxableAmount = subtotal - discountAmount;
    const isInterState = values.partyDetails?.state !== userState;
    const cgst = isInterState ? 0 : taxableAmount * (values.gstRate / 100 / 2);
    const sgst = isInterState ? 0 : taxableAmount * (values.gstRate / 100 / 2);
    const igst = isInterState ? 0 : taxableAmount * (values.gstRate / 100);
    const total = taxableAmount + (isInterState ? igst : cgst + sgst);
    return { subtotal, discountAmount, taxableAmount, cgst, sgst, igst, total };
  };

  const formik = useFormik({
    initialValues: {
      billNo: "",
      date: format(new Date(), "yyyy-MM-dd"),
      partyDetails: {
        companyName: "",
        gstNo: "",
        mobileNo: "",
        plotHouseNo: "",
        line1: "",
        area: "",
        landmark: "",
        state: "",
        city: "",
        pincode: "",
      },
      paymentMethod: "cheque",
      gstRate: 0,
      status: "pending",
      notes: "",
      items: [{ name: "", hsn: "", quantity: "", price: "" }],
      discount: "",
      challanNo: "",
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        const {
          subtotal,
          discountAmount,
          taxableAmount,
          cgst,
          sgst,
          igst,
          total,
        } = calculateTotals(values);
        const updatedBill = {
          ...values,
          subtotal,
          discount: parseFloat(values.discount) || 0,
          discountAmount,
          taxableAmount,
          cgst,
          sgst,
          igst,
          total,
          updatedAt: new Date().toISOString(),
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
    },
  });

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      formik.setValues(bill);
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

  const handleAddItem = () => {
    const newItems = [...formik.values.items, { ...newItem }];
    formik.setFieldValue("items", newItems);
    setNewItem({ name: "", hsn: "", quantity: "", price: "" });
    setOpenAddItem(false);
  };

  const handleDeleteItem = (index) => {
    if (formik.values.items.length <= 1) {
      setSnackbar({
        open: true,
        message: "An invoice must have at least one item",
        severity: "warning",
      });
      return;
    }
    const updatedItems = formik.values.items.filter((_, i) => i !== index);
    formik.setFieldValue("items", updatedItems);
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
      <Container sx={{ mt: 4, px: { xs: 1, sm: 2 } }}>
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

  const { subtotal, discountAmount, taxableAmount, cgst, sgst, igst, total } =
    calculateTotals(formik.values);

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
                    onClick={formik.handleSubmit}
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
              sx={{ fontSize: { xs: "1rem", sm: "1rem" } }}
            >
              GSTIN: {userProfile?.gstNo || "N/A"}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: { xs: "1rem", sm: "1rem" } }}
            >
              UDYAM No.:{userProfile?.udyamNo || "N/A"}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: { xs: "1rem", sm: "1rem" } }}
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
              sx={{ fontSize: { xs: "1rem", sm: "1rem" } }}
            >
              <strong>Invoice No.:</strong> {bill.billNo}
            </Typography>
            <Box
              sx={{
                fontSize: { xs: "1rem", sm: "1rem" },
                color: "text.primary",
                mb: 1,
              }}
            >
              {isEditing ? (
                <TextField
                  label="Party Challan No *"
                  name="challanNo"
                  value={formik.values.challanNo}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.challanNo && Boolean(formik.errors.challanNo)
                  }
                  helperText={
                    formik.touched.challanNo && formik.errors.challanNo
                  }
                  sx={{ mt: 1.5, mb: 1.5 }}
                  variant="outlined"
                  size="small"
                />
              ) : (
                <Typography
                  variant="body2"
                  sx={{ fontSize: { xs: "1rem", sm: "1rem" } }}
                >
                  <strong>Challan No.:</strong> {bill.challanNo || "N/A"}
                </Typography>
              )}
            </Box>
            <Typography
              variant="body2"
              sx={{ fontSize: { xs: "1rem", sm: "1rem" } }}
            >
              <strong>Date:</strong> {format(new Date(bill.date), "dd-MM-yyyy")}
            </Typography>
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mb:2 }}>
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
                  label="Company Name *"
                  name="partyDetails.companyName"
                  value={formik.values.partyDetails.companyName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.partyDetails?.companyName &&
                    Boolean(formik.errors.partyDetails?.companyName)
                  }
                  helperText={
                    formik.touched.partyDetails?.companyName &&
                    formik.errors.partyDetails?.companyName
                  }
                  sx={{ mb: 2 }}
                  variant="outlined"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="GSTIN *"
                  name="partyDetails.gstNo"
                  value={formik.values.partyDetails.gstNo}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.partyDetails?.gstNo &&
                    Boolean(formik.errors.partyDetails?.gstNo)
                  }
                  helperText={
                    formik.touched.partyDetails?.gstNo &&
                    formik.errors.partyDetails?.gstNo
                  }
                  sx={{ mb: 2 }}
                  variant="outlined"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Mobile"
                  name="partyDetails.mobileNo"
                  value={formik.values.partyDetails.mobileNo}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.partyDetails?.mobileNo &&
                    Boolean(formik.errors.partyDetails?.mobileNo)
                  }
                  helperText={
                    formik.touched.partyDetails?.mobileNo &&
                    formik.errors.partyDetails?.mobileNo
                  }
                  sx={{ mb: 2 }}
                  variant="outlined"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Plot/House No"
                  name="partyDetails.plotHouseNo"
                  value={formik.values.partyDetails.plotHouseNo}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.partyDetails?.plotHouseNo &&
                    Boolean(formik.errors.partyDetails?.plotHouseNo)
                  }
                  helperText={
                    formik.touched.partyDetails?.plotHouseNo &&
                    formik.errors.partyDetails?.plotHouseNo
                  }
                  sx={{ mb: 2 }}
                  variant="outlined"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Line 1"
                  name="partyDetails.line1"
                  value={formik.values.partyDetails.line1}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.partyDetails?.line1 &&
                    Boolean(formik.errors.partyDetails?.line1)
                  }
                  helperText={
                    formik.touched.partyDetails?.line1 &&
                    formik.errors.partyDetails?.line1
                  }
                  sx={{ mb: 2 }}
                  variant="outlined"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Area"
                  name="partyDetails.area"
                  value={formik.values.partyDetails.area}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.partyDetails?.area &&
                    Boolean(formik.errors.partyDetails?.area)
                  }
                  helperText={
                    formik.touched.partyDetails?.area &&
                    formik.errors.partyDetails?.area
                  }
                  sx={{ mb: 2 }}
                  variant="outlined"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Landmark"
                  name="partyDetails.landmark"
                  value={formik.values.partyDetails.landmark}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.partyDetails?.landmark &&
                    Boolean(formik.errors.partyDetails?.landmark)
                  }
                  helperText={
                    formik.touched.partyDetails?.landmark &&
                    formik.errors.partyDetails?.landmark
                  }
                  sx={{ mb: 2 }}
                  variant="outlined"
                  size="small"
                />
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>State *</InputLabel>
                  <Select
                    name="partyDetails.state"
                    value={formik.values.partyDetails.state}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    label="State *"
                    size="small"
                    error={
                      formik.touched.partyDetails?.state &&
                      Boolean(formik.errors.partyDetails?.state)
                    }
                  >
                    {Object.keys(stateCities).map((state) => (
                      <MenuItem key={state} value={state}>
                        {state}
                      </MenuItem>
                    ))}
                  </Select>
                  {formik.touched.partyDetails?.state &&
                    formik.errors.partyDetails?.state && (
                      <Typography
                        variant="caption"
                        color="error"
                        sx={{ mt: 1 }}
                      >
                        {formik.errors.partyDetails.state}
                      </Typography>
                    )}
                </FormControl>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>City *</InputLabel>
                  <Select
                    name="partyDetails.city"
                    value={formik.values.partyDetails.city}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    label="City *"
                    size="small"
                    disabled={!formik.values.partyDetails.state}
                    error={
                      formik.touched.partyDetails?.city &&
                      Boolean(formik.errors.partyDetails?.city)
                    }
                  >
                    {(stateCities[formik.values.partyDetails.state] || []).map(
                      (city) => (
                        <MenuItem key={city} value={city}>
                          {city}
                        </MenuItem>
                      )
                    )}
                  </Select>
                  {formik.touched.partyDetails?.city &&
                    formik.errors.partyDetails?.city && (
                      <Typography
                        variant="caption"
                        color="error"
                        sx={{ mt: 1 }}
                      >
                        {formik.errors.partyDetails.city}
                      </Typography>
                    )}
                </FormControl>
                <TextField
                  fullWidth
                  label="Pincode"
                  name="partyDetails.pincode"
                  value={formik.values.partyDetails.pincode}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.partyDetails?.pincode &&
                    Boolean(formik.errors.partyDetails?.pincode)
                  }
                  helperText={
                    formik.touched.partyDetails?.pincode &&
                    formik.errors.partyDetails?.pincode
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
                  <InputLabel>Payment Method *</InputLabel>
                  <Select
                    name="paymentMethod"
                    value={formik.values.paymentMethod}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    label="Payment Method *"
                    size="small"
                    error={
                      formik.touched.paymentMethod &&
                      Boolean(formik.errors.paymentMethod)
                    }
                  >
                    <MenuItem value="cheque">Cheque</MenuItem>
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="upi">UPI</MenuItem>
                    <MenuItem value="netbanking">Net Banking</MenuItem>
                  </Select>
                  {formik.touched.paymentMethod &&
                    formik.errors.paymentMethod && (
                      <Typography
                        variant="caption"
                        color="error"
                        sx={{ mt: 1 }}
                      >
                        {formik.errors.paymentMethod}
                      </Typography>
                    )}
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={formik.values.status}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
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

        <Typography
          variant={isMobile ? "h6" : "h5"}
          gutterBottom
          sx={{
            color: "text.primary",
            textAlign: { xs: "center", sm: "left" },
            fontSize: { xs: "1.25rem", sm: "1.5rem", md: "1.75rem" },
          }}
        >
          Item Details
        </Typography>
        <TableContainer
          component={Paper}
          elevation={2}
          sx={{ mb: 4, borderRadius: 2, overflowX: "auto" }}
        >
          <Table sx={{ minWidth: { xs: 300, sm: 650 } }}>
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
              {formik.values.items && formik.values.items.length > 0 ? (
                formik.values.items.map((item, index) => (
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
                          fullWidth
                          size="small"
                          name={`items[${index}].name`}
                          value={item.name}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          error={
                            formik.touched.items &&
                            formik.touched.items[index]?.name &&
                            Boolean(
                              formik.errors.items &&
                                formik.errors.items[index]?.name
                            )
                          }
                          helperText={
                            formik.touched.items &&
                            formik.errors.items &&
                            formik.errors.items[index]?.name
                          }
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
                          fullWidth
                          size="small"
                          name={`items[${index}].hsn`}
                          value={item.hsn}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          error={
                            formik.touched.items &&
                            formik.touched.items[index]?.hsn &&
                            Boolean(
                              formik.errors.items &&
                                formik.errors.items[index]?.hsn
                            )
                          }
                          helperText={
                            formik.touched.items &&
                            formik.errors.items &&
                            formik.errors.items[index]?.hsn
                          }
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
                        item.hsn || "N/A"
                      )}
                    </TableCell>
                    <TableCell
                      sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
                    >
                      {isEditing ? (
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          name={`items[${index}].quantity`}
                          value={item.quantity}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          inputProps={{ min: 1 }}
                          error={
                            formik.touched.items &&
                            formik.touched.items[index]?.quantity &&
                            Boolean(
                              formik.errors.items &&
                                formik.errors.items[index]?.quantity
                            )
                          }
                          helperText={
                            formik.touched.items &&
                            formik.errors.items &&
                            formik.errors.items[index]?.quantity
                          }
                          sx={{
                            minWidth: { xs: 60, sm: 80 },
                            "& .MuiInputBase-root": {
                              fontSize: { xs: "0.9rem", sm: "1rem" },
                            },
                            "& .MuiFormHelperText-root": {
                              color: "error.main",
                            },
                          }}
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
                          fullWidth
                          size="small"
                          type="number"
                          name={`items[${index}].price`}
                          value={item.price}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          inputProps={{ min: 0, step: 0.01 }}
                          error={
                            formik.touched.items &&
                            formik.touched.items[index]?.price &&
                            Boolean(
                              formik.errors.items &&
                                formik.errors.items[index]?.price
                            )
                          }
                          helperText={
                            formik.touched.items &&
                            formik.errors.items &&
                            formik.errors.items[index]?.price
                          }
                          sx={{
                            minWidth: { xs: 80, sm: 100 },
                            "& .MuiInputBase-root": {
                              fontSize: { xs: "0.9rem", sm: "1rem" },
                            },
                            "& .MuiFormHelperText-root": {
                              color: "error.main",
                            },
                          }}
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
                  name="discount"
                  type="number"
                  value={formik.values.discount}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  inputProps={{ min: 0, max: 100, step: 0.01 }}
                  error={
                    formik.touched.discount && Boolean(formik.errors.discount)
                  }
                  helperText={formik.touched.discount && formik.errors.discount}
                  sx={{ mb: 2 }}
                  variant="outlined"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Notes"
                  name="notes"
                  value={formik.values.notes}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  multiline
                  rows={2}
                  error={formik.touched.notes && Boolean(formik.errors.notes)}
                  helperText={formik.touched.notes && formik.errors.notes}
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
            <Paper
              elevation={2}
              sx={{
                p: { xs: 2, sm: 3 },
                borderRadius: 2,
                backgroundColor: "#f5f5f5",
                mt: 2,
              }}
            >
              <Typography
                variant="subtitle1"
                gutterBottom
                sx={{
                  fontWeight: "bold",
                  fontSize: { xs: "1rem", sm: "1.125rem" },
                }}
              >
                Bank Details:
              </Typography>
              <>
                <Typography
                  sx={{ fontSize: { xs: "0.9rem", sm: "1rem" }, mb: 0.5 }}
                >
                  <strong>Bank Name:</strong>{" "}
                  {userProfile?.bankDetails?.bankName || "N/A"}
                </Typography>
                <Typography
                  sx={{ fontSize: { xs: "0.9rem", sm: "1rem" }, mb: 0.5 }}
                >
                  <strong>Account Name:</strong>{" "}
                  {userProfile?.bankDetails?.accountName || "N/A"}
                </Typography>
                <Typography
                  sx={{ fontSize: { xs: "0.9rem", sm: "1rem" }, mb: 0.5 }}
                >
                  <strong>Account Number:</strong>{" "}
                  {userProfile?.bankDetails?.accountNumber || "N/A"}
                </Typography>
                <Typography
                  sx={{ fontSize: { xs: "0.9rem", sm: "1rem" }, mb: 0.5 }}
                >
                  <strong>IFSC Code:</strong>{" "}
                  {userProfile?.bankDetails?.ifscCode || "N/A"}
                </Typography>
              </>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper
              elevation={2}
              sx={{
                p: { xs: 2, sm: 3 },
                borderRadius: 2,
                backgroundColor: "#f5f5f5",
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
                    Discount ({parseFloat(formik.values.discount) || 0}%):
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
                      name="gstRate"
                      value={formik.values.gstRate}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      label="GST Rate (%)"
                      size="small"
                      error={
                        formik.touched.gstRate && Boolean(formik.errors.gstRate)
                      }
                    >
                      <MenuItem value={0}>0% (Exempt)</MenuItem>
                      <MenuItem value={5}>5%</MenuItem>
                      <MenuItem value={12}>12%</MenuItem>
                      <MenuItem value={18}>18%</MenuItem>
                      <MenuItem value={28}>28%</MenuItem>
                    </Select>
                    {formik.touched.gstRate && formik.errors.gstRate && (
                      <Typography
                        variant="caption"
                        color="error"
                        sx={{ mt: 1 }}
                      >
                        {formik.errors.gstRate}
                      </Typography>
                    )}
                  </FormControl>
                </Box>
              ) : (
                <>
                  {cgst > 0 && (
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
                  )}
                  {sgst > 0 && (
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
                  )}
                  {igst > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Grid container justifyContent="space-between">
                        <Typography
                          sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
                        >
                          IGST ({bill.gstRate}%):
                        </Typography>
                        <Typography
                          sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
                        >
                          ₹{igst.toFixed(2)}
                        </Typography>
                      </Grid>
                    </Box>
                  )}
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
                  <Typography
                    variant="body1"
                    gutterBottom
                    sx={{ mt: 2, fontSize: { xs: "0.9rem", sm: "1rem" } }}
                  >
                    <strong>Amount in Words:</strong> {numberToWords(total)}
                  </Typography>
                </Grid>
              </Box>
            </Paper>
          </Grid>
        </Grid>

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
              label="Item Name *"
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
              label="Quantity *"
              value={newItem.quantity}
              onChange={(e) =>
                setNewItem((prev) => ({
                  ...prev,
                  quantity: e.target.value,
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
              label="Price (₹) *"
              value={newItem.price}
              onChange={(e) =>
                setNewItem((prev) => ({
                  ...prev,
                  price: e.target.value,
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
              Are you sure you want to delete this invoice? This action cannot
              be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setOpenDeleteDialog(false)}
              color="primary"
              size="medium"
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              color="error"
              variant="contained"
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
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            sx={{ width: "100%", fontSize: { xs: "0.9rem", sm: "1rem" } }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
};

export default ViewBill;
