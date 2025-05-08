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
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
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
  TablePagination,
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
  Divider,
  styled,
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
import logo from "../../assets/logo.gif";

const paymentMethods = ["cheque", "upi", "netbanking", "cash"];

// Styled components for professional look
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: theme.shadows[5],
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(2),
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  textTransform: "none",
  fontWeight: 600,
  width: { xs: "100%", sm: "auto" },
  height: { xs: "40px", sm: "40px" },
  padding: theme.spacing(1, 3),
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: theme.shadows[3],
  },
  transition: "all 0.2s ease",
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(1, 2),
  },
}));

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontWeight: 500,
  fontSize: "0.875rem",
  [theme.breakpoints.down("sm")]: {
    fontSize: "0.75rem",
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
  transition: "background-color 0.2s ease",
}));

// Validation schema (unchanged)
const validationSchema = Yup.object({
  paymentMethod: Yup.string()
    .required("Payment method is required")
    .oneOf(["cheque", "cash", "upi", "netbanking"], "Invalid payment method"),
  chequeNo: Yup.string().when("paymentMethod", {
    is: "cheque",
    then: () =>
      Yup.string()
        .matches(
          /^[A-Za-z0-9]{6,12}$/,
          "Invalid cheque number (6-12 characters)"
        )
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
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
  const [processingPayments, setProcessingPayments] = useState(false);
  const [bulkProcessingIndex, setBulkProcessingIndex] = useState(0);

  // Calculate totals for selected bills
  const selectedBillsTotal = selectedBills.reduce((acc, billId) => {
    const bill = bills.find((b) => b.id === billId);
    return bill && bill.status !== "paid"
      ? {
          amount: acc.amount + Number(bill.totalAmount || 0),
          taxableAmount: acc.taxableAmount + Number(bill.taxableAmount || 0),
        }
      : acc;
  }, { amount: 0, taxableAmount: 0 });

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

        // Handle bulk processing
        if (processingPayments && bulkProcessingIndex < selectedBills.length - 1) {
          const nextIndex = bulkProcessingIndex + 1;
          setBulkProcessingIndex(nextIndex);
          const nextBill = bills.find((b) => b.id === selectedBills[nextIndex]);
          setSelectedBill(nextBill);
          formik.setValues({
            paymentMethod: "",
            chequeNo: "",
            bank: "",
            upiId: "",
            upiName: "",
            rtgsNeft: "",
            amount: Number(nextBill.totalAmount).toFixed(2),
            taxableAmount: Number(nextBill.taxableAmount).toFixed(2),
            tds: "",
            otherClaim: "",
            otherClaimPercentage: "",
            brokerName: "",
            brokerPhone: "",
            brokeragePercentage: "",
          });
        } else {
          setOpenDialog(false);
          setProcessingPayments(false);
          setBulkProcessingIndex(0);
          setSelectedBills([]);
          formik.resetForm();
          setDialogMode("add");
          setSelectedBill(null);
        }
      } catch (error) {
        console.error("Error recording payment: ", error);
        setSnackbar({
          open: true,
          message: "Failed to record payment: " + error.message,
          severity: "error",
        });
        setProcessingPayments(false);
      }
    },
  });

  // Fetch parties on component mount (unchanged)
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

  // Handle search for bills by selected party (unchanged)
  const handleSearch = async () => {
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
        (sum, bill) =>
          sum + (Number(bill.paymentDetails?.brokerageAmount) || 0),
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
    setProcessingPayments(false);
    setBulkProcessingIndex(0);
    formik.resetForm();
  };

  // Initiate delete payment (unchanged)
  const handleDelete = (billId) => {
    setBillToDelete(billId);
    setOpenDeleteDialog(true);
  };

  // Confirm delete payment (unchanged)
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

  // Open action menu (unchanged)
  const handleMenuOpen = (event, billId) => {
    setAnchorEl(event.currentTarget);
    setSelectedBillId(billId);
  };

  // Close action menu (unchanged)
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedBillId(null);
  };

  // Close snackbar (unchanged)
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

  // Select all bills
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const unpaidBills = filteredBills
        .filter((bill) => bill.status !== "paid")
        .map((bill) => bill.id);
      setSelectedBills(unpaidBills);
    } else {
      setSelectedBills([]);
    }
  };

  // Process multiple payments
  const handleBulkPayment = () => {
    if (selectedBills.length === 0) {
      setSnackbar({
        open: true,
        message: "Please select at least one bill",
        severity: "error",
      });
      return;
    }

    const unpaidSelectedBills = selectedBills.filter((billId) => {
      const bill = bills.find((b) => b.id === billId);
      return bill && bill.status !== "paid";
    });

    if (unpaidSelectedBills.length === 0) {
      setSnackbar({
        open: true,
        message: "All selected bills are already paid",
        severity: "warning",
      });
      return;
    }

    setProcessingPayments(true);
    setBulkProcessingIndex(0);
    const firstBill = bills.find((b) => b.id === unpaidSelectedBills[0]);
    handleOpenDialog(firstBill, "add");
  };

  // Handle page change (unchanged)
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
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
        <img
          src={logo}
          alt="Logo"
          style={{ width: "100px", height: "100px" }}
        />
      </Container>
    );
  }

  // Render error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, px: { xs: 1, sm: 2 } }}>
        <StyledPaper>
          <Typography
            variant="h6"
            color="error"
            sx={{ fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" } }}
          >
            {error}
          </Typography>
        </StyledPaper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, px: { xs: 1, sm: 2 } }}>
      <StyledPaper>
        <Typography
          variant={isMobile ? "h5" : "h4"}
          sx={{
            fontWeight: "bold",
            color: "primary.main",
            fontSize: { xs: "1.5rem", sm: "2rem", md: "2.25rem" },
            mb: 4,
          }}
        >
          Payments
        </Typography>

        {/* Party Selection and Search */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            mb: 4,
            gap: { xs: 2, sm: 2 },
            width: "100%",
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
                  flex: 1,
                  "& .MuiInputBase-root": {
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                  },
                }}
              />
            )}
            sx={{ flex: 1 }}
          />
          <StyledButton
            variant="contained"
            color="primary"
            onClick={handleSearch}
            disabled={!selectedParty || loading}
            size="small"
            sx={{
              fontSize: { xs: "0.875rem", sm: "1rem" },
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              <Search />
            )}
          </StyledButton>
          <StyledButton
            variant="contained"
            color="primary"
            onClick={handleBulkPayment}
            disabled={selectedBills.length === 0 || processingPayments}
            size="small"
            sx={{
              fontSize: { xs: "0.875rem", sm: "1rem" },
            }}
          >
            {processingPayments ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Proceed to Payment"
            )}
          </StyledButton>
        </Box>

        {filteredBills.length > 0 && (
          <>
            {/* Bulk Payment Button */}

            {/* Bills Table */}
            <TableContainer
              component={Paper}
              elevation={2}
              sx={{ borderRadius: 2, maxWidth: "100%", overflowX: "auto" }}
            >
              <Table sx={{ minWidth: { xs: 300, sm: 650 } }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "primary.light" }}>
                    <StyledTableCell>
                      <Checkbox
                        checked={
                          selectedBills.length ===
                          filteredBills.filter((b) => b.status !== "paid")
                            .length
                        }
                        onChange={handleSelectAll}
                        disabled={filteredBills.every(
                          (bill) => bill.status === "paid"
                        )}
                        inputProps={{ "aria-label": "Select all unpaid bills" }}
                        size="small"
                      />
                    </StyledTableCell>
                    <StyledTableCell>Bill No</StyledTableCell>
                    <StyledTableCell>Date</StyledTableCell>
                    <StyledTableCell>Amount</StyledTableCell>
                    <StyledTableCell align="center" colSpan={2}>
                      TDS
                    </StyledTableCell>
                    <StyledTableCell align="center" colSpan={2}>
                      Other Claim
                    </StyledTableCell>
                    <StyledTableCell>Status</StyledTableCell>
                    <StyledTableCell>Brokerage Amount</StyledTableCell>
                    <StyledTableCell>Actions</StyledTableCell>
                  </TableRow>
                  <TableRow sx={{ backgroundColor: "primary.light" }}>
                    <StyledTableCell></StyledTableCell>
                    <StyledTableCell></StyledTableCell>
                    <StyledTableCell></StyledTableCell>
                    <StyledTableCell></StyledTableCell>
                    <StyledTableCell align="center">
                      Percent (%)
                    </StyledTableCell>
                    <StyledTableCell align="center">Amount</StyledTableCell>
                    <StyledTableCell align="center">
                      Percent (%)
                    </StyledTableCell>
                    <StyledTableCell align="center">Amount</StyledTableCell>
                    <StyledTableCell></StyledTableCell>
                    <StyledTableCell></StyledTableCell>
                    <StyledTableCell></StyledTableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredBills.length > 0 ? (
                    filteredBills
                      .slice(
                        page * rowsPerPage,
                        page * rowsPerPage + rowsPerPage
                      )
                      .map((bill) => (
                        <StyledTableRow key={bill.id}>
                          <StyledTableCell>
                            <Checkbox
                              checked={selectedBills.includes(bill.id)}
                              onChange={() => handleSelectBill(bill.id)}
                              disabled={bill.status === "paid"}
                              inputProps={{
                                "aria-label": `Select bill ${bill.billNo}`,
                              }}
                              size="small"
                            />
                          </StyledTableCell>
                          <StyledTableCell>{bill.billNo}</StyledTableCell>
                          <StyledTableCell>
                            {bill.date
                              ? format(parseISO(bill.date), "dd-MM-yyyy")
                              : "N/A"}
                          </StyledTableCell>
                          <StyledTableCell>
                            ₹{(Number(bill.totalAmount) || 0).toFixed(2)}
                          </StyledTableCell>
                          <StyledTableCell align="center">
                            {(Number(bill.paymentDetails?.tds) || 0).toFixed(2)}
                          </StyledTableCell>
                          <StyledTableCell align="center">
                            ₹
                            {(
                              Number(bill.paymentDetails?.tdsAmount) || 0
                            ).toFixed(2)}
                          </StyledTableCell>
                          <StyledTableCell align="center">
                            {(
                              Number(
                                bill.paymentDetails?.otherClaimPercentage
                              ) || 0
                            ).toFixed(2)}
                          </StyledTableCell>
                          <StyledTableCell align="center">
                            ₹
                            {(
                              Number(bill.paymentDetails?.otherClaim) || 0
                            ).toFixed(2)}
                          </StyledTableCell>
                          <StyledTableCell>
                            <Chip
                              label={bill.status.toUpperCase()}
                              color={
                                bill.status === "paid" ? "success" : "warning"
                              }
                              size="small"
                              variant="outlined"
                              sx={{
                                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                              }}
                            />
                          </StyledTableCell>
                          <StyledTableCell>
                            ₹
                            {Number(
                              bill.paymentDetails?.brokerageAmount || 0
                            ).toFixed(2)}
                          </StyledTableCell>
                          <StyledTableCell>
                            <IconButton
                              onClick={(e) => handleMenuOpen(e, bill.id)}
                              size="small"
                              aria-label="More actions"
                            >
                              <MoreVert />
                            </IconButton>
                            <Menu
                              anchorEl={anchorEl}
                              open={
                                Boolean(anchorEl) && selectedBillId === bill.id
                              }
                              onClose={handleMenuClose}
                            >
                              {bill.status !== "paid" ? (
                                <MenuItem
                                  onClick={() => {
                                    handleOpenDialog(bill, "add");
                                    handleMenuClose();
                                  }}
                                  sx={{
                                    fontSize: { xs: "0.85rem", sm: "0.95rem" },
                                  }}
                                >
                                  Pay
                                </MenuItem>
                              ) : (
                                [
                                  <MenuItem
                                    key="view"
                                    onClick={() => {
                                      handleOpenDialog(bill, "view");
                                      handleMenuClose();
                                    }}
                                    sx={{
                                      fontSize: {
                                        xs: "0.85rem",
                                        sm: "0.95rem",
                                      },
                                    }}
                                  >
                                    View Payment
                                  </MenuItem>,
                                  <MenuItem
                                    key="edit"
                                    onClick={() => {
                                      handleOpenDialog(bill, "edit");
                                      handleMenuClose();
                                    }}
                                    sx={{
                                      fontSize: {
                                        xs: "0.85rem",
                                        sm: "0.95rem",
                                      },
                                    }}
                                  >
                                    Edit Payment
                                  </MenuItem>,
                                  <MenuItem
                                    key="delete"
                                    onClick={() => {
                                      handleDelete(bill.id);
                                      handleMenuClose();
                                    }}
                                    sx={{
                                      fontSize: {
                                        xs: "0.85rem",
                                        sm: "0.95rem",
                                      },
                                    }}
                                  >
                                    Delete Payment
                                  </MenuItem>,
                                ]
                              )}
                            </Menu>
                          </StyledTableCell>
                        </StyledTableRow>
                      ))
                  ) : (
                    <TableRow>
                      <StyledTableCell colSpan={11} align="center">
                        <Typography
                          variant="body1"
                          sx={{
                            py: 3,
                            color: "text.secondary",
                            fontSize: { xs: "0.875rem", sm: "1rem" },
                          }}
                        >
                          No bills found
                        </Typography>
                      </StyledTableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={filteredBills.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
              sx={{
                mt: 2,
                "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
                  {
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                  },
              }}
            />
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
                  fontSize: { xs: "1.25rem", sm: "1.5rem" },
                }}
              >
                {processingPayments
                  ? `Processing Payment ${bulkProcessingIndex + 1} of ${
                      selectedBills.length
                    }`
                  : dialogMode === "view"
                  ? "View Payment Details"
                  : dialogMode === "edit"
                  ? "Edit Payment"
                  : "Record Payment"}
              </Typography>
            </Box>
            <Box>
              {dialogMode === "view" && (
                <IconButton
                  edge="end"
                  color="inherit"
                  onClick={() => setDialogMode("edit")}
                  sx={{ mr: 1 }}
                  size="small"
                  aria-label="Edit payment"
                >
                  <Edit />
                </IconButton>
              )}
              <IconButton
                edge="end"
                color="inherit"
                onClick={handleCloseDialog}
                size="small"
                aria-label="Close dialog"
              >
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ mt: 3, px: { xs: 2, sm: 4 } }}>
            {/* Summary for Bulk Processing */}
            {processingPayments && selectedBills.length > 1 && (
              <Box sx={{ mb: 3, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: "bold", mb: 1 }}
                >
                  Selected Bills Summary
                </Typography>
                <Typography variant="body2">
                  Total Bills: {selectedBills.length}
                </Typography>
                <Typography variant="body2">
                  Total Amount: ₹{selectedBillsTotal.amount.toFixed(2)}
                </Typography>
                <Typography variant="body2">
                  Total Taxable Amount: ₹
                  {selectedBillsTotal.taxableAmount.toFixed(2)}
                </Typography>
              </Box>
            )}
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: "bold",
                  color: "text.primary",
                  mb: 3,
                  fontSize: { xs: "1.25rem", sm: "1.5rem" },
                }}
              >
                Payment Information
              </Typography>
              <Grid container spacing={{ xs: 2, sm: 3 }}>
                <Grid item xs={12} md={6}>
                  {dialogMode === "view" ? (
                    <>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                          mb: 0.5,
                        }}
                      >
                        Payment Method
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                      >
                        {formik.values.paymentMethod
                          ? formik.values.paymentMethod.toUpperCase()
                          : "N/A"}
                      </Typography>
                    </>
                  ) : (
                    <TextField
                      select
                      fullWidth
                      id="paymentMethod"
                      name="paymentMethod"
                      label="Payment Method"
                      value={formik.values.paymentMethod}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={
                        formik.touched.paymentMethod &&
                        Boolean(formik.errors.paymentMethod)
                      }
                      helperText={
                        formik.touched.paymentMethod &&
                        formik.errors.paymentMethod
                      }
                      disabled={dialogMode === "edit"}
                      size="small"
                      sx={{
                        "& .MuiInputBase-root": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                      }}
                    >
                      <MenuItem
                        value=""
                        sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                      >
                        Select Method
                      </MenuItem>
                      {paymentMethods.map((method) => (
                        <MenuItem
                          key={method}
                          value={method}
                          sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                        >
                          {method.charAt(0).toUpperCase() + method.slice(1)}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                </Grid>
                <Grid item xs={12} md={6}>
                  {dialogMode === "view" ? (
                    <>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                          mb: 0.5,
                        }}
                      >
                        Amount
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                      >
                        ₹{(Number(formik.values.amount) || 0).toFixed(2)}
                      </Typography>
                    </>
                  ) : (
                    <TextField
                      fullWidth
                      id="amount"
                      name="amount"
                      label="Amount"
                      value={formik.values.amount}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={
                        formik.touched.amount && Boolean(formik.errors.amount)
                      }
                      helperText={formik.touched.amount && formik.errors.amount}
                      disabled
                      size="small"
                      sx={{
                        "& .MuiInputBase-root": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                      }}
                    />
                  )}
                </Grid>
                {formik.values.paymentMethod === "cheque" && (
                  <>
                    <Grid item xs={12} md={6}>
                      {dialogMode === "view" ? (
                        <>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            sx={{
                              fontSize: { xs: "0.875rem", sm: "1rem" },
                            }}
                          >
                            Cheque Number
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                          >
                            {formik.values.chequeNo || "N/A"}
                          </Typography>
                        </>
                      ) : (
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
                          size="small"
                          sx={{
                            "& .MuiInputBase-root": {
                              fontSize: { xs: "0.875rem", sm: "1rem" },
                            },
                          }}
                        />
                      )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      {dialogMode === "view" ? (
                        <>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            sx={{
                              fontSize: { xs: "0.875rem", sm: "1rem" },
                            }}
                          >
                            Bank Name
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                          >
                            {formik.values.bank || "N/A"}
                          </Typography>
                        </>
                      ) : (
                        <TextField
                          fullWidth
                          id="bank"
                          name="bank"
                          label="Bank Name"
                          value={formik.values.bank}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          error={
                            formik.touched.bank && Boolean(formik.errors.bank)
                          }
                          helperText={formik.touched.bank && formik.errors.bank}
                          size="small"
                          sx={{
                            "& .MuiInputBase-root": {
                              fontSize: { xs: "0.875rem", sm: "1rem" },
                            },
                          }}
                        />
                      )}
                    </Grid>
                  </>
                )}
                {formik.values.paymentMethod === "upi" && (
                  <>
                    <Grid item xs={12} md={6}>
                      {dialogMode === "view" ? (
                        <>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            sx={{
                              fontSize: { xs: "0.875rem", sm: "1rem" },
                            }}
                          >
                            UPI ID
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                          >
                            {formik.values.upiId || "N/A"}
                          </Typography>
                        </>
                      ) : (
                        <TextField
                          fullWidth
                          id="upiId"
                          name="upiId"
                          label="UPI ID"
                          value={formik.values.upiId}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          error={
                            formik.touched.upiId && Boolean(formik.errors.upiId)
                          }
                          helperText={
                            formik.touched.upiId && formik.errors.upiId
                          }
                          size="small"
                          sx={{
                            "& .MuiInputBase-root": {
                              fontSize: { xs: "0.875rem", sm: "1rem" },
                            },
                          }}
                        />
                      )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      {dialogMode === "view" ? (
                        <>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            sx={{
                              fontSize: { xs: "0.875rem", sm: "1rem" },
                            }}
                          >
                            UPI Name
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                          >
                            {formik.values.upiName || "N/A"}
                          </Typography>
                        </>
                      ) : (
                        <TextField
                          fullWidth
                          id="upiName"
                          name="upiName"
                          label="UPI Name"
                          value={formik.values.upiName}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          error={
                            formik.touched.upiName &&
                            Boolean(formik.errors.upiName)
                          }
                          helperText={
                            formik.touched.upiName && formik.errors.upiName
                          }
                          size="small"
                          sx={{
                            "& .MuiInputBase-root": {
                              fontSize: { xs: "0.875rem", sm: "1rem" },
                            },
                          }}
                        />
                      )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      {dialogMode === "view" ? (
                        <>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            sx={{
                              fontSize: { xs: "0.875rem", sm: "1rem" },
                            }}
                          >
                            Bank Name
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                          >
                            {formik.values.bank || "N/A"}
                          </Typography>
                        </>
                      ) : (
                        <TextField
                          fullWidth
                          id="bank"
                          name="bank"
                          label="Bank Name (Optional)"
                          value={formik.values.bank}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          error={
                            formik.touched.bank && Boolean(formik.errors.bank)
                          }
                          helperText={formik.touched.bank && formik.errors.bank}
                          size="small"
                          sx={{
                            "& .MuiInputBase-root": {
                              fontSize: { xs: "0.875rem", sm: "1rem" },
                            },
                          }}
                        />
                      )}
                    </Grid>
                  </>
                )}
                {formik.values.paymentMethod === "netbanking" && (
                  <>
                    <Grid item xs={12} md={6}>
                      {dialogMode === "view" ? (
                        <>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            sx={{
                              fontSize: { xs: "0.875rem", sm: "1rem" },
                            }}
                          >
                            RTGS/NEFT
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                          >
                            {formik.values.rtgsNeft || "N/A"}
                          </Typography>
                        </>
                      ) : (
                        <FormControl
                          fullWidth
                          error={
                            formik.touched.rtgsNeft &&
                            Boolean(formik.errors.rtgsNeft)
                          }
                          sx={{
                            "& .MuiInputBase-root": {
                              fontSize: { xs: "0.875rem", sm: "1rem" },
                            },
                          }}
                        >
                          <InputLabel
                            sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                          >
                            RTGS/NEFT
                          </InputLabel>
                          <Select
                            id="rtgsNeft"
                            name="rtgsNeft"
                            value={formik.values.rtgsNeft}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            label="RTGS/NEFT"
                            size="small"
                            sx={{
                              fontSize: { xs: "0.875rem", sm: "1rem" },
                            }}
                          >
                            <MenuItem
                              value=""
                              sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                            >
                              Select
                            </MenuItem>
                            {["RTGS", "NEFT"].map((option) => (
                              <MenuItem
                                key={option}
                                value={option}
                                sx={{
                                  fontSize: { xs: "0.875rem", sm: "1rem" },
                                }}
                              >
                                {option}
                              </MenuItem>
                            ))}
                          </Select>
                          {formik.touched.rtgsNeft &&
                            formik.errors.rtgsNeft && (
                              <Typography variant="caption" color="error">
                                {formik.errors.rtgsNeft}
                              </Typography>
                            )}
                        </FormControl>
                      )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      {dialogMode === "view" ? (
                        <>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            sx={{
                              fontSize: { xs: "0.875rem", sm: "1rem" },
                            }}
                          >
                            Bank Name
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                          >
                            {formik.values.bank || "N/A"}
                          </Typography>
                        </>
                      ) : (
                        <TextField
                          fullWidth
                          id="bank"
                          name="bank"
                          label="Bank Name"
                          value={formik.values.bank}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          error={
                            formik.touched.bank && Boolean(formik.errors.bank)
                          }
                          helperText={formik.touched.bank && formik.errors.bank}
                          size="small"
                          sx={{
                            "& .MuiInputBase-root": {
                              fontSize: { xs: "0.875rem", sm: "1rem" },
                            },
                          }}
                        />
                      )}
                    </Grid>
                  </>
                )}
                {formik.values.paymentMethod !== "cash" && (
                  <>
                    <Grid item xs={12} md={6}>
                      {dialogMode === "view" ? (
                        <>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            sx={{
                              fontSize: { xs: "0.875rem", sm: "1rem" },
                            }}
                          >
                            TDS (%)
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                          >
                            {(Number(formik.values.tds) || 0).toFixed(2)}
                          </Typography>
                        </>
                      ) : (
                        <TextField
                          fullWidth
                          id="tds"
                          name="tds"
                          label="TDS (%)"
                          value={formik.values.tds}
                          onChange={(e) => {
                            formik.handleChange(e);
                            formik.setFieldValue(
                              "tdsAmount",
                              (
                                (Number(formik.values.taxableAmount) *
                                  Number(e.target.value)) /
                                100
                              ).toFixed(2)
                            );
                          }}
                          onBlur={formik.handleBlur}
                          error={
                            formik.touched.tds && Boolean(formik.errors.tds)
                          }
                          helperText={formik.touched.tds && formik.errors.tds}
                          size="small"
                          sx={{
                            "& .MuiInputBase-root": {
                              fontSize: { xs: "0.875rem", sm: "1rem" },
                            },
                          }}
                        />
                      )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      {dialogMode === "view" ? (
                        <>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            sx={{
                              fontSize: { xs: "0.875rem", sm: "1rem" },
                            }}
                          >
                            TDS Amount
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                          >
                            ₹
                            {(
                              (Number(formik.values.taxableAmount) *
                                Number(formik.values.tds)) /
                              100
                            ).toFixed(2)}
                          </Typography>
                        </>
                      ) : (
                        <TextField
                          fullWidth
                          id="tdsAmount"
                          name="tdsAmount"
                          label="TDS Amount"
                          value={(
                            (Number(formik.values.taxableAmount) *
                              Number(formik.values.tds)) /
                            100
                          ).toFixed(2)}
                          disabled
                          size="small"
                          sx={{
                            "& .MuiInputBase-root": {
                              fontSize: { xs: "0.875rem", sm: "1rem" },
                            },
                          }}
                        />
                      )}
                    </Grid>
                  </>
                )}
                <Grid item xs={12} md={6}>
                  {dialogMode === "view" ? (
                    <>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                      >
                        Other Claim (%)
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                      >
                        {(
                          Number(formik.values.otherClaimPercentage) || 0
                        ).toFixed(2)}
                      </Typography>
                    </>
                  ) : (
                    <TextField
                      fullWidth
                      id="otherClaimPercentage"
                      name="otherClaimPercentage"
                      label="Other Claim (%) (Optional)"
                      value={formik.values.otherClaimPercentage}
                      onChange={(e) => {
                        formik.handleChange(e);
                        formik.setFieldValue(
                          "otherClaim",
                          (
                            (Number(formik.values.taxableAmount) *
                              Number(e.target.value)) /
                            100
                          ).toFixed(2)
                        );
                      }}
                      onBlur={formik.handleBlur}
                      error={
                        formik.touched.otherClaimPercentage &&
                        Boolean(formik.errors.otherClaimPercentage)
                      }
                      helperText={
                        formik.touched.otherClaimPercentage &&
                        formik.errors.otherClaimPercentage
                      }
                      size="small"
                      sx={{
                        "& .MuiInputBase-root": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                      }}
                    />
                  )}
                </Grid>
                <Grid item xs={12} md={6}>
                  {dialogMode === "view" ? (
                    <>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                      >
                        Other Claim Amount
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                      >
                        ₹{(Number(formik.values.otherClaim) || 0).toFixed(2)}
                      </Typography>
                    </>
                  ) : (
                    <TextField
                      fullWidth
                      id="otherClaim"
                      name="otherClaim"
                      label="Other Claim Amount (Optional)"
                      value={formik.values.otherClaim}
                      onChange={(e) => {
                        formik.handleChange(e);
                        formik.setFieldValue(
                          "otherClaimPercentage",
                          (
                            (Number(e.target.value) /
                              Number(formik.values.taxableAmount)) *
                            100
                          ).toFixed(2)
                        );
                      }}
                      onBlur={formik.handleBlur}
                      error={
                        formik.touched.otherClaim &&
                        Boolean(formik.errors.otherClaim)
                      }
                      helperText={
                        formik.touched.otherClaim && formik.errors.otherClaim
                      }
                      size="small"
                      sx={{
                        "& .MuiInputBase-root": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                      }}
                    />
                  )}
                </Grid>
              </Grid>
            </Box>
            <Divider sx={{ my: 3 }} />
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: "bold",
                  color: "text.primary",
                  mb: 3,
                  fontSize: { xs: "1.25rem", sm: "1.5rem" },
                }}
              >
                Broker Details
              </Typography>
              <Grid container spacing={{ xs: 2, sm: 3 }}>
                <Grid item xs={12} md={6}>
                  {dialogMode === "view" ? (
                    <>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                      >
                        Broker Name
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                      >
                        {formik.values.brokerName || "N/A"}
                      </Typography>
                    </>
                  ) : (
                    <TextField
                      fullWidth
                      id="brokerName"
                      name="brokerName"
                      label="Broker Name"
                      value={formik.values.brokerName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={
                        formik.touched.brokerName &&
                        Boolean(formik.errors.brokerName)
                      }
                      helperText={
                        formik.touched.brokerName && formik.errors.brokerName
                      }
                      size="small"
                      sx={{
                        "& .MuiInputBase-root": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                      }}
                    />
                  )}
                </Grid>
                <Grid item xs={12} md={6}>
                  {dialogMode === "view" ? (
                    <>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                      >
                        Broker Phone
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                      >
                        {formik.values.brokerPhone || "N/A"}
                      </Typography>
                    </>
                  ) : (
                    <TextField
                      fullWidth
                      id="brokerPhone"
                      name="brokerPhone"
                      label="Broker Phone Number"
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
                      size="small"
                      sx={{
                        "& .MuiInputBase-root": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                      }}
                    />
                  )}
                </Grid>
                <Grid item xs={12}>
                  {dialogMode === "view" ? (
                    <>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                      >
                        Taxable Amount
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                      >
                        ₹{(Number(formik.values.taxableAmount) || 0).toFixed(2)}
                      </Typography>
                    </>
                  ) : (
                    <TextField
                      fullWidth
                      id="taxableAmount"
                      name="taxableAmount"
                      label="Taxable Amount"
                      value={formik.values.taxableAmount}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={
                        formik.touched.taxableAmount &&
                        Boolean(formik.errors.taxableAmount)
                      }
                      helperText={
                        formik.touched.taxableAmount &&
                        formik.errors.taxableAmount
                      }
                      disabled
                      size="small"
                      sx={{
                        "& .MuiInputBase-root": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                      }}
                    />
                  )}
                </Grid>
                <Grid item xs={12} md={6}>
                  {dialogMode === "view" ? (
                    <>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                      >
                        Brokerage (%)
                      </Typography>
                      <Typography
                        sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                      >
                        {(
                          Number(formik.values.brokeragePercentage) || 0
                        ).toFixed(2)}
                      </Typography>
                    </>
                  ) : (
                    <TextField
                      fullWidth
                      id="brokeragePercentage"
                      name="brokeragePercentage"
                      label="Brokerage (%)"
                      value={formik.values.brokeragePercentage}
                      onChange={(e) => {
                        formik.handleChange(e);
                        formik.setFieldValue(
                          "brokerageAmount",
                          (
                            (Number(formik.values.taxableAmount) *
                              Number(e.target.value)) /
                            100
                          ).toFixed(2)
                        );
                      }}
                      onBlur={formik.handleBlur}
                      error={
                        formik.touched.brokeragePercentage &&
                        Boolean(formik.errors.brokeragePercentage)
                      }
                      helperText={
                        formik.touched.brokeragePercentage &&
                        formik.errors.brokeragePercentage
                      }
                      size="small"
                      sx={{
                        "& .MuiInputBase-root": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                      }}
                    />
                  )}
                </Grid>
                <Grid item xs={12} md={6}>
                  {dialogMode === "view" ? (
                    <>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                      >
                        Brokerage Amount
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                      >
                        ₹
                        {(
                          (Number(formik.values.taxableAmount) *
                            Number(formik.values.brokeragePercentage)) /
                          100
                        ).toFixed(2)}
                      </Typography>
                    </>
                  ) : (
                    <TextField
                      fullWidth
                      id="brokerageAmount"
                      name="brokerageAmount"
                      label="Brokerage Amount"
                      value={(
                        (Number(formik.values.taxableAmount) *
                          Number(formik.values.brokeragePercentage)) /
                        100
                      ).toFixed(2)}
                      disabled
                      size="small"
                      sx={{
                        "& .MuiInputBase-root": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                      }}
                    />
                  )}
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions
            sx={{ p: { xs: 2, sm: 3 }, justifyContent: "flex-end" }}
          >
            {dialogMode === "view" ? null : (
              <StyledButton
                color="primary"
                variant="contained"
                onClick={formik.handleSubmit}
                disabled={formik.isSubmitting}
                sx={{
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                }}
              >
                {formik.isSubmitting ? (
                  <CircularProgress size={24} />
                ) : processingPayments ? (
                  "Next"
                ) : dialogMode === "edit" ? (
                  "Update"
                ) : (
                  "Save"
                )}
              </StyledButton>
            )}
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
              bgcolor: "primary.main",
              color: "white",
              py: 2,
              fontSize: { xs: "1.25rem", sm: "1.5rem" },
            }}
          >
            Confirm Delete
          </DialogTitle>
          <DialogContent sx={{ mt: 2, px: { xs: 2, sm: 3 } }}>
            <Typography
              sx={{ fontSize: { xs: "0.875rem", sm: "1rem", md: "1.125rem" } }}
            >
              Are you sure you want to delete this payment? This action cannot
              be undone.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: { xs: 2, sm: 3 } }}>
            <StyledButton
              onClick={() => setOpenDeleteDialog(false)}
              variant="outlined"
              color="primary"
              sx={{
                fontSize: { xs: "0.875rem", sm: "1rem" },
              }}
            >
              Cancel
            </StyledButton>
            <StyledButton
              onClick={confirmDelete}
              variant="contained"
              color="error"
              startIcon={<Delete />}
              sx={{
                fontSize: { xs: "0.875rem", sm: "1rem" },
              }}
            >
              Delete
            </StyledButton>
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
            sx={{ width: "100%", fontSize: { xs: "0.875rem", sm: "1rem" } }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </StyledPaper>
    </Container>
  );
};

export default Payments;