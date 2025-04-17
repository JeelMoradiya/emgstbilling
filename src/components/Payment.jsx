import { useState, useEffect } from "react";
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
  Alert,
  TextField,
  TablePagination,
  Modal,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Search,
  ArrowBack,
  CheckCircle,
  Visibility,
  Edit,
  Delete,
} from "@mui/icons-material";
import { toast } from "react-toastify";

const Payment = () => {
  const { partyId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchStartDate, setSearchStartDate] = useState("");
  const [searchEndDate, setSearchEndDate] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [openModal, setOpenModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    chequeNo: "",
    bank: "",
    upiId: "",
    upiName: "",
    rtgsNeft: "",
    amount: "",
    tds: "",
    otherClaim: "",
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [summary, setSummary] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    totalTDS: 0,
    totalOtherClaim: 0,
  });
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [viewPaymentDetails, setViewPaymentDetails] = useState(null);

  // Regex for validations
  const regex = {
    chequeNo: /^[A-Za-z0-9]{6,12}$/,
    bank: /^[A-Za-z\s]{3,50}$/,
    upiId: /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/,
    upiName: /^[A-Za-z\s]{3,50}$/,
    amount: /^\d+(\.\d{1,2})?$/,
    tds: /^\d{1,2}(\.\d{1,2})?$/,
    otherClaim: /^\d+(\.\d{1,2})?$/,
  };

  useEffect(() => {
    if (!currentUser) {
      setError("Please log in to view bills");
      setLoading(false);
      return;
    }

    const fetchBills = async () => {
      try {
        const q = query(
          collection(db, "bills"),
          where("partyId", "==", partyId),
          where("createdBy", "==", currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        const billsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          totalAmount: 0, // Default to 0 if totalAmount is missing
          ...doc.data(),
        }));

        setBills(billsData);
        setFilteredBills(billsData);

        // Calculate summary with fallback for invalid data
        const total = billsData.reduce(
          (sum, bill) => sum + (Number(bill.totalAmount) || 0),
          0
        );
        const paid = billsData
          .filter((bill) => bill.status === "paid")
          .reduce((sum, bill) => sum + (Number(bill.totalAmount) || 0), 0);
        const totalTDS = billsData.reduce(
          (sum, bill) => sum + (Number(bill.paymentDetails?.tds) || 0),
          0
        );
        const totalOtherClaim = billsData.reduce(
          (sum, bill) => sum + (Number(bill.paymentDetails?.otherClaim) || 0),
          0
        );

        setSummary({
          total,
          paid,
          pending: total - paid,
          totalTDS,
          totalOtherClaim,
        });
      } catch (error) {
        console.error("Error fetching bills: ", error);
        setError("Failed to fetch bills: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, [currentUser, partyId]);

  const handleSearch = () => {
    if (!searchStartDate || !searchEndDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    const start = new Date(searchStartDate);
    const end = new Date(searchEndDate);
    end.setHours(23, 59, 59, 999); // Include entire end date

    const filtered = bills.filter((bill) => {
      const billDate = new Date(bill.date);
      return billDate >= start && billDate <= end;
    });

    setFilteredBills(filtered);
    setPage(0);
    setSearchStartDate(""); // Auto-reset start date
    setSearchEndDate(""); // Auto-reset end date
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const validateFields = () => {
    const errors = {};
    if (paymentMethod === "cheque") {
      if (!regex.chequeNo.test(paymentDetails.chequeNo))
        errors.chequeNo = "Invalid cheque number (6-12 alphanumeric characters)";
      if (!regex.bank.test(paymentDetails.bank))
        errors.bank = "Invalid bank name (3-50 alphabetic characters)";
    }
    if (paymentMethod === "upi") {
      if (!regex.upiId.test(paymentDetails.upiId))
        errors.upiId = "Invalid UPI ID";
      if (!regex.upiName.test(paymentDetails.upiName))
        errors.upiName = "Invalid name (3-50 alphabetic characters)";
    }
    if (paymentMethod === "netbanking") {
      if (!regex.bank.test(paymentDetails.bank))
        errors.bank = "Invalid bank name (3-50 alphabetic characters)";
      if (!paymentDetails.rtgsNeft) errors.rtgsNeft = "Select RTGS or NEFT";
    }
    if (!regex.amount.test(paymentDetails.amount))
      errors.amount = "Invalid amount (e.g., 1000.00)";
    if (!paymentDetails.tds || !regex.tds.test(paymentDetails.tds))
      errors.tds = "TDS (%) is required and must be valid (e.g., 10.00)";
    if (paymentDetails.otherClaim && !regex.otherClaim.test(paymentDetails.otherClaim))
      errors.otherClaim = "Invalid other claim amount (e.g., 200.00)";
    return errors;
  };

  const handlePaymentSubmit = async () => {
    const errors = validateFields();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error("Please fix the validation errors");
      return;
    }

    try {
      const billRef = doc(db, "bills", selectedBill.id);
      const paymentData = {
        method: paymentMethod,
        status: "paid",
        date: new Date().toISOString(),
        amount: parseFloat(paymentDetails.amount),
        tds: parseFloat(paymentDetails.tds),
        otherClaim: parseFloat(paymentDetails.otherClaim) || 0,
        ...(paymentMethod === "cheque" && {
          chequeNo: paymentDetails.chequeNo,
          bank: paymentDetails.bank,
        }),
        ...(paymentMethod === "upi" && {
          upiId: paymentDetails.upiId,
          upiName: paymentDetails.upiName,
          bank: paymentDetails.bank || "",
        }),
        ...(paymentMethod === "netbanking" && {
          rtgsNeft: paymentDetails.rtgsNeft,
          bank: paymentDetails.bank,
        }),
      };

      await updateDoc(billRef, { paymentDetails: paymentData, status: "paid" });

      // Update summary
      setSummary((prev) => ({
        ...prev,
        paid: isEditing
          ? prev.paid
          : prev.paid + parseFloat(paymentDetails.amount),
        pending: isEditing
          ? prev.pending
          : prev.pending - parseFloat(paymentDetails.amount),
        totalTDS: isEditing
          ? prev.totalTDS +
            parseFloat(paymentDetails.tds) -
            (Number(selectedBill.paymentDetails?.tds) || 0)
          : prev.totalTDS + parseFloat(paymentDetails.tds),
        totalOtherClaim: isEditing
          ? prev.totalOtherClaim +
            (parseFloat(paymentDetails.otherClaim) || 0) -
            (Number(selectedBill.paymentDetails?.otherClaim) || 0)
          : prev.totalOtherClaim + (parseFloat(paymentDetails.otherClaim) || 0),
      }));

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

      toast.success(
        isEditing ? "Payment updated successfully" : "Payment recorded successfully"
      );
      setOpenModal(false);
      setPaymentDetails({
        chequeNo: "",
        bank: "",
        upiId: "",
        upiName: "",
        rtgsNeft: "",
        amount: "",
        tds: "",
        otherClaim: "",
      });
      setValidationErrors({});
      setIsEditing(false);
      setPaymentMethod("");
    } catch (error) {
      console.error("Error recording payment: ", error);
      toast.error("Failed to record payment: " + error.message);
    }
  };

  const handleOpenModal = (bill, edit = false) => {
    if (!bill || typeof bill.totalAmount !== "number") {
      toast.error("Invalid bill data. Total amount is missing.");
      return;
    }

    setSelectedBill(bill);
    setOpenModal(true);
    setIsEditing(edit);
    setPaymentMethod(edit ? bill.paymentDetails?.method || "" : "");
    setPaymentDetails({
      chequeNo: edit ? bill.paymentDetails?.chequeNo || "" : "",
      bank: edit ? bill.paymentDetails?.bank || "" : "",
      upiId: edit ? bill.paymentDetails?.upiId || "" : "",
      upiName: edit ? bill.paymentDetails?.upiName || "" : "",
      rtgsNeft: edit ? bill.paymentDetails?.rtgsNeft || "" : "",
      amount: (Number(bill.totalAmount) || 0).toFixed(2), // Ensure valid number
      tds: edit ? bill.paymentDetails?.tds?.toString() || "" : "",
      otherClaim: edit ? bill.paymentDetails?.otherClaim?.toString() || "" : "",
    });
  };

  const handleViewPayment = (bill) => {
    setViewPaymentDetails(bill.paymentDetails);
    setOpenViewDialog(true);
  };

  const handleDeletePayment = async (billId) => {
    try {
      const billRef = doc(db, "bills", billId);
      const bill = bills.find((b) => b.id === billId);
      const tds = Number(bill.paymentDetails?.tds) || 0;
      const otherClaim = Number(bill.paymentDetails?.otherClaim) || 0;
      const amount = Number(bill.paymentDetails?.amount) || 0;

      await updateDoc(billRef, {
        paymentDetails: null,
        status: "pending",
      });

      setBills((prev) =>
        prev.map((bill) =>
          bill.id === billId ? { ...bill, paymentDetails: null, status: "pending" } : bill
        )
      );
      setFilteredBills((prev) =>
        prev.map((bill) =>
          bill.id === billId ? { ...bill, paymentDetails: null, status: "pending" } : bill
        )
      );
      setSummary((prev) => ({
        ...prev,
        paid: prev.paid - amount,
        pending: prev.pending + amount,
        totalTDS: prev.totalTDS - tds,
        totalOtherClaim: prev.totalOtherClaim - otherClaim,
      }));

      toast.success("Payment deleted successfully");
    } catch (error) {
      console.error("Error deleting payment: ", error);
      toast.error("Failed to delete payment: " + error.message);
    }
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, px: { xs: 1, sm: 2 } }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography
            variant="h5"
            sx={{ fontWeight: "bold", color: "primary.main" }}
          >
            Party Bills
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate("/parties")}
            sx={{ textTransform: "none" }}
          >
            Back to All Parties
          </Button>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "primary.light",
                textAlign: "center",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Total TDS & Other Claim
              </Typography>
              <Typography variant="h6">
                ₹{(Number(summary.totalTDS) + Number(summary.totalOtherClaim) || 0).toFixed(2)}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "#e6f3ff",
                textAlign: "center",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Total TDS
              </Typography>
              <Typography variant="h6">
                {(Number(summary.totalTDS) || 0).toFixed(2)}%
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "#fff3e0",
                textAlign: "center",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Total Other Claim
              </Typography>
              <Typography variant="h6">
                ₹{(Number(summary.totalOtherClaim) || 0).toFixed(2)}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Search Section */}
        <Box sx={{ display: "flex", mb: 3, gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
          <TextField
            type="date"
            value={searchStartDate}
            onChange={(e) => setSearchStartDate(e.target.value)}
            sx={{ flex: 1 }}
            InputLabelProps={{ shrink: true }}
            label="Start Date"
          />
          <TextField
            type="date"
            value={searchEndDate}
            onChange={(e) => setSearchEndDate(e.target.value)}
            sx={{ flex: 1 }}
            InputLabelProps={{ shrink: true }}
            label="End Date"
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleSearch}
            startIcon={<Search />}
            sx={{ height: "56px" }}
          >
            Search
          </Button>
        </Box>

        {/* Bills Table */}
        <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "primary.light" }}>
                <TableCell sx={{ fontWeight: "bold" }}>Bill No</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Date</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>TDS</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Other Claim</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBills.length > 0 ? (
                filteredBills
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((bill) => (
                    <TableRow key={bill.id} hover>
                      <TableCell>{bill.billNo || "N/A"}</TableCell>
                      <TableCell>
                        {new Date(bill.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        ₹{(Number(bill.totalAmount) || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {(Number(bill.paymentDetails?.tds) || 0).toFixed(2)}%
                      </TableCell>
                      <TableCell>
                        ₹{(Number(bill.paymentDetails?.otherClaim) || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={bill.status}
                          color={bill.status === "paid" ? "success" : "warning"}
                        />
                      </TableCell>
                      <TableCell>
                        {bill.status !== "paid" ? (
                          <Button
                            variant="outlined"
                            color="primary"
                            onClick={() => handleOpenModal(bill)}
                          >
                            Pay
                          </Button>
                        ) : (
                          <>
                            <IconButton
                              color="primary"
                              onClick={() => handleViewPayment(bill)}
                            >
                              <Visibility />
                            </IconButton>
                            <IconButton
                              color="primary"
                              onClick={() => handleOpenModal(bill, true)}
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              color="error"
                              onClick={() => handleDeletePayment(bill.id)}
                            >
                              <Delete />
                            </IconButton>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body1" sx={{ py: 3 }}>
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
        />

        {/* Payment Modal */}
        <Modal open={openModal} onClose={() => setOpenModal(false)}>
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              bgcolor: "background.paper",
              p: 4,
              borderRadius: 2,
              width: { xs: "90%", sm: 400 },
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              {isEditing ? "Edit Payment" : "Record Payment"}
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                label="Payment Method"
                disabled={isEditing}
                required
              >
                <MenuItem value="cheque">Cheque</MenuItem>
                <MenuItem value="upi">UPI</MenuItem>
                <MenuItem value="netbanking">Net Banking</MenuItem>
                <MenuItem value="cash">Cash</MenuItem>
              </Select>
            </FormControl>

            {paymentMethod === "cheque" && (
              <>
                <TextField
                  fullWidth
                  label="Cheque Number"
                  value={paymentDetails.chequeNo}
                  onChange={(e) =>
                    setPaymentDetails({
                      ...paymentDetails,
                      chequeNo: e.target.value,
                    })
                  }
                  error={!!validationErrors.chequeNo}
                  helperText={validationErrors.chequeNo}
                  sx={{ mb: 2 }}
                  required
                />
                <TextField
                  fullWidth
                  label="Bank Name"
                  value={paymentDetails.bank}
                  onChange={(e) =>
                    setPaymentDetails({
                      ...paymentDetails,
                      bank: e.target.value,
                    })
                  }
                  error={!!validationErrors.bank}
                  helperText={validationErrors.bank}
                  sx={{ mb: 2 }}
                  required
                />
              </>
            )}

            {paymentMethod === "upi" && (
              <>
                <TextField
                  fullWidth
                  label="UPI ID"
                  value={paymentDetails.upiId}
                  onChange={(e) =>
                    setPaymentDetails({
                      ...paymentDetails,
                      upiId: e.target.value,
                    })
                  }
                  error={!!validationErrors.upiId}
                  helperText={validationErrors.upiId}
                  sx={{ mb: 2 }}
                  required
                />
                <TextField
                  fullWidth
                  label="Name"
                  value={paymentDetails.upiName}
                  onChange={(e) =>
                    setPaymentDetails({
                      ...paymentDetails,
                      upiName: e.target.value,
                    })
                  }
                  error={!!validationErrors.upiName}
                  helperText={validationErrors.upiName}
                  sx={{ mb: 2 }}
                  required
                />
                <TextField
                  fullWidth
                  label="Bank Name (Optional)"
                  value={paymentDetails.bank}
                  onChange={(e) =>
                    setPaymentDetails({
                      ...paymentDetails,
                      bank: e.target.value,
                    })
                  }
                  sx={{ mb: 2 }}
                />
              </>
            )}

            {paymentMethod === "netbanking" && (
              <>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>RTGS/NEFT</InputLabel>
                  <Select
                    value={paymentDetails.rtgsNeft}
                    onChange={(e) =>
                      setPaymentDetails({
                        ...paymentDetails,
                        rtgsNeft: e.target.value,
                      })
                    }
                    label="RTGS/NEFT"
                    error={!!validationErrors.rtgsNeft}
                    required
                  >
                    <MenuItem value="RTGS">RTGS</MenuItem>
                    <MenuItem value="NEFT">NEFT</MenuItem>
                  </Select>
                  {validationErrors.rtgsNeft && (
                    <Typography color="error" variant="caption">
                      {validationErrors.rtgsNeft}
                    </Typography>
                  )}
                </FormControl>
                <TextField
                  fullWidth
                  label="Bank Name"
                  value={paymentDetails.bank}
                  onChange={(e) =>
                    setPaymentDetails({
                      ...paymentDetails,
                      bank: e.target.value,
                    })
                  }
                  error={!!validationErrors.bank}
                  helperText={validationErrors.bank}
                  sx={{ mb: 2 }}
                  required
                />
              </>
            )}

            {paymentMethod && (
              <>
                <TextField
                  fullWidth
                  label="Amount"
                  value={paymentDetails.amount}
                  onChange={(e) =>
                    setPaymentDetails({
                      ...paymentDetails,
                      amount: e.target.value,
                    })
                  }
                  error={!!validationErrors.amount}
                  helperText={validationErrors.amount}
                  sx={{ mb: 2 }}
                  required
                  disabled // Auto-populated, non-editable
                />
                <TextField
                  fullWidth
                  label="TDS (%)"
                  value={paymentDetails.tds}
                  onChange={(e) =>
                    setPaymentDetails({
                      ...paymentDetails,
                      tds: e.target.value,
                    })
                  }
                  error={!!validationErrors.tds}
                  helperText={validationErrors.tds}
                  sx={{ mb: 2 }}
                  required
                />
                <TextField
                  fullWidth
                  label="Other Claim Amount (Optional)"
                  value={paymentDetails.otherClaim}
                  onChange={(e) =>
                    setPaymentDetails({
                      ...paymentDetails,
                      otherClaim: e.target.value,
                    })
                  }
                  error={!!validationErrors.otherClaim}
                  helperText={validationErrors.otherClaim}
                  sx={{ mb: 2 }}
                />
              </>
            )}

            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => setOpenModal(false)}
                sx={{ textTransform: "none" }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handlePaymentSubmit}
                sx={{ textTransform: "none" }}
                startIcon={<CheckCircle />}
              >
                {isEditing ? "Update Payment" : "Add Payment"}
              </Button>
            </Box>
          </Box>
        </Modal>

        {/* View Payment Dialog */}
        <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)}>
          <DialogTitle>Payment Details</DialogTitle>
          <DialogContent>
            {viewPaymentDetails ? (
              <>
                <Typography>
                  <strong>Method:</strong>{" "}
                  {viewPaymentDetails.method.charAt(0).toUpperCase() +
                    viewPaymentDetails.method.slice(1)}
                </Typography>
                <Typography>
                  <strong>Amount:</strong> ₹
                  {(Number(viewPaymentDetails.amount) || 0).toFixed(2)}
                </Typography>
                <Typography>
                  <strong>TDS (%):</strong>{" "}
                  {(Number(viewPaymentDetails.tds) || 0).toFixed(2)}
                </Typography>
                <Typography>
                  <strong>Other Claim:</strong> ₹
                  {(Number(viewPaymentDetails.otherClaim) || 0).toFixed(2)}
                </Typography>
                <Typography>
                  <strong>Date:</strong>{" "}
                  {new Date(viewPaymentDetails.date).toLocaleString()}
                </Typography>
                {viewPaymentDetails.method === "cheque" && (
                  <>
                    <Typography>
                      <strong>Cheque No:</strong> {viewPaymentDetails.chequeNo}
                    </Typography>
                    <Typography>
                      <strong>Bank:</strong> {viewPaymentDetails.bank}
                    </Typography>
                  </>
                )}
                {viewPaymentDetails.method === "upi" && (
                  <>
                    <Typography>
                      <strong>UPI ID:</strong> {viewPaymentDetails.upiId}
                    </Typography>
                    <Typography>
                      <strong>Name:</strong> {viewPaymentDetails.upiName}
                    </Typography>
                    {viewPaymentDetails.bank && (
                      <Typography>
                        <strong>Bank:</strong> {viewPaymentDetails.bank}
                      </Typography>
                    )}
                  </>
                )}
                {viewPaymentDetails.method === "netbanking" && (
                  <>
                    <Typography>
                      <strong>RTGS/NEFT:</strong> {viewPaymentDetails.rtgsNeft}
                    </Typography>
                    <Typography>
                      <strong>Bank:</strong> {viewPaymentDetails.bank}
                    </Typography>
                  </>
                )}
              </>
            ) : (
              <Typography>No payment details available</Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setOpenViewDialog(false)}
              sx={{ textTransform: "none" }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
};

export default Payment;