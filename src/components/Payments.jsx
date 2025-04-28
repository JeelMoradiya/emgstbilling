import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  Container,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Box,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  useMediaQuery,
  useTheme,
  Snackbar,
  Alert,
  Autocomplete,
  Checkbox,
} from "@mui/material";
import {
  Search,
  Visibility,
  Edit,
  Delete,
  MoreVert,
  Close,
} from "@mui/icons-material";
import { format, parseISO } from "date-fns";
import logo from "../assets/logo.gif";

// Validation schema for payment form
const validationSchema = Yup.object({
  paymentMethod: Yup.string()
    .required("Payment method is required")
    .oneOf(["cheque", "cash", "upi", "netbanking"], "Invalid payment method"),
  chequeNo: Yup.string().when("paymentMethod", {
    is: "cheque",
    then: () =>
      Yup.string()
        .matches(/^[A-Za-z0-9]{6,12}$/, "Invalid cheque number (6-12 characters)")
        .required("Cheque number is required"),
    otherwise: () => Yup.string().notRequired(),
  }),
  bank: Yup.string().when("paymentMethod", {
    is: (val) => ["cheque", "netbanking"].includes(val),
    then: () =>
      Yup.string()
        .matches(/^[A-Za-z\s]{3,50}$/, "Invalid bank name (3-50 characters)")
        .required("Bank name is required"),
    otherwise: () => Yup.string().notRequired(),
  }),
  upiId: Yup.string().when("paymentMethod", {
    is: "upi",
    then: () =>
      Yup.string()
        .matches(/^[a-zA-Z0-9.-_]{2,256}@[a-zA-Z]{2,64}$/, "Invalid UPI ID")
        .required("UPI ID is required"),
    otherwise: () => Yup.string().notRequired(),
  }),
  upiName: Yup.string().when("paymentMethod", {
    is: "upi",
    then: () =>
      Yup.string()
        .matches(/^[A-Za-z\s]{3,50}$/, "Invalid name (3-50 characters)")
        .required("UPI name is required"),
    otherwise: () => Yup.string().notRequired(),
  }),
  rtgsNeft: Yup.string().when("paymentMethod", {
    is: "netbanking",
    then: () => Yup.string().required("Select RTGS or NEFT"),
    otherwise: () => Yup.string().notRequired(),
  }),
  amount: Yup.number()
    .typeError("Amount must be a number")
    .positive("Amount must be positive")
    .required("Amount is required"),
  taxableAmount: Yup.number()
    .typeError("Taxable Amount must be a number")
    .positive("Taxable Amount must be positive")
    .required("Taxable Amount is required"),
  tds: Yup.number()
    .typeError("TDS must be a number")
    .when("paymentMethod", {
      is: (val) => val !== "cash",
      then: () =>
        Yup.number()
          .min(0, "TDS cannot be negative")
          .max(100, "TDS cannot exceed 100%")
          .required("TDS percentage is required"),
      otherwise: () => Yup.number().notRequired(),
    }),
  otherClaimPercentage: Yup.number()
    .typeError("Other claim percentage must be a number")
    .min(0, "Other claim percentage cannot be negative")
    .max(100, "Other claim percentage cannot exceed 100%")
    .notRequired(),
  otherClaim: Yup.number()
    .typeError("Other claim amount must be a number")
    .min(0, "Other claim amount cannot be negative")
    .notRequired(),
  brokerName: Yup.string()
    .matches(/^[A-Za-z\s]{0,50}$/, "Invalid broker name (0-50 characters)")
    .notRequired(),
  brokerPhone: Yup.string()
    .matches(/^[0-9]{0,10}$/, "Invalid phone number (up to 10 digits)")
    .notRequired(),
  brokeragePercentage: Yup.number()
    .typeError("Brokerage percentage must be a number")
    .min(0, "Brokerage percentage cannot be negative")
    .max(100, "Brokerage percentage cannot exceed 100%")
    .notRequired(),
});

const Payments = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // State declarations
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState("add");
  const [selectedBill, setSelectedBill] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [billToDelete, setBillToDelete] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedBillId, setSelectedBillId] = useState(null);
  const [summary, setSummary] = useState({
    total: 0,
    totalTDS: 0,
    totalOtherClaim: 0,
    totalBrokerage: 0,
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [selectedBills, setSelectedBills] = useState([]);

  // Formik setup
  const formik = useFormik({
    initialValues: {
      paymentMethod: "",
      chequeNo: "",
      bank: "",
      upiId: "",
      upiName: "",
      rtgsNeft: "",
      amount: "",
      taxableAmount: "",
      tds: "",
      otherClaim: "",
      otherClaimPercentage: "",
      brokerName: "",
      brokerPhone: "",
      brokeragePercentage: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        const billRef = doc(db, "bills", selectedBill.id);
        const tdsAmount =
          values.paymentMethod === "cash"
            ? 0
            : (Number(values.taxableAmount) * Number(values.tds)) / 100;
        const otherClaimAmount = Number(values.otherClaim) || 0;
        const brokerageAmount =
          (Number(values.taxableAmount) * Number(values.brokeragePercentage)) /
            100 || 0;

        const paymentData = {
          method: values.paymentMethod,
          status: "paid",
          date: new Date().toISOString(),
          amount: Number(values.amount),
          taxableAmount: Number(values.taxableAmount),
          tds: values.paymentMethod === "cash" ? 0 : Number(values.tds),
          tdsAmount,
          otherClaim: otherClaimAmount,
          otherClaimPercentage: Number(values.otherClaimPercentage) || 0,
          brokerName: values.brokerName || "",
          brokerPhone: values.brokerPhone || "",
          brokeragePercentage: Number(values.brokeragePercentage) || 0,
          brokerageAmount,
          ...(values.paymentMethod === "cheque" && {
            chequeNo: values.chequeNo,
            bank: values.bank,
          }),
          ...(values.paymentMethod === "upi" && {
            upiId: values.upiId,
            upiName: values.upiName,
            bank: values.bank || "",
          }),
          ...(values.paymentMethod === "netbanking" && {
            rtgsNeft: values.rtgsNeft,
            bank: values.bank,
          }),
        };

        await updateDoc(billRef, {
          paymentDetails: paymentData,
          status: "paid",
        });

        setBills((prev) =>
          prev.map((bill) =>
            bill.id === selectedBill.id
              ? { ...bill, paymentDetails: paymentData, status: "paid" }
              : bill
          )
        );
        setFilteredBills((prev) =>
          prev.map((bill) =>
            bill.id === selectedBill.id
              ? { ...bill, paymentDetails: paymentData, status: "paid" }
              : bill
          )
        );

        setSummary((prev) => ({
          ...prev,
          total:
            dialogMode === "edit"
              ? prev.total
              : prev.total + Number(values.amount),
          totalTDS:
            dialogMode === "edit"
              ? prev.totalTDS +
                tdsAmount -
                (Number(selectedBill.paymentDetails?.tdsAmount) || 0)
              : prev.totalTDS + tdsAmount,
          totalOtherClaim:
            dialogMode === "edit"
              ? prev.totalOtherClaim +
                otherClaimAmount -
                (Number(selectedBill.paymentDetails?.otherClaim) || 0)
              : prev.totalOtherClaim + otherClaimAmount,
          totalBrokerage:
            dialogMode === "edit"
              ? prev.totalBrokerage +
                brokerageAmount -
                (Number(selectedBill.paymentDetails?.brokerageAmount) || 0)
              : prev.totalBrokerage + brokerageAmount,
        }));

        setSnackbar({
          open: true,
          message:
            dialogMode === "edit"
              ? "Payment updated successfully"
              : "Payment recorded successfully",
          severity: "success",
        });
        setOpenDialog(false);
        formik.resetForm();
        setDialogMode("add");
        setSelectedBill(null);
      } catch (error) {
        console.error("Error recording payment: ", error);
        setSnackbar({
          open: true,
          message: "Failed to record payment: " + error.message,
          severity: "error",
        });
      }
    },
  });

  // Fetch parties on component mount
  useEffect(() => {
    if (!currentUser) {
      setError("Please log in to view bills");
      setLoading(false);
      return;
    }

    const fetchParties = async () => {
      try {
        const partyQuery = query(
          collection(db, "parties"),
          where("createdBy", "==", currentUser.uid)
        );
        const partySnapshot = await getDocs(partyQuery);
        const partiesData = partySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // console.log("Fetched Parties:", partiesData); // Debug log
        setParties(partiesData);
      } catch (error) {
        console.error("Error fetching parties: ", error);
        setError("Failed to fetch parties: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchParties();
  }, [currentUser]);

  // Handle search for bills by selected party
  const handleSearch = async () => {
    // console.log("Selected Party:", selectedParty); // Debug log
    if (!selectedParty || !selectedParty.id) {
      setSnackbar({
        open: true,
        message: "Please select a valid party",
        severity: "error",
      });
      return;
    }

    setLoading(true);
    try {
      const billsQuery = query(
        collection(db, "bills"),
        where("partyId", "==", selectedParty.id),
        where("createdBy", "==", currentUser.uid)
      );
      const billsSnapshot = await getDocs(billsQuery);
      const billsData = billsSnapshot.docs.map((doc) => ({
        id: doc.id,
        billNo: doc.data().billNo || "N/A",
        date: doc.data().date || new Date().toISOString(),
        totalAmount: Number(doc.data().total) || 0,
        taxableAmount: Number(doc.data().taxableAmount) || 0,
        status: doc.data().status || "pending",
        paymentDetails: doc.data().paymentDetails || null,
      }));

      const sortedBills = billsData.sort((a, b) =>
        String(a.billNo || "").localeCompare(String(b.billNo || ""))
      );

      setBills(sortedBills);
      setFilteredBills(sortedBills);

      const total = sortedBills.reduce(
        (sum, bill) => sum + (Number(bill.totalAmount) || 0),
        0
      );
      const totalTDS = sortedBills.reduce(
        (sum, bill) => sum + (Number(bill.paymentDetails?.tdsAmount) || 0),
        0
      );
      const totalOtherClaim = sortedBills.reduce(
        (sum, bill) => sum + (Number(bill.paymentDetails?.otherClaim) || 0),
        0
      );
      const totalBrokerage = sortedBills.reduce(
        (sum, bill) => sum + (Number(bill.paymentDetails?.brokerageAmount) || 0),
        0
      );

      setSummary({
        total,
        totalTDS,
        totalOtherClaim,
        totalBrokerage,
      });
    } catch (error) {
      console.error("Error fetching bills: ", error);
      setError(
        error.code === "invalid-argument"
          ? "Invalid query parameters. Please check your selection."
          : "Failed to fetch bills: " + error.message
      );
    } finally {
      setLoading(false);
    }
  };

  // Open payment dialog
  const handleOpenDialog = (bill, mode = "add") => {
    setSelectedBill(bill);
    setDialogMode(mode);
    setOpenDialog(true);
    if (mode === "edit" || mode === "view") {
      formik.setValues({
        paymentMethod: bill.paymentDetails?.method || "",
        chequeNo: bill.paymentDetails?.chequeNo || "",
        bank: bill.paymentDetails?.bank || "",
        upiId: bill.paymentDetails?.upiId || "",
        upiName: bill.paymentDetails?.upiName || "",
        rtgsNeft: bill.paymentDetails?.rtgsNeft || "",
        amount: Number(bill.totalAmount).toFixed(2),
        taxableAmount: Number(bill.taxableAmount).toFixed(2),
        tds: Number(bill.paymentDetails?.tds || 0).toString(),
        otherClaim: Number(bill.paymentDetails?.otherClaim || 0).toString(),
        otherClaimPercentage: Number(
          bill.paymentDetails?.otherClaimPercentage || 0
        ).toString(),
        brokerName: bill.paymentDetails?.brokerName || "",
        brokerPhone: bill.paymentDetails?.brokerPhone || "",
        brokeragePercentage: Number(
          bill.paymentDetails?.brokeragePercentage || 0
        ).toString(),
      });
    } else {
      formik.resetForm();
      formik.setFieldValue("amount", Number(bill.totalAmount).toFixed(2));
      formik.setFieldValue(
        "taxableAmount",
        Number(bill.taxableAmount).toFixed(2)
      );
    }
  };

  // Close payment dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedBill(null);
    setDialogMode("add");
    formik.resetForm();
  };

  // Initiate delete payment
  const handleDelete = (billId) => {
    setBillToDelete(billId);
    setOpenDeleteDialog(true);
  };

  // Confirm delete payment
  const confirmDelete = async () => {
    try {
      const billRef = doc(db, "bills", billToDelete);
      const bill = bills.find((b) => b.id === billToDelete);
      const amount = Number(bill.totalAmount) || 0;
      const tdsAmount = Number(bill.paymentDetails?.tdsAmount) || 0;
      const otherClaim = Number(bill.paymentDetails?.otherClaim) || 0;
      const brokerageAmount = Number(bill.paymentDetails?.brokerageAmount) || 0;

      await updateDoc(billRef, {
        paymentDetails: null,
        status: "pending",
      });

      setBills((prev) =>
        prev.map((bill) =>
          bill.id === billToDelete
            ? { ...bill, paymentDetails: null, status: "pending" }
            : bill
        )
      );
      setFilteredBills((prev) =>
        prev.map((bill) =>
          bill.id === billToDelete
            ? { ...bill, paymentDetails: null, status: "pending" }
            : bill
        )
      );

      setSummary((prev) => ({
        ...prev,
        total: prev.total - amount,
        totalTDS: prev.totalTDS - tdsAmount,
        totalOtherClaim: prev.totalOtherClaim - otherClaim,
        totalBrokerage: prev.totalBrokerage - brokerageAmount,
      }));

      setSnackbar({
        open: true,
        message: "Payment deleted successfully",
        severity: "success",
      });
      setOpenDeleteDialog(false);
      setBillToDelete(null);
    } catch (error) {
      console.error("Error deleting payment: ", error);
      setSnackbar({
        open: true,
        message: "Failed to delete payment: " + error.message,
        severity: "error",
      });
    }
  };

  // Open action menu
  const handleMenuOpen = (event, billId) => {
    setAnchorEl(event.currentTarget);
    setSelectedBillId(billId);
  };

  // Close action menu
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedBillId(null);
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Select bill for bulk action
  const handleSelectBill = (billId) => {
    setSelectedBills((prev) =>
      prev.includes(billId)
        ? prev.filter((id) => id !== billId)
        : [...prev, billId]
    );
  };

  // Placeholder for bulk payment
  const handleBulkPayment = () => {
    if (selectedBills.length === 0) {
      setSnackbar({
        open: true,
        message: "Please select at least one bill",
        severity: "error",
      });
      return;
    }
    setSnackbar({
      open: true,
      message: "Bulk payment feature coming soon!",
      severity: "info",
    });
  };

  // Handle view bill
  const handleViewBill = (billId) => {
    navigate(`/bill/${billId}`);
  };

  // Render loading state
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
        <img src={logo} alt="Logo" style={{ width: "100px", height: "100px" }} />
      </Container>
    );
  }

  // Render error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, px: { xs: 1, sm: 2 } }}>
        <Paper
          elevation={3}
          sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 2, width: "100%" }}
        >
          <Typography
            variant="h6"
            color="error"
            sx={{ fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" } }}
          >
            {error}
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, px: { xs: 1, sm: 2 } }}>
      <Paper
        elevation={3}
        sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 2, width: "100%" }}
      >
        <Typography
          variant={isMobile ? "h5" : "h4"}
          sx={{
            fontWeight: "bold",
            color: "primary.main",
            fontSize: { xs: "1rem", sm: "1.5rem", md: "1.75rem" },
            mb: 3,
          }}
        >
          Payments
        </Typography>

        {/* Party Selection and Search */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "flex-start",
            alignItems: { xs: "stretch", sm: "center" },
            mb: 3,
            gap: { xs: 2, sm: 2 },
          }}
        >
          <Autocomplete
            id="party"
            options={parties}
            getOptionLabel={(option) => option.companyName || ""}
            value={selectedParty}
            onChange={(event, newValue) => setSelectedParty(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Party"
                size="small"
                sx={{
                  minWidth: { xs: "100%", sm: 250 },
                  "& .MuiInputBase-root": {
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  },
                }}
              />
            )}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleSearch}
            size="small"
            disabled={!selectedParty || loading}
            sx={{
              width: { xs: "100%", sm: "auto" },
              height: { xs: "40px", sm: "40px" },
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : <Search />}
          </Button>
        </Box>

        {/* Summary and Bills Table */}
        {filteredBills.length > 0 && (
          <>
            {/* Summary Cards */}
            <Grid
              container
              spacing={{ xs: 1, sm: 2 }}
              sx={{ mb: { xs: 3, sm: 4 } }}
            >
              <Grid item xs={12} sm={3}>
                <Box
                  sx={{
                    p: { xs: 1.5, sm: 2 },
                    borderRadius: 2,
                    bgcolor: "primary.light",
                    textAlign: "center",
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.primary"
                    sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                  >
                    <strong>Total TDS & Other Claim</strong>
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" },
                    }}
                  >
                    <strong>
                      ₹{(summary.totalTDS + summary.totalOtherClaim).toFixed(2)}
                    </strong>
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.primary"
                    sx={{
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      mt: 1,
                    }}
                  >
                    <strong>
                      {(
                        ((summary.totalTDS + summary.totalOtherClaim) /
                          summary.total) *
                          100 || 0
                      ).toFixed(2)}
                      %
                    </strong>
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box
                  sx={{
                    p: { xs: 1.5, sm: 2 },
                    borderRadius: 2,
                    bgcolor: "#e6f3ff",
                    textAlign: "center",
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                  >
                    <strong>Total TDS</strong>
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" },
                    }}
                  >
                    <strong>₹{summary.totalTDS.toFixed(2)}</strong>
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      mt: 1,
                    }}
                  >
                    <strong>
                      {((summary.totalTDS / summary.total) * 100 || 0).toFixed(2)}
                      %
                    </strong>
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box
                  sx={{
                    p: { xs: 1.5, sm: 2 },
                    borderRadius: 2,
                    bgcolor: "#fff3e0",
                    textAlign: "center",
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                  >
                    <strong>Total Other Claim</strong>
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" },
                    }}
                  >
                    <strong>₹{summary.totalOtherClaim.toFixed(2)}</strong>
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      mt: 1,
                    }}
                  >
                    <strong>
                      {((summary.totalOtherClaim / summary.total) * 100 || 0).toFixed(
                        2
                      )}
                      %
                    </strong>
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box
                  sx={{
                    p: { xs: 1.5, sm: 2 },
                    borderRadius: 2,
                    bgcolor: "#e8f5e9",
                    textAlign: "center",
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                  >
                    <strong>Total Brokerage Amount</strong>
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" },
                    }}
                  >
                    <strong>₹{summary.totalBrokerage.toFixed(2)}</strong>
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      mt: 1,
                    }}
                  >
                    <strong>
                      {((summary.totalBrokerage / summary.total) * 100 || 0).toFixed(
                        2
                      )}
                      %
                    </strong>
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Bulk Payment Button */}
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleBulkPayment}
                disabled={selectedBills.length === 0}
                size="small"
                sx={{
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                }}
              >
                Process Selected Payments
              </Button>
            </Box>

            {/* Bills Table */}
            <TableContainer
              component={Paper}
              elevation={2}
              sx={{ borderRadius: 2, maxWidth: "100%", overflowX: "auto" }}
            >
              <Table sx={{ minWidth: { xs: 300, sm: 650 } }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "primary.light" }}>
                    <TableCell>
                      <Checkbox
                        checked={
                          selectedBills.length === filteredBills.length &&
                          filteredBills.length > 0
                        }
                        onChange={() =>
                          setSelectedBills(
                            selectedBills.length === filteredBills.length
                              ? []
                              : filteredBills.map((bill) => bill.id)
                          )
                        }
                      />
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      }}
                    >
                      Bill No
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      }}
                    >
                      Date
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      }}
                    >
                      Amount
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                        textAlign: "center",
                      }}
                      colSpan={2}
                    >
                      TDS
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                        textAlign: "center",
                      }}
                      colSpan={2}
                    >
                      Other Claim
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      }}
                    >
                      Status
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      }}
                    >
                      Brokerage Amount
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      }}
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ backgroundColor: "primary.light" }}>
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                        textAlign: "center",
                      }}
                    >
                      %
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                        textAlign: "center",
                      }}
                    >
                      Amount
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                        textAlign: "center",
                      }}
                    >
                      %
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                        textAlign: "center",
                      }}
                    >
                      Amount
                    </TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredBills.length > 0 ? (
                    filteredBills.map((bill) => (
                      <TableRow key={bill.id} hover>
                        <TableCell>
                          <Checkbox
                            checked={selectedBills.includes(bill.id)}
                            onChange={() => handleSelectBill(bill.id)}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          }}
                        >
                          {bill.billNo}
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          }}
                        >
                          {format(parseISO(bill.date), "dd-MM-yyyy")}
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          }}
                        >
                          ₹{bill.totalAmount.toFixed(2)}
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            textAlign: "center",
                          }}
                        >
                          {bill.paymentDetails?.tds
                            ? `${bill.paymentDetails.tds}%`
                            : "-"}
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            textAlign: "center",
                          }}
                        >
                          {bill.paymentDetails?.tdsAmount
                            ? `₹${bill.paymentDetails.tdsAmount.toFixed(2)}`
                            : "-"}
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            textAlign: "center",
                          }}
                        >
                          {bill.paymentDetails?.otherClaimPercentage
                            ? `${bill.paymentDetails.otherClaimPercentage}%`
                            : "-"}
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            textAlign: "center",
                          }}
                        >
                          {bill.paymentDetails?.otherClaim
                            ? `₹${bill.paymentDetails.otherClaim.toFixed(2)}`
                            : "-"}
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          }}
                        >
                          <Chip
                            label={bill.status}
                            color={bill.status === "paid" ? "success" : "warning"}
                            size="small"
                            sx={{
                              fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            }}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          }}
                        >
                          {bill.paymentDetails?.brokerageAmount
                            ? `₹${bill.paymentDetails.brokerageAmount.toFixed(2)}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            onClick={(e) => handleMenuOpen(e, bill.id)}
                            size="small"
                          >
                            <MoreVert />
                          </IconButton>
                          <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl) && selectedBillId === bill.id}
                            onClose={handleMenuClose}
                          >
                            <MenuItem
                              onClick={() => {
                                handleViewBill(bill.id);
                                handleMenuClose();
                              }}
                              sx={{
                                fontSize: { xs: "0.85rem", sm: "0.95rem" },
                              }}
                            >
                              <Visibility sx={{ mr: 1 }} /> View
                            </MenuItem>
                            {bill.status !== "paid" && (
                              <MenuItem
                                onClick={() => {
                                  handleOpenDialog(bill, "add");
                                  handleMenuClose();
                                }}
                                sx={{
                                  fontSize: { xs: "0.85rem", sm: "0.95rem" },
                                }}
                              >
                                <Edit sx={{ mr: 1 }} /> Record Payment
                              </MenuItem>
                            )}
                            {bill.status === "paid" && (
                              <MenuItem
                                onClick={() => {
                                  handleOpenDialog(bill, "edit");
                                  handleMenuClose();
                                }}
                                sx={{
                                  fontSize: { xs: "0.85rem", sm: "0.95rem" },
                                }}
                              >
                                <Edit sx={{ mr: 1 }} /> Edit Payment
                              </MenuItem>
                            )}
                            {bill.status === "paid" && (
                              <MenuItem
                                onClick={() => {
                                  handleDelete(bill.id);
                                  handleMenuClose();
                                }}
                                sx={{
                                  fontSize: { xs: "0.85rem", sm: "0.95rem" },
                                }}
                              >
                                <Delete sx={{ mr: 1 }} /> Delete Payment
                              </MenuItem>
                            )}
                          </Menu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={11} align="center">
                        <Typography
                          variant="body1"
                          sx={{
                            py: 3,
                            color: "text.secondary",
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          }}
                        >
                          No bills found for the selected party
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {/* Payment Dialog */}
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
              fontSize: { xs: "1rem", sm: "1.25rem" },
            }}
          >
            {dialogMode === "view"
              ? "View Payment Details"
              : dialogMode === "edit"
              ? "Edit Payment"
              : "Record Payment"}
          </DialogTitle>
          <DialogContent sx={{ mt: 2, px: { xs: 2, sm: 3 } }}>
            <form onSubmit={formik.handleSubmit}>
              <Grid container spacing={{ xs: 2, sm: 3 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    id="amount"
                    name="amount"
                    label="Amount"
                    type="number"
                    value={formik.values.amount}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.amount && Boolean(formik.errors.amount)}
                    helperText={formik.touched.amount && formik.errors.amount}
                    variant="outlined"
                    size="small"
                    InputProps={{
                      readOnly: dialogMode === "view",
                    }}
                    sx={{
                      "& .MuiInputBase-root": {
                        fontSize: { xs: "0.85rem", sm: "0.9rem" },
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    id="taxableAmount"
                    name="taxableAmount"
                    label="Taxable Amount"
                    type="number"
                    value={formik.values.taxableAmount}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.taxableAmount &&
                      Boolean(formik.errors.taxableAmount)
                    }
                    helperText={
                      formik.touched.taxableAmount && formik.errors.taxableAmount
                    }
                    variant="outlined"
                    size="small"
                    InputProps={{
                      readOnly: dialogMode === "view",
                    }}
                    sx={{
                      "& .MuiInputBase-root": {
                        fontSize: { xs: "0.85rem", sm: "0.9rem" },
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl
                    fullWidth
                    size="small"
                    error={
                      formik.touched.paymentMethod &&
                      Boolean(formik.errors.paymentMethod)
                    }
                  >
                    <InputLabel
                      id="paymentMethod-label"
                      sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                    >
                      Payment Method
                    </InputLabel>
                    <Select
                      labelId="paymentMethod-label"
                      id="paymentMethod"
                      name="paymentMethod"
                      value={formik.values.paymentMethod}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      label="Payment Method"
                      disabled={dialogMode === "view"}
                      sx={{
                        "& .MuiInputBase-root": {
                          fontSize: { xs: "0.85rem", sm: "0.9rem" },
                        },
                      }}
                    >
                      <MenuItem value="cheque">Cheque</MenuItem>
                      <MenuItem value="cash">Cash</MenuItem>
                      <MenuItem value="upi">UPI</MenuItem>
                      <MenuItem value="netbanking">Net Banking</MenuItem>
                    </Select>
                    {formik.touched.paymentMethod &&
                      formik.errors.paymentMethod && (
                        <Typography
                          color="error"
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            mt: 0.5,
                          }}
                        >
                          {formik.errors.paymentMethod}
                        </Typography>
                      )}
                  </FormControl>
                </Grid>

                {/* Cheque Fields */}
                {formik.values.paymentMethod === "cheque" && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        id="chequeNo"
                        name="chequeNo"
                        label="Cheque Number"
                        value={formik.values.chequeNo}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={
                          formik.touched.chequeNo &&
                          Boolean(formik.errors.chequeNo)
                        }
                        helperText={
                          formik.touched.chequeNo && formik.errors.chequeNo
                        }
                        variant="outlined"
                        size="small"
                        InputProps={{
                          readOnly: dialogMode === "view",
                        }}
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.85rem", sm: "0.9rem" },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        id="bank"
                        name="bank"
                        label="Bank Name"
                        value={formik.values.bank}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.bank && Boolean(formik.errors.bank)}
                        helperText={formik.touched.bank && formik.errors.bank}
                        variant="outlined"
                        size="small"
                        InputProps={{
                          readOnly: dialogMode === "view",
                        }}
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.85rem", sm: "0.9rem" },
                          },
                        }}
                      />
                    </Grid>
                  </>
                )}

                {/* UPI Fields */}
                {formik.values.paymentMethod === "upi" && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        id="upiId"
                        name="upiId"
                        label="UPI ID"
                        value={formik.values.upiId}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.upiId && Boolean(formik.errors.upiId)}
                        helperText={formik.touched.upiId && formik.errors.upiId}
                        variant="outlined"
                        size="small"
                        InputProps={{
                          readOnly: dialogMode === "view",
                        }}
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.85rem", sm: "0.9rem" },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        id="upiName"
                        name="upiName"
                        label="UPI Name"
                        value={formik.values.upiName}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={
                          formik.touched.upiName && Boolean(formik.errors.upiName)
                        }
                        helperText={
                          formik.touched.upiName && formik.errors.upiName
                        }
                        variant="outlined"
                        size="small"
                        InputProps={{
                          readOnly: dialogMode === "view",
                        }}
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.85rem", sm: "0.9rem" },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        id="bank"
                        name="bank"
                        label="Bank Name (Optional)"
                        value={formik.values.bank}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        variant="outlined"
                        size="small"
                        InputProps={{
                          readOnly: dialogMode === "view",
                        }}
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.85rem", sm: "0.9rem" },
                          },
                        }}
                      />
                    </Grid>
                  </>
                )}

                {/* Net Banking Fields */}
                {formik.values.paymentMethod === "netbanking" && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <FormControl
                        fullWidth
                        size="small"
                        error={
                          formik.touched.rtgsNeft &&
                          Boolean(formik.errors.rtgsNeft)
                        }
                      >
                        <InputLabel
                          id="rtgsNeft-label"
                          sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                        >
                          RTGS/NEFT
                        </InputLabel>
                        <Select
                          labelId="rtgsNeft-label"
                          id="rtgsNeft"
                          name="rtgsNeft"
                          value={formik.values.rtgsNeft}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          label="RTGS/NEFT"
                          disabled={dialogMode === "view"}
                          sx={{
                            "& .MuiInputBase-root": {
                              fontSize: { xs: "0.85rem", sm: "0.9rem" },
                            },
                          }}
                        >
                          <MenuItem value="RTGS">RTGS</MenuItem>
                          <MenuItem value="NEFT">NEFT</MenuItem>
                        </Select>
                        {formik.touched.rtgsNeft && formik.errors.rtgsNeft && (
                          <Typography
                            color="error"
                            sx={{
                              fontSize: { xs: "0.75rem", sm: "0.875rem" },
                              mt: 0.5,
                            }}
                          >
                            {formik.errors.rtgsNeft}
                          </Typography>
                        )}
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        id="bank"
                        name="bank"
                        label="Bank Name"
                        value={formik.values.bank}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.bank && Boolean(formik.errors.bank)}
                        helperText={formik.touched.bank && formik.errors.bank}
                        variant="outlined"
                        size="small"
                        InputProps={{
                          readOnly: dialogMode === "view",
                        }}
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.85rem", sm: "0.9rem" },
                          },
                        }}
                      />
                    </Grid>
                  </>
                )}

                {/* Additional Details */}
                <Grid item xs={12}>
                  <Typography
                    variant="h6"
                    sx={{
                      mt: 3,
                      mb: 2,
                      fontSize: { xs: "1rem", sm: "1.25rem" },
                    }}
                  >
                    Additional Details
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    id="tds"
                    name="tds"
                    label="TDS (%)"
                    type="number"
                    value={formik.values.tds}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.tds && Boolean(formik.errors.tds)}
                    helperText={formik.touched.tds && formik.errors.tds}
                    variant="outlined"
                    size="small"
                    InputProps={{
                      readOnly:
                        dialogMode === "view" ||
                        formik.values.paymentMethod === "cash",
                    }}
                    sx={{
                      "& .MuiInputBase-root": {
                        fontSize: { xs: "0.85rem", sm: "0.9rem" },
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    id="otherClaimPercentage"
                    name="otherClaimPercentage"
                    label="Other Claim (%)"
                    type="number"
                    value={formik.values.otherClaimPercentage}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.otherClaimPercentage &&
                      Boolean(formik.errors.otherClaimPercentage)
                    }
                    helperText={
                      formik.touched.otherClaimPercentage &&
                      formik.errors.otherClaimPercentage
                    }
                    variant="outlined"
                    size="small"
                    InputProps={{
                      readOnly: dialogMode === "view",
                    }}
                    sx={{
                      "& .MuiInputBase-root": {
                        fontSize: { xs: "0.85rem", sm: "0.9rem" },
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    id="otherClaim"
                    name="otherClaim"
                    label="Other Claim Amount"
                    type="number"
                    value={formik.values.otherClaim}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.otherClaim &&
                      Boolean(formik.errors.otherClaim)
                    }
                    helperText={
                      formik.touched.otherClaim && formik.errors.otherClaim
                    }
                    variant="outlined"
                    size="small"
                    InputProps={{
                      readOnly: dialogMode === "view",
                    }}
                    sx={{
                      "& .MuiInputBase-root": {
                        fontSize: { xs: "0.85rem", sm: "0.9rem" },
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    id="brokeragePercentage"
                    name="brokeragePercentage"
                    label="Brokerage (%)"
                    type="number"
                    value={formik.values.brokeragePercentage}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.brokeragePercentage &&
                      Boolean(formik.errors.brokeragePercentage)
                    }
                    helperText={
                      formik.touched.brokeragePercentage &&
                      formik.errors.brokeragePercentage
                    }
                    variant="outlined"
                    size="small"
                    InputProps={{
                      readOnly: dialogMode === "view",
                    }}
                    sx={{
                      "& .MuiInputBase-root": {
                        fontSize: { xs: "0.85rem", sm: "0.9rem" },
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    id="brokerName"
                    name="brokerName"
                    label="Broker Name"
                    value={formik.values.brokerName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.brokerName && Boolean(formik.errors.brokerName)
                    }
                    helperText={
                      formik.touched.brokerName && formik.errors.brokerName
                    }
                    variant="outlined"
                    size="small"
                    InputProps={{
                      readOnly: dialogMode === "view",
                    }}
                    sx={{
                      "& .MuiInputBase-root": {
                        fontSize: { xs: "0.85rem", sm: "0.9rem" },
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    id="brokerPhone"
                    name="brokerPhone"
                    label="Broker Phone"
                    value={formik.values.brokerPhone}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.brokerPhone &&
                      Boolean(formik.errors.brokerPhone)
                    }
                    helperText={
                      formik.touched.brokerPhone && formik.errors.brokerPhone
                    }
                    variant="outlined"
                    size="small"
                    InputProps={{
                      readOnly: dialogMode === "view",
                    }}
                    sx={{
                      "& .MuiInputBase-root": {
                        fontSize: { xs: "0.85rem", sm: "0.9rem" },
                      },
                    }}
                  />
                </Grid>
              </Grid>
            </form>
          </DialogContent>
          <DialogActions sx={{ p: { xs: 1, sm: 2 } }}>
            {dialogMode !== "view" && (
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="small"
                onClick={formik.handleSubmit}
                disabled={formik.isSubmitting}
                startIcon={formik.isSubmitting ? <CircularProgress size={20} /> : null}
                sx={{
                  minWidth: { xs: "100%", sm: "160px" },
                  fontSize: { xs: "0.85rem", sm: "0.9rem" },
                  textTransform: "none",
                }}
              >
                {formik.isSubmitting
                  ? "Processing..."
                  : dialogMode === "edit"
                  ? "Update Payment"
                  : "Record Payment"}
              </Button>
            )}
            <Button
              onClick={handleCloseDialog}
              variant="outlined"
              color="primary"
              size="small"
              startIcon={<Close />}
              sx={{
                minWidth: { xs: "100%", sm: "160px" },
                fontSize: { xs: "0.85rem", sm: "0.9rem" },
                textTransform: "none",
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={openDeleteDialog}
          onClose={() => setOpenDeleteDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle
            sx={{
              bgcolor: "error.main",
              color: "white",
              py: 2,
              fontSize: { xs: "1rem", sm: "1.25rem" },
            }}
          >
            Confirm Delete
          </DialogTitle>
          <DialogContent sx={{ mt: 2, px: { xs: 2, sm: 3 } }}>
            <Typography
              variant="body1"
              sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
            >
              Are you sure you want to delete this payment? This action cannot be
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
                minWidth: { xs: "100%", sm: "160px" },
                fontSize: { xs: "0.85rem", sm: "0.9rem" },
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
              sx={{
                minWidth: { xs: "100%", sm: "160px" },
                fontSize: { xs: "0.85rem", sm: "0.9rem" },
                textTransform: "none",
              }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for Notifications */}
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
      </Paper>
    </Container>
  );
};

export default Payments;