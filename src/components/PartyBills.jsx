import React, { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
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
  Box,
  TextField,
  TablePagination,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
} from "@mui/material";
import { ArrowBack, Add, Search, Refresh } from "@mui/icons-material";
import { format, isWithinInterval, parseISO } from "date-fns";

const PartyBills = () => {
  const { partyId } = useParams();
  const location = useLocation();

  // Initialize filter states from localStorage or defaults
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [party, setParty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(
    localStorage.getItem(`partyBills_${partyId}_startDate`) || ""
  );
  const [endDate, setEndDate] = useState(
    localStorage.getItem(`partyBills_${partyId}_endDate`) || ""
  );
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [statusFilter, setStatusFilter] = useState(
    localStorage.getItem(`partyBills_${partyId}_statusFilter`) || "All"
  );
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Handle success messages via query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get("action");
    if (action === "edited") {
      setSnackbar({
        open: true,
        message: "Bill edited successfully!",
        severity: "success",
      });
    } else if (action === "deleted") {
      setSnackbar({
        open: true,
        message: "Bill deleted successfully!",
        severity: "success",
      });
    }
  }, [location.search]);

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
    // Clear query params
    window.history.replaceState({}, "", location.pathname);
  };

  useEffect(() => {
    const fetchBillsAndParty = async () => {
      try {
        // Fetch party details
        const partyQuery = query(
          collection(db, "parties"),
          where("__name__", "==", partyId)
        );
        const partySnapshot = await getDocs(partyQuery);
        if (!partySnapshot.empty) {
          setParty({
            id: partySnapshot.docs[0].id,
            ...partySnapshot.docs[0].data(),
          });
        }

        // Fetch bills
        const billsQuery = query(
          collection(db, "bills"),
          where("partyId", "==", partyId)
        );
        const billsSnapshot = await getDocs(billsQuery);
        const billsData = billsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          total: Number(doc.data().total) || 0, // Ensure total is a number
        }));
        // Sort bills by billNo
        const sortedBills = billsData.sort((a, b) =>
          String(a.billNo || "").localeCompare(String(b.billNo || ""))
        );
        setBills(sortedBills);
        setFilteredBills(sortedBills); // Default: show all bills
      } catch (error) {
        console.error("Error fetching data: ", error);
        setSnackbar({
          open: true,
          message: "Failed to fetch bills.",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBillsAndParty();
  }, [partyId]);

  // Save filter preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(`partyBills_${partyId}_startDate`, startDate);
    localStorage.setItem(`partyBills_${partyId}_endDate`, endDate);
    localStorage.setItem(`partyBills_${partyId}_statusFilter`, statusFilter);
  }, [startDate, endDate, statusFilter, partyId]);

  const applyFilters = () => {
    let filtered = [...bills];

    // Apply status filter
    if (statusFilter === "Paid") {
      filtered = filtered.filter((bill) => bill.status === "paid");
    } else if (statusFilter === "Pending") {
      filtered = filtered.filter((bill) => bill.status === "pending");
    }
    // "All" shows both paid and pending (no filtering by status)

    // Apply date range filter only if both dates are selected
    if (startDate && endDate && isFilterApplied) {
      filtered = filtered.filter((bill) => {
        try {
          const billDate = parseISO(bill.date);
          const start = parseISO(startDate);
          const end = parseISO(endDate);
          return isWithinInterval(billDate, { start, end });
        } catch (error) {
          console.error("Date parsing error:", error);
          return false; // Exclude bill if date parsing fails
        }
      });
    }

    setFilteredBills(filtered);
    setPage(0); // Reset to first page after filtering
  };

  const handleSearch = () => {
    if (startDate && endDate) {
      setIsFilterApplied(true);
      applyFilters();
    } else {
      // If dates are not fully selected, show all bills with status filter only
      setIsFilterApplied(false);
      applyFilters();
    }
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    setStatusFilter("All");
    setIsFilterApplied(false);
    setFilteredBills(bills); // Reset to all bills
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

  // Auto-reset if both dates are cleared
  useEffect(() => {
    if (!startDate && !endDate) {
      setIsFilterApplied(false);
      setFilteredBills(bills);
      setPage(0);
    }
  }, [startDate, endDate, bills]);

  // Re-apply filters when status changes
  useEffect(() => {
    applyFilters();
  }, [bills, statusFilter]);

  if (loading) {
    return (
      <Container
        maxWidth="lg"
        sx={{
          mt: { xs: 2, sm: 3, md: 4 },
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "80vh",
        }}
      >
        <CircularProgress size={48} />
      </Container>
    );
  }

  if (!party) {
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
            variant="h6"
            color="error"
            sx={{ fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" } }}
          >
            Party not found
          </Typography>
          <Button
            component={Link}
            to="/parties"
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
  }

  const summary = {
    total: filteredBills.reduce((sum, bill) => sum + (bill.total || 0), 0),
    paid: filteredBills
      .filter((bill) => bill.status === "paid")
      .reduce((sum, bill) => sum + (bill.total || 0), 0),
    pending: filteredBills
      .filter((bill) => bill.status === "pending")
      .reduce((sum, bill) => sum + (bill.total || 0), 0),
  };

  return (
    <Container
      maxWidth="lg"
      sx={{
        mt: { xs: 2, sm: 3, md: 4 },
        mb: { xs: 2, sm: 3, md: 4 },
        px: { xs: 1, sm: 2 },
      }}
    >
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

        {/* Summary Section */}
        <Grid
          container
          spacing={{ xs: 1, sm: 2 }}
          sx={{ mb: { xs: 3, sm: 4 } }}
        >
          <Grid item xs={12} sm={4}>
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

        {/* Filter and Table Section */}
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
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              flexGrow: 1,
              flexWrap: "wrap",
            }}
          >
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{
                minWidth: { xs: "100%", sm: 150 },
                "& .MuiInputBase-root": {
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                },
                "& .MuiInputLabel-root": {
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                },
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
                minWidth: { xs: "100%", sm: 150 },
                "& .MuiInputBase-root": {
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                },
                "& .MuiInputLabel-root": {
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                },
              }}
            />
            <FormControl
              size="small"
              sx={{
                minWidth: { xs: "100%", sm: 120 },
              }}
            >
              <InputLabel sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                Status
              </InputLabel>
              <Select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                label="Status"
                sx={{
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                }}
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
              startIcon={<Search />}
              size="medium"
              sx={{
                width: { xs: "100%", sm: "auto" },
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              }}
            >
              Search
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleReset}
              startIcon={<Refresh />}
              size="medium"
              sx={{
                width: { xs: "100%", sm: "auto" },
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              }}
            >
              Reset
            </Button>
          </Box>
          <Button
            variant="contained"
            color="primary"
            component={Link}
            to={`/add-bill/${partyId}`}
            startIcon={<Add />}
            size="medium"
            sx={{
              width: { xs: "100%", sm: "auto" },
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
            }}
          >
            Add New Bill
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
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    px: { xs: 1, sm: 2 },
                  }}
                >
                  Bill No
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    px: { xs: 1, sm: 2 },
                  }}
                >
                  Date
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    px: { xs: 1, sm: 2 },
                  }}
                >
                  Amount
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    px: { xs: 1, sm: 2 },
                  }}
                >
                  Status
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    px: { xs: 1, sm: 2 },
                  }}
                >
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
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          px: { xs: 1, sm: 2 },
                        }}
                      >
                        {bill.billNo}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          px: { xs: 1, sm: 2 },
                        }}
                      >
                        {bill.date
                          ? format(parseISO(bill.date), "dd-MM-yyyy")
                          : "N/A"}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          px: { xs: 1, sm: 2 },
                        }}
                      >
                        ₹{(Number(bill.total) || 0).toFixed(2)}
                      </TableCell>
                      <TableCell sx={{ px: { xs: 1, sm: 2 } }}>
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
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ px: { xs: 1, sm: 2 } }}>
                        <Button
                          component={Link}
                          to={`/bill/${bill.id}`}
                          variant="outlined"
                          color="primary"
                          size="medium"
                          sx={{
                            width: { xs: "100%", sm: "auto" },
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    <Typography
                      variant="body1"
                      sx={{
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

        <Box sx={{ mt: 3 }}>
          <Button
            component={Link}
            to="/parties"
            startIcon={<ArrowBack />}
            variant="outlined"
            color="primary"
            size="medium"
            sx={{
              width: { xs: "100%", sm: "auto" },
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
            }}
          >
            Back to All Parties
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default PartyBills;
