import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  IconButton,
  Divider,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  useMediaQuery,
  useTheme,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Search,
  ArrowBack,
  Visibility,
  Edit,
  Delete,
  MoreVert,
  Close,
} from "@mui/icons-material";
import { format, parseISO } from "date-fns";

const Payment = () => {
  const { partyId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [party, setParty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchStartDate, setSearchStartDate] = useState("");
  const [searchEndDate, setSearchEndDate] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
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

  const validationSchema = Yup.object({
    paymentMethod: Yup.string().required("Payment method is required"),
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

  useEffect(() => {
    if (!currentUser) {
      setError("Please log in to view bills");
      setLoading(false);
      return;
    }

    const fetchBillsAndParty = async () => {
      try {
        // Fetch party details
        const partyQuery = query(
          collection(db, "parties"),
          where("__name__", "==", partyId),
          where("createdBy", "==", currentUser.uid)
        );
        const partySnapshot = await getDocs(partyQuery);
        if (!partySnapshot.empty) {
          setParty({
            id: partySnapshot.docs[0].id,
            ...partySnapshot.docs[0].data(),
          });
        } else {
          setError("Party not found");
          setLoading(false);
          return;
        }

        // Fetch bills for the party
        const billsQuery = query(
          collection(db, "bills"),
          where("partyId", "==", partyId),
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

        // Sort bills by billNo
        const sortedBills = billsData.sort((a, b) =>
          String(a.billNo || "").localeCompare(String(b.billNo || ""))
        );

        setBills(sortedBills);
        setFilteredBills(sortedBills);

        // Calculate summary
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
        console.error("Error fetching data: ", error);
        setError("Failed to fetch bills: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBillsAndParty();
  }, [currentUser, partyId]);

  const handleSearch = () => {
    if (!searchStartDate || !searchEndDate) {
      setSnackbar({
        open: true,
        message: "Please select both start and end dates",
        severity: "error",
      });
      return;
    }

    try {
      const start = parseISO(searchStartDate);
      const end = parseISO(searchEndDate);
      end.setHours(23, 59, 59, 999);

      const filtered = bills.filter((bill) => {
        const billDate = parseISO(bill.date);
        return billDate >= start && billDate <= end;
      });

      setFilteredBills(filtered);
      setPage(0);
      setSearchStartDate("");
      setSearchEndDate("");
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Invalid date format",
        severity: "error",
      });
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

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

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedBill(null);
    setDialogMode("add");
    formik.resetForm();
  };

  const handleDelete = (billId) => {
    setBillToDelete(billId);
    setOpenDeleteDialog(true);
  };

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

  const handleMenuOpen = (event, billId) => {
    setAnchorEl(event.currentTarget);
    setSelectedBillId(billId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedBillId(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return (
      <Container
        maxWidth="lg"
        sx={{
          mt: 4,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <CircularProgress size={48} />
      </Container>
    );
  }

  if (error || !party) {
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
            {error || "Party not found"}
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
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            mb: 3,
            gap: { xs: 2, sm: 0 },
          }}
        >
          <Typography
            variant={isMobile ? "h5" : "h4"}
            sx={{
              fontWeight: "bold",
              color: "primary.main",
              fontSize: { xs: "1rem", sm: "1.5rem", md: "1.75rem" },
            }}
          >
            Payments for {party.companyName || party.partyName} ({party.gstNo})
          </Typography>
        </Box>

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
                sx={{ fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" } }}
              >
                <strong>
                  ₹{(summary.totalTDS + summary.totalOtherClaim).toFixed(2)}
                </strong>
              </Typography>
              <Typography
                variant="body2"
                color="text.primary"
                sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" }, mt: 1 }}
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
                sx={{ fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" } }}
              >
                <strong>₹{summary.totalTDS.toFixed(2)}</strong>
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" }, mt: 1 }}
              >
                <strong>
                  {((summary.totalTDS / summary.total) * 100 || 0).toFixed(2)}%
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
                sx={{ fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" } }}
              >
                <strong>₹{summary.totalOtherClaim.toFixed(2)}</strong>
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" }, mt: 1 }}
              >
                <strong>
                  {(
                    (summary.totalOtherClaim / summary.total) * 100 || 0
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
                sx={{ fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" } }}
              >
                <strong>₹{summary.totalBrokerage.toFixed(2)}</strong>
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" }, mt: 1 }}
              >
                <strong>
                  {((summary.totalBrokerage / summary.total) * 100 || 0).toFixed(2)}%
                </strong>
              </Typography>
            </Box>
          </Grid>
        </Grid>

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
          <TextField
            label="Start Date"
            type="date"
            value={searchStartDate}
            onChange={(e) => setSearchStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{
              minWidth: { xs: "100%", sm: 150 },
              "& .MuiInputBase-root": {
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              },
            }}
          />
          <TextField
            label="End Date"
            type="date"
            value={searchEndDate}
            onChange={(e) => setSearchEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{
              minWidth: { xs: "100%", sm: 150 },
              "& .MuiInputBase-root": {
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              },
            }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleSearch}
            startIcon={<Search />}
            size="medium"
            sx={{
              width: { xs: "100%", sm: "auto" },
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
              height: "40px",
            }}
          >
            Search
          </Button>
        </Box>

        <TableContainer
          component={Paper}
          elevation={2}
          sx={{ borderRadius: 2, maxWidth: "100%", overflowX: "auto" }}
        >
          <Table sx={{ minWidth: { xs: 300, sm: 650 } }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: "primary.light" }}>
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
                ></TableCell>
              </TableRow>
              <TableRow sx={{ backgroundColor: "primary.light" }}>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: { xs: "0.65rem", sm: "0.75rem" },
                    textAlign: "center",
                  }}
                >
                  Percent (%)
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: { xs: "0.65rem", sm: "0.75rem" },
                    textAlign: "center",
                  }}
                >
                  Amount
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: { xs: "0.65rem", sm: "0.75rem" },
                    textAlign: "center",
                  }}
                >
                  Percent (%)
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: { xs: "0.65rem", sm: "0.75rem" },
                    textAlign: "center",
                  }}
                >
                  Amount
                </TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBills.length > 0 ? (
                filteredBills
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((bill) => (
                    <TableRow key={bill.id} hover>
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
                        {bill.date
                          ? format(parseISO(bill.date), "dd-MM-yyyy")
                          : "N/A"}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                        }}
                      >
                        ₹{(Number(bill.totalAmount) || 0).toFixed(2)}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          textAlign: "center",
                        }}
                      >
                        {(Number(bill.paymentDetails?.tds) || 0).toFixed(2)}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          textAlign: "center",
                        }}
                      >
                        ₹{(Number(bill.paymentDetails?.tdsAmount) || 0).toFixed(
                          2
                        )}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          textAlign: "center",
                        }}
                      >
                        {(
                          Number(bill.paymentDetails?.otherClaimPercentage) || 0
                        ).toFixed(2)}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          textAlign: "center",
                        }}
                      >
                        ₹{(Number(bill.paymentDetails?.otherClaim) || 0).toFixed(
                          2
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={bill.status.toUpperCase()}
                          color={bill.status === "paid" ? "success" : "warning"}
                          size="small"
                          variant="outlined"
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          onClick={(e) => handleMenuOpen(e, bill.id)}
                          size={isMobile ? "small" : "medium"}
                        >
                          <MoreVert />
                        </IconButton>
                        <Menu
                          anchorEl={anchorEl}
                          open={Boolean(anchorEl) && selectedBillId === bill.id}
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
                          ) : [
                            <MenuItem
                              key="view"
                              onClick={() => {
                                handleOpenDialog(bill, "view");
                                handleMenuClose();
                              }}
                              sx={{
                                fontSize: { xs: "0.85rem", sm: "0.95rem" },
                              }}
                            >
                              View
                            </MenuItem>,
                            <MenuItem
                              key="edit"
                              onClick={() => {
                                handleOpenDialog(bill, "edit");
                                handleMenuClose();
                              }}
                              sx={{
                                fontSize: { xs: "0.85rem", sm: "0.95rem" },
                              }}
                            >
                              Edit
                            </MenuItem>,
                            <MenuItem
                              key="delete"
                              onClick={() => {
                                handleDelete(bill.id);
                                handleMenuClose();
                              }}
                              sx={{
                                fontSize: { xs: "0.85rem", sm: "0.95rem" },
                              }}
                            >
                              Delete
                            </MenuItem>,
                          ]}
                        </Menu>
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    <Typography
                      variant="body1"
                      sx={{
                        py: 3,
                        color: "text.secondary",
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      }}
                    >
                      No bills found
                    </Typography>
                  </TableCell>
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
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
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
                  size={isMobile ? "small" : "medium"}
                >
                  <Edit />
                </IconButton>
              )}
              <IconButton
                edge="end"
                color="inherit"
                onClick={handleCloseDialog}
                size={isMobile ? "small" : "medium"}
              >
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ mt: 2, px: { xs: 2, sm: 3 } }}>
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
                  Payment Information
                </Typography>
                <Grid container spacing={{ xs: 2, sm: 3 }}>
                  <Grid item xs={12} md={6}>
                    {dialogMode === "view" ? (
                      <>
                        <Typography
                          variant="subtitle2"
                          color="text.secondary"
                          sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                        >
                          Payment Method
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
                        >
                          {formik.values.paymentMethod
                            ? formik.values.paymentMethod
                                .charAt(0)
                                .toUpperCase() +
                              formik.values.paymentMethod.slice(1)
                            : "N/A"}
                        </Typography>
                      </>
                    ) : (
                      <FormControl
                        fullWidth
                        error={
                          formik.touched.paymentMethod &&
                          Boolean(formik.errors.paymentMethod)
                        }
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                          },
                        }}
                      >
                        <InputLabel
                          sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                        >
                          Payment Method
                        </InputLabel>
                        <Select
                          id="paymentMethod"
                          name="paymentMethod"
                          value={formik.values.paymentMethod}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          label="Payment Method"
                          disabled={dialogMode === "edit"}
                          sx={{
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                          }}
                        >
                          <MenuItem
                            value=""
                            sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                          >
                            Select Method
                          </MenuItem>
                          <MenuItem
                            value="cheque"
                            sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                          >
                            Cheque
                          </MenuItem>
                          <MenuItem
                            value="upi"
                            sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                          >
                            UPI
                          </MenuItem>
                          <MenuItem
                            value="netbanking"
                            sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                          >
                            Net Banking
                          </MenuItem>
                          <MenuItem
                            value="cash"
                            sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                          >
                            Cash
                          </MenuItem>
                        </Select>
                        {formik.touched.paymentMethod &&
                          formik.errors.paymentMethod && (
                            <Typography variant="caption" color="error">
                              {formik.errors.paymentMethod}
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
                          sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                        >
                          Amount
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
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
                        helperText={
                          formik.touched.amount && formik.errors.amount
                        }
                        disabled
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.9rem", sm: "1rem" },
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
                                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                              }}
                            >
                              Cheque Number
                            </Typography>
                            <Typography
                              variant="body1"
                              sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
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
                            sx={{
                              "& .MuiInputBase-root": {
                                fontSize: { xs: "0.9rem", sm: "1rem" },
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
                                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                              }}
                            >
                              Bank Name
                            </Typography>
                            <Typography
                              variant="body1"
                              sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
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
                            helperText={
                              formik.touched.bank && formik.errors.bank
                            }
                            sx={{
                              "& .MuiInputBase-root": {
                                fontSize: { xs: "0.9rem", sm: "1rem" },
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
                                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                              }}
                            >
                              UPI ID
                            </Typography>
                            <Typography
                              variant="body1"
                              sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
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
                              formik.touched.upiId &&
                              Boolean(formik.errors.upiId)
                            }
                            helperText={
                              formik.touched.upiId && formik.errors.upiId
                            }
                            sx={{
                              "& .MuiInputBase-root": {
                                fontSize: { xs: "0.9rem", sm: "1rem" },
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
                                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                              }}
                            >
                              UPI Name
                            </Typography>
                            <Typography
                              variant="body1"
                              sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
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
                            sx={{
                              "& .MuiInputBase-root": {
                                fontSize: { xs: "0.9rem", sm: "1rem" },
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
                                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                              }}
                            >
                              Bank Name
                            </Typography>
                            <Typography
                              variant="body1"
                              sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
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
                            helperText={
                              formik.touched.bank && formik.errors.bank
                            }
                            sx={{
                              "& .MuiInputBase-root": {
                                fontSize: { xs: "0.9rem", sm: "1rem" },
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
                                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                              }}
                            >
                              RTGS/NEFT
                            </Typography>
                            <Typography
                              variant="body1"
                              sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
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
                                fontSize: { xs: "0.9rem", sm: "1rem" },
                              },
                            }}
                          >
                            <InputLabel
                              sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
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
                              sx={{
                                fontSize: { xs: "0.9rem", sm: "1rem" },
                              }}
                            >
                              <MenuItem
                                value=""
                                sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                              >
                                Select
                              </MenuItem>
                              <MenuItem
                                value="RTGS"
                                sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                              >
                                RTGS
                              </MenuItem>
                              <MenuItem
                                value="NEFT"
                                sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                              >
                                NEFT
                              </MenuItem>
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
                                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                              }}
                            >
                              Bank Name
                            </Typography>
                            <Typography
                              variant="body1"
                              sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
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
                            helperText={
                              formik.touched.bank && formik.errors.bank
                            }
                            sx={{
                              "& .MuiInputBase-root": {
                                fontSize: { xs: "0.9rem", sm: "1rem" },
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
                                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                              }}
                            >
                              TDS (%)
                            </Typography>
                            <Typography
                              variant="body1"
                              sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
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
                            sx={{
                              "& .MuiInputBase-root": {
                                fontSize: { xs: "0.9rem", sm: "1rem" },
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
                                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                              }}
                            >
                              TDS Amount
                            </Typography>
                            <Typography
                              variant="body1"
                              sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
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
                            sx={{
                              "& .MuiInputBase-root": {
                                fontSize: { xs: "0.9rem", sm: "1rem" },
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
                          sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                        >
                          Other Claim (%)
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
                        >
                          {(Number(formik.values.otherClaimPercentage) || 0).toFixed(2)}
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
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.9rem", sm: "1rem" },
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
                          sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                        >
                          Other Claim Amount
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
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
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                          },
                        }}
                      />
                    )}
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
                  Broker Details
                </Typography>
                <Grid container spacing={{ xs: 2, sm: 3 }}>
                  <Grid item xs={12} md={6}>
                    {dialogMode === "view" ? (
                      <>
                        <Typography
                          variant="subtitle2"
                          color="text.secondary"
                          sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                        >
                          Broker Name
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
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
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.9rem", sm: "1rem" },
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
                          sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                        >
                          Broker Phone
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
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
                          formik.touched.brokerPhone &&
                          formik.errors.brokerPhone
                        }
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.9rem", sm: "1rem" },
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
                          sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                        >
                          Taxable Amount
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
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
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.9rem", sm: "1rem" },
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
                          sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                        >
                          Brokerage (%)
                        </Typography>
                        <Typography
                          sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
                        >
                          {(Number(formik.values.brokeragePercentage) || 0).toFixed(2)}
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
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.9rem", sm: "1rem" },
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
                          sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                        >
                          Brokerage Amount
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
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
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                          },
                        }}
                      />
                    )}
                  </Grid>
                </Grid>
              </Box>
            </>
          </DialogContent>
          <DialogActions sx={{ p: { xs: 1, sm: 2 } }}>
            {dialogMode === "view" ? null : (
              <Button
                color="primary"
                variant="contained"
                onClick={formik.handleSubmit}
                disabled={formik.isSubmitting}
                size="large"
                sx={{
                  minWidth: { xs: "100%", sm: "160px" },
                  height: { xs: "48px", sm: "56px" },
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                }}
              >
                {formik.isSubmitting ? (
                  <CircularProgress size={24} />
                ) : dialogMode === "edit" ? (
                  "Update"
                ) : (
                  "Save"
                )}
              </Button>
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
              Are you sure you want to delete this payment? This action cannot be
              undone.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: { xs: 1, sm: 2 } }}>
            <Button
              onClick={() => setOpenDeleteDialog(false)}
              variant="outlined"
              color="primary"
              size="large"
              sx={{
                minWidth: { xs: "100%", sm: "120px" },
                height: { xs: "48px", sm: "56px" },
                fontSize: { xs: "0.9rem", sm: "1rem" },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              variant="contained"
              color="error"
              size="large"
              startIcon={<Delete />}
              sx={{
                minWidth: { xs: "100%", sm: "120px" },
                height: { xs: "48px", sm: "56px" },
                fontSize: { xs: "0.9rem", sm: "1rem" },
              }}
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
        <Button
            onClick={() => navigate("/parties")}
            startIcon={<ArrowBack />}
            variant="outlined"
            size="medium"
            sx={{
              mt: 2,
              width: { xs: "100%", sm: "auto" },
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
            }}
          >
            Back to All Parties
          </Button>
      </Paper>
    </Container>
  );
};

export default Payment;