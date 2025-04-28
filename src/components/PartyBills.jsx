import React, { useState, useEffect } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
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
  Chip,
  CircularProgress,
  InputLabel,
  Box,
  TextField,
  TablePagination,
  Grid,
  Select,
  MenuItem,
  FormControl,
  Snackbar,
  Alert,
  IconButton,
  Menu,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Fab,
} from "@mui/material";
import {
  ArrowBack,
  Search,
  MoreVert,
  Visibility,
  Download,
  Edit,
  Print,
  Share,
  Delete as DeleteIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { format, isWithinInterval, parseISO } from "date-fns";
import logo from "../assets/logo.gif";

const PartyBills = () => {
  const { partyId } = useParams();
  const location = useLocation();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [party, setParty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [statusFilter, setStatusFilter] = useState("All");
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedBillId, setSelectedBillId] = useState(null);
  const [selectedBills, setSelectedBills] = useState([]);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [billToDelete, setBillToDelete] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get("action");
    if (action === "edited") {
      setSnackbar({ open: true, message: "Bill edited successfully!", severity: "success" });
    } else if (action === "deleted") {
      setSnackbar({ open: true, message: "Bill deleted successfully!", severity: "success" });
    }
  }, [location.search]);

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
    window.history.replaceState({}, "", location.pathname);
  };

  useEffect(() => {
    const fetchBillsAndParty = async () => {
      if (!currentUser) {
        setSnackbar({ open: true, message: "Please log in to view bills.", severity: "error" });
        setLoading(false);
        return;
      }
      try {
        const partyQuery = query(
          collection(db, "parties"),
          where("__name__", "==", partyId),
          where("createdBy", "==", currentUser.uid)
        );
        const partySnapshot = await getDocs(partyQuery);
        if (!partySnapshot.empty) {
          setParty({ id: partySnapshot.docs[0].id, ...partySnapshot.docs[0].data() });
        } else {
          setSnackbar({
            open: true,
            message: "Party not found or you lack permission.",
            severity: "error",
          });
          setLoading(false);
          return;
        }
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
          total: Number(doc.data().total) || 0,
          status: doc.data().status || "pending",
          partyDetails: doc.data().partyDetails || {},
        }));
        const sortedBills = billsData.sort((a, b) => String(a.billNo || "").localeCompare(String(b.billNo || "")));
        setBills(sortedBills);
        setFilteredBills(sortedBills);
      } catch (error) {
        console.error("Error fetching data: ", error);
        setSnackbar({ open: true, message: "Failed to fetch bills: " + error.message, severity: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchBillsAndParty();
  }, [partyId, currentUser]);

  const applyFilters = () => {
    let filtered = [...bills];
    if (statusFilter === "Paid") {
      filtered = filtered.filter((bill) => bill.status === "paid");
    } else if (statusFilter === "Pending") {
      filtered = filtered.filter((bill) => bill.status === "pending");
    }
    if (startDate && endDate && isFilterApplied) {
      filtered = filtered.filter((bill) => {
        try {
          const billDate = parseISO(bill.date);
          const start = parseISO(startDate);
          const end = parseISO(endDate);
          return isWithinInterval(billDate, { start, end });
        } catch (error) {
          console.error("Date parsing error:", error);
          return false;
        }
      });
    }
    setFilteredBills(filtered);
    setPage(0);
  };

  const handleSearch = () => {
    if (startDate && endDate) {
      setIsFilterApplied(true);
    } else {
      setIsFilterApplied(false);
    }
    applyFilters();
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    setStatusFilter("All");
    setIsFilterApplied(false);
    setFilteredBills(bills);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
  };

  useEffect(() => {
    if (!startDate && !endDate) {
      setIsFilterApplied(false);
      setFilteredBills(bills);
      setPage(0);
    }
  }, [startDate, endDate, bills]);

  useEffect(() => {
    applyFilters();
  }, [bills, statusFilter]);

  const handleMenuOpen = (event, billId) => {
    setAnchorEl(event.currentTarget);
    setSelectedBillId(billId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedBillId(null);
  };

  const handleSelectBill = (billId) => {
    setSelectedBills((prev) =>
      prev.includes(billId) ? prev.filter((id) => id !== billId) : [...prev, billId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedBills.length === 0) {
      setSnackbar({ open: true, message: "Please select at least one bill", severity: "error" });
      return;
    }
    try {
      for (const billId of selectedBills) {
        await deleteDoc(doc(db, "bills", billId));
      }
      setBills((prev) => prev.filter((bill) => !selectedBills.includes(bill.id)));
      setFilteredBills((prev) => prev.filter((bill) => !selectedBills.includes(bill.id)));
      setSelectedBills([]);
      setSnackbar({ open: true, message: "Selected bills deleted successfully", severity: "success" });
    } catch (error) {
      console.error("Error deleting bills: ", error);
      setSnackbar({ open: true, message: "Failed to delete bills: " + error.message, severity: "error" });
    }
  };

  const handleDelete = (billId) => {
    setBillToDelete(billId);
    setOpenDeleteDialog(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, "bills", billToDelete));
      setBills((prev) => prev.filter((bill) => bill.id !== billToDelete));
      setFilteredBills((prev) => prev.filter((bill) => bill.id !== billToDelete));
      setSnackbar({ open: true, message: "Bill deleted successfully", severity: "success" });
      setOpenDeleteDialog(false);
      setBillToDelete(null);
    } catch (error) {
      console.error("Error deleting bill: ", error);
      setSnackbar({ open: true, message: "Failed to delete bill: " + error.message, severity: "error" });
    }
  };

  const handleViewBill = (billId) => {
    navigate(`/bill/${billId}`);
  };

  const handleEditBill = (billId) => {
    navigate(`/bill/${billId}?action=edit`);
  };

  const handleDownload = (billId) => {
    setSnackbar({ open: true, message: "Download feature coming soon!", severity: "info" });
  };

  const handlePrint = (billId) => {
    setSnackbar({ open: true, message: "Print feature coming soon!", severity: "info" });
  };

  const handleShare = (billId) => {
    setSnackbar({ open: true, message: "Share via WhatsApp feature coming soon!", severity: "info" });
  };

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

  if (!party) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, px: { xs: 1, sm: 2 } }}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 2, width: "100%" }}>
          <Typography
            variant="h6"
            color="error"
            sx={{ fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" } }}
          >
            Party not found or you lack permission
          </Typography>
          <Button
            component={Link}
            to="/parties"
            startIcon={<ArrowBack />}
            variant="outlined"
            size="medium"
            sx={{ mt: 2, width: { xs: "100%", sm: "auto" }, fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
          >
            Back to All Parties
          </Button>
        </Paper>
      </Container>
    );
  }

  const summary = {
    total: filteredBills.reduce((sum, bill) => sum + (bill.total || 0), 0),
    paid: filteredBills.filter((bill) => bill.status === "paid").reduce((sum, bill) => sum + (bill.total || 0), 0),
    pending: filteredBills
      .filter((bill) => bill.status === "pending")
      .reduce((sum, bill) => sum + (bill.total || 0), 0),
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, px: { xs: 1, sm: 2 } }}>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 2, width: "100%" }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: "bold",
            color: "primary.main",
            mb: 4,
            fontSize: { xs: "1.25rem", sm: "1.5rem", md: "1.75rem" },
          }}
        >
          Bills for {party.companyName || party.partyName} ({party.gstNo})
        </Typography>
        <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: { xs: 3, sm: 4 } }}>
          <Grid item xs={12} sm={4}>
            <Box
              sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, bgcolor: "primary.light", textAlign: "center" }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
              >
                Total
              </Typography>
              <Typography
                variant="h6"
                sx={{ fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" } }}
              >
                ₹{summary.total.toFixed(2)}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box
              sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, bgcolor: "#e6f3ff", textAlign: "center" }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
              >
                Paid
              </Typography>
              <Typography
                variant="h6"
                sx={{ fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" } }}
              >
                ₹{summary.paid.toFixed(2)}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box
              sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, bgcolor: "#fff3e0", textAlign: "center" }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
              >
                Pending
              </Typography>
              <Typography
                variant="h6"
                sx={{ fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" } }}
              >
                ₹{summary.pending.toFixed(2)}
              </Typography>
            </Box>
          </Grid>
        </Grid>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            mb: 3,
            alignItems: { xs: "stretch", sm: "center" },
            flexWrap: "wrap",
            gap: { xs: 2, sm: 2 },
          }}
        >
          <Box
            sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, flexGrow: 1 }}
          >
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{
                minWidth: { xs: "100%", sm: 250 },
                "& .MuiInputBase-root": { fontSize: { xs: "0.75rem", sm: "0.875rem" } },
              }}
            />
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{
                minWidth: { xs: "100%", sm: 250 },
                "& .MuiInputBase-root": { fontSize: { xs: "0.75rem", sm: "0.875rem" } },
              }}
            />
            <FormControl sx={{ minWidth: { xs: "100%", sm: 250 } }}>
              <InputLabel sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                label="Status"
                size="small"
                sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
              >
                <MenuItem value="All">All</MenuItem>
                <MenuItem value="Paid">Paid</MenuItem>
                <MenuItem value="Pending">Pending</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSearch}
              size="small"
              sx={{
                minWidth: { xs: "100%", sm: "100px" },
                height: { xs: "40px", sm: "40px" },
                fontSize: { xs: "0.9rem", sm: "1rem" },
              }}
            >
              <Search />
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleReset}
              size="small"
              sx={{
                minWidth: { xs: "100%", sm: "100px" },
                height: { xs: "40px", sm: "40px" },
                fontSize: { xs: "0.9rem", sm: "1rem" },
              }}
            >
              Reset
            </Button>
          </Box>
          {selectedBills.length > 0 && (
            <Button
              variant="contained"
              color="error"
              onClick={handleBulkDelete}
              size="small"
              sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" }, minWidth: { xs: "100%", sm: 150 } }}
            >
              Delete Selected
            </Button>
          )}
        </Box>
        <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2, maxWidth: "100%", overflowX: "auto" }}>
          <Table sx={{ minWidth: { xs: 300, sm: 650 } }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: "primary.light" }}>
                <TableCell>
                  <Checkbox
                    checked={selectedBills.length === filteredBills.length && filteredBills.length > 0}
                    onChange={() =>
                      setSelectedBills(
                        selectedBills.length === filteredBills.length
                          ? []
                          : filteredBills.map((bill) => bill.id)
                      )
                    }
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: "bold", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                  Invoice No
                </TableCell>
                <TableCell sx={{ fontWeight: "bold", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                  Date
                </TableCell>
                <TableCell sx={{ fontWeight: "bold", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                  Amount
                </TableCell>
                <TableCell sx={{ fontWeight: "bold", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                  Status
                </TableCell>
                <TableCell sx={{ fontWeight: "bold", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBills.length > 0 ? (
                filteredBills
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((bill) => (
                    <TableRow key={bill.id} hover>
                      <TableCell>
                        <Checkbox
                          checked={selectedBills.includes(bill.id)}
                          onChange={() => handleSelectBill(bill.id)}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                        {bill.billNo}
                      </TableCell>
                      <TableCell sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                        {format(parseISO(bill.date), "dd-MM-yyyy")}
                      </TableCell>
                      <TableCell sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                        ₹{bill.total.toFixed(2)}
                      </TableCell>
                      <TableCell sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                        <Chip
                          label={bill.status.toUpperCase()}
                          color={bill.status === "paid" ? "success" : "warning"}
                          size="small"
                          sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton onClick={(e) => handleMenuOpen(e, bill.id)} size="small">
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
                          >
                            <Visibility sx={{ mr: 1 }} /> View
                          </MenuItem>
                          <MenuItem
                            onClick={() => {
                              handleDownload(bill.id);
                              handleMenuClose();
                            }}
                          >
                            <Download sx={{ mr: 1 }} /> Download
                          </MenuItem>
                          <MenuItem
                            onClick={() => {
                              handleEditBill(bill.id);
                              handleMenuClose();
                            }}
                          >
                            <Edit sx={{ mr: 1 }} /> Edit
                          </MenuItem>
                          <MenuItem
                            onClick={() => {
                              handlePrint(bill.id);
                              handleMenuClose();
                            }}
                          >
                            <Print sx={{ mr: 1 }} /> Print
                          </MenuItem>
                          <MenuItem
                            onClick={() => {
                              handleShare(bill.id);
                              handleMenuClose();
                            }}
                          >
                            <Share sx={{ mr: 1 }} /> Share
                          </MenuItem>
                          <MenuItem
                            onClick={() => {
                              handleDelete(bill.id);
                              handleMenuClose();
                            }}
                          >
                            <DeleteIcon sx={{ mr: 1 }} /> Delete
                          </MenuItem>
                        </Menu>
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography
                      variant="body1"
                      sx={{ py: 3, color: "text.secondary", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
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
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredBills.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{ mt: 2, "& .MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows": { fontSize: { xs: "0.75rem", sm: "0.875rem" } } }}
        />
        <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Button
            component={Link}
            to="/parties"
            startIcon={<ArrowBack />}
            variant="outlined"
            size="medium"
            sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
          >
            Back to All Parties
          </Button>
        </Box>
        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: "fixed", bottom: 16, right: 16 }}
          onClick={() => navigate("/add-gst-bill")}
        >
          <AddIcon />
        </Fab>
      </Paper>

      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: "error.main", color: "white", py: 2, fontSize: { xs: "1rem", sm: "1.25rem" } }}>
          Confirm Delete
        </DialogTitle>
        <DialogContent sx={{ mt: 2, px: { xs: 2, sm: 3 } }}>
          <Typography variant="body1" sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}>
            Are you sure you want to delete this bill? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: { xs: 1, sm: 2 } }}>
          <Button
            onClick={() => setOpenDeleteDialog(false)}
            variant="outlined"
            color="primary"
            size="small"
            sx={{ minWidth: { xs: "100%", sm: "160px" }, fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            variant="contained"
            color="error"
            size="small"
            sx={{ minWidth: { xs: "100%", sm: "160px" }, fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
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
          sx={{ width: "100%", fontSize: { xs: "0.85rem", sm: "0.95rem" } }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default PartyBills;