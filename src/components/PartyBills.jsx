import React, { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
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
  Box,
  TextField,
  InputLabel,
  TablePagination,
  Grid,
  Select,
  MenuItem,
  FormControl,
  Snackbar,
  Alert,
  IconButton,
  Menu,
} from "@mui/material";
import { ArrowBack, Add, Search, Refresh, MoreVert } from "@mui/icons-material";
import { format, isWithinInterval, parseISO } from "date-fns";
import logo from "../assets/logo.gif"

const PartyBills = () => {
  const { partyId } = useParams();
  const location = useLocation();
  const { currentUser } = useAuth();
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
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedBillId, setSelectedBillId] = useState(null);

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
    window.history.replaceState({}, "", location.pathname);
  };

  useEffect(() => {
    const fetchBillsAndParty = async () => {
      if (!currentUser) {
        setSnackbar({
          open: true,
          message: "Please log in to view bills.",
          severity: "error",
        });
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
          setParty({
            id: partySnapshot.docs[0].id,
            ...partySnapshot.docs[0].data(),
          });
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
          ...doc.data(),
          total: Number(doc.data().total) || 0,
        }));
        const sortedBills = billsData.sort((a, b) =>
          String(a.billNo || "").localeCompare(String(b.billNo || ""))
        );
        setBills(sortedBills);
        setFilteredBills(sortedBills);
      } catch (error) {
        console.error("Error fetching data: ", error);
        setSnackbar({
          open: true,
          message: "Failed to fetch bills: " + error.message,
          severity: "error",
        });
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
            Party not found or you lack permission
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
                minWidth: { xs: "100%", sm: 250 },
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
                minWidth: { xs: "100%", sm: 250 },
                "& .MuiInputBase-root": {
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                },
                "& .MuiInputLabel-root": {
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                },
              }}
            />
            <FormControl
              sx={{
                minWidth: { xs: "100%", sm: 250 },
              }}
            >
              <InputLabel sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                Status
              </InputLabel>
              <Select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                label="Status"
                size="small"
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
              size="small"
              sx={{
                minWidth: { xs: "100%", sm: "100px" },
                height: { xs: "40px", sm: "40px" },
                fontSize: { xs: "0.9rem", sm: "1rem" },
                textTransform: "none",
              }}
            >
              <Search />
            </Button>
          </Box>
          <Button
            variant="contained"
            color="primary"
            component={Link}
            to={`/add-bill/${partyId}`}
            startIcon={<Add />}
            size="small"
            sx={{
              minWidth: { xs: "100%", sm: "100px" },
              height: { xs: "40px", sm: "40px" },
              fontSize: { xs: "0.9rem", sm: "1rem" },
              textTransform: "none",
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
                ></TableCell>
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
                            component={Link}
                            to={`/bill/${bill.id}`}
                            onClick={handleMenuClose}
                          >
                            View
                          </MenuItem>
                        </Menu>
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
            size="small"
            sx={{
              width: { xs: "100%", sm: "auto" },
              height: { xs: "40px", sm: "40px" },
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