import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  Card,
  CardContent,
  TextField,
  TablePagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import { format, isWithinInterval, parseISO } from "date-fns";
import { BarChart } from "@mui/x-charts/BarChart";
import logo from "../assets/logo.gif"

const Home = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // State for bills and filtering
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [parties, setParties] = useState({});
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [partySearch, setPartySearch] = useState("");
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // State for bill statistics chart
  const [billStats, setBillStats] = useState({ paid: [], pending: [] });
  const [timePeriod, setTimePeriod] = useState("day");

  useEffect(() => {
    if (!currentUser) {
      navigate("/login", { replace: true });
      return;
    }

    window.history.pushState(null, "", window.location.pathname);
    const handleBack = (event) => {
      event.preventDefault();
      window.history.pushState(null, "", window.location.pathname);
    };
    window.addEventListener("popstate", handleBack);

    return () => window.removeEventListener("popstate", handleBack);
  }, [currentUser, navigate]);

  useEffect(() => {
    if (!currentUser) return;

    const fetchData = async () => {
      try {
        // Fetch parties
        const partiesQuery = collection(db, "parties");
        const partiesSnapshot = await getDocs(partiesQuery);
        const partiesMap = {};
        partiesSnapshot.forEach((doc) => {
          partiesMap[doc.id] =
            doc.data().companyName || doc.data().partyName || "Unknown";
        });
        setParties(partiesMap);

        // Fetch bills
        const billsQuery = collection(db, "bills");
        const billsSnapshot = await getDocs(billsQuery);
        const billsData = billsSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((bill) => bill.createdBy === currentUser.uid)
          .sort((a, b) =>
            String(a.billNo || "").localeCompare(String(b.billNo || ""))
          );
        setBills(billsData);
        setFilteredBills(billsData);

        // Calculate bill statistics
        const now = new Date();
        const stats = { paid: [], pending: [] };
        const periods = getPeriods(timePeriod);

        periods.forEach((period) => {
          const periodBills = billsData.filter((bill) => {
            const billDate = new Date(bill.date);
            return isInPeriod(billDate, period, timePeriod);
          });

          stats.paid.push(
            periodBills.filter((b) => b.status === "paid").length
          );
          stats.pending.push(
            periodBills.filter((b) => b.status === "pending").length
          );
        });

        setBillStats(stats);
      } catch (error) {
        console.error("Error fetching data: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, timePeriod]);

  const getPeriods = (periodType) => {
    const now = new Date();
    switch (periodType) {
      case "day":
        return Array.from({ length: 7 }, (_, i) => {
          const date = new Date(now);
          date.setDate(now.getDate() - i);
          return date;
        }).reverse();
      case "week":
        return Array.from({ length: 4 }, (_, i) => {
          const date = new Date(now);
          date.setDate(now.getDate() - i * 7);
          return date;
        }).reverse();
      case "month":
        return Array.from({ length: 6 }, (_, i) => {
          const date = new Date(now);
          date.setMonth(now.getMonth() - i);
          return date;
        }).reverse();
      case "year":
        return Array.from({ length: 5 }, (_, i) => {
          const date = new Date(now);
          date.setFullYear(now.getFullYear() - i);
          return date;
        }).reverse();
      default:
        return [];
    }
  };

  const isInPeriod = (billDate, periodDate, periodType) => {
    switch (periodType) {
      case "day":
        return billDate.toDateString() === periodDate.toDateString();
      case "week":
        const weekStart = new Date(periodDate);
        weekStart.setDate(periodDate.getDate() - periodDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return billDate >= weekStart && billDate <= weekEnd;
      case "month":
        return (
          billDate.getMonth() === periodDate.getMonth() &&
          billDate.getFullYear() === periodDate.getFullYear()
        );
      case "year":
        return billDate.getFullYear() === periodDate.getFullYear();
      default:
        return false;
    }
  };

  const formatLabel = (date) => {
    switch (timePeriod) {
      case "day":
        return date.toLocaleDateString("en-US", { weekday: "short" });
      case "week":
        return `W${Math.ceil(date.getDate() / 7)}`;
      case "month":
        return date.toLocaleDateString("en-US", { month: "short" });
      case "year":
        return date.getFullYear().toString();
      default:
        return "";
    }
  };

  const applyFilters = () => {
    let filtered = [...bills];

    // Apply party name search
    if (partySearch.trim()) {
      filtered = filtered.filter((bill) => {
        const partyName = parties[bill.partyId] || "Unknown";
        return partyName
          .toLowerCase()
          .includes(partySearch.trim().toLowerCase());
      });
    }

    // Apply status filter
    if (statusFilter === "Paid") {
      filtered = filtered.filter((bill) => bill.status === "paid");
    } else if (statusFilter === "Pending") {
      filtered = filtered.filter((bill) => bill.status === "pending");
    }

    // Apply date range filter only if both dates are selected and filter is applied
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

  // Auto-reset if all filters are cleared
  useEffect(() => {
    if (!startDate && !endDate && !partySearch) {
      setIsFilterApplied(false);
      setFilteredBills(bills);
      setPage(0);
    }
  }, [startDate, endDate, partySearch, bills]);

  // Re-apply filters when status changes
  useEffect(() => {
    applyFilters();
  }, [bills, statusFilter]);

  const summary = {
    total: filteredBills.reduce((sum, bill) => sum + (bill.total || 0), 0),
    paid: filteredBills
      .filter((bill) => bill.status === "paid")
      .reduce((sum, bill) => sum + (bill.total || 0), 0),
    pending: filteredBills
      .filter((bill) => bill.status === "pending")
      .reduce((sum, bill) => sum + (bill.total || 0), 0),
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
      sx={{
        mt: { xs: 2, sm: 3, md: 4 },
        mb: { xs: 2, sm: 3, md: 4 },
        px: { xs: 1, sm: 2 },
        minWidth: "95vw",
        minHeight: "100vh",
      }}
    >
      <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
        <Grid item xs={12}>
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
              sx={{
                fontWeight: "bold",
                color: "primary.main",
                mb: 3,
                fontSize: { xs: "1.25rem", sm: "1.5rem", md: "1.75rem" },
              }}
            >
              Bill Statistics
            </Typography>
            <Tabs
              value={timePeriod}
              onChange={(e, newValue) => setTimePeriod(newValue)}
              sx={{ mb: 4 }}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab
                label="Daily"
                value="day"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                }}
              />
              <Tab
                label="Weekly"
                value="week"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                }}
              />
              <Tab
                label="Monthly"
                value="month"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                }}
              />
              <Tab
                label="Yearly"
                value="year"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                }}
              />
            </Tabs>
            <BarChart
              series={[
                { data: billStats.paid, label: "Paid", color: "#2ecc71" },
                { data: billStats.pending, label: "Pending", color: "#f1c40f" },
              ]}
              height={350}
              xAxis={[
                {
                  data: getPeriods(timePeriod).map(formatLabel),
                  scaleType: "band",
                },
              ]}
              margin={{ top: 30, bottom: 50, left: 60, right: 30 }}
              sx={{
                "& .MuiChartsAxis-label": {
                  fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                },
                "& .MuiChartsLegend-root": { marginTop: "20px" },
                width: "100%",
              }}
            />
          </Paper>
        </Grid>

        <Grid item xs={12}>
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
              sx={{
                fontWeight: "bold",
                color: "primary.main",
                mb: 4,
                fontSize: { xs: "1.25rem", sm: "1.5rem", md: "1.75rem" },
              }}
            >
              All Bills
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
                    p: 2,
                    borderRadius: 2,
                    bgcolor: "primary.light",
                    textAlign: "center",
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
                  >
                    Total
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontSize: { xs: "1.2rem", sm: "1.5rem" } }}
                  >
                    ₹{summary.total.toFixed(2)}
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
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
                  >
                    Paid
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontSize: { xs: "1.2rem", sm: "1.5rem" } }}
                  >
                    ₹{summary.paid.toFixed(2)}
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
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
                  >
                    Pending
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontSize: { xs: "1.2rem", sm: "1.5rem" } }}
                  >
                    ₹{summary.pending.toFixed(2)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Filter Section */}
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
                  label="Search By Party Name"
                  value={partySearch}
                  onChange={(e) => setPartySearch(e.target.value)}
                  size="small"
                  sx={{
                    minWidth: { xs: "100%", sm: 200, md: 300 },
                    "& .MuiInputBase-root": {
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                    },
                  }}
                />
                <TextField
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  sx={{
                    minWidth: { xs: "100%", sm: 200, md: 300 },
                    "& .MuiInputBase-root": {
                      fontSize: { xs: "0.9rem", sm: "1rem" },
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
                    minWidth: { xs: "100%", sm: 200, md: 300 },
                    "& .MuiInputBase-root": {
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                    },
                  }}
                />
                <FormControl
                  sx={{
                    minWidth: { xs: "100%", sm: 200 },
                  }}
                >
                  <InputLabel sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}>
                    Status
                  </InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={handleStatusFilterChange}
                    label="Status"
                    size="small"
                    sx={{
                      "& .MuiSelect-select": {
                        fontSize: { xs: "0.9rem", sm: "1rem" },
                      },
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
                    minWidth: { xs: "100%", sm: "90px" },
                    height: { xs: "40px", sm: "40px" },
                    fontSize: { xs: "0.9rem", sm: "1rem" },
                    textTransform: "none",
                  }}
                >
                  <Search />
                </Button>
              </Box>
            </Box>

            {/* Bills Table */}
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
                        textAlign: "center",
                      }}
                    >
                      Party Name
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                        textAlign: "center",
                      }}
                    >
                      Date
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                        textAlign: "center",
                      }}
                    >
                      Amount
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                        textAlign: "center",
                      }}
                    >
                      Status
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                        textAlign: "center",
                      }}
                    >
                      Actions
                    </TableCell>
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
                        <TableRow key={bill.id} hover>
                          <TableCell
                            align="center"
                            sx={{
                              fontSize: {
                                xs: "0.8rem",
                                sm: "0.9rem",
                                md: "1rem",
                              },
                            }}
                          >
                            {parties[bill.partyId] || "Unknown"}
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              fontSize: {
                                xs: "0.8rem",
                                sm: "0.9rem",
                                md: "1rem",
                              },
                            }}
                          >
                            {format(parseISO(bill.date), "dd-MM-yyyy")}
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              fontSize: {
                                xs: "0.8rem",
                                sm: "0.9rem",
                                md: "1rem",
                              },
                            }}
                          >
                            ₹{bill.total.toFixed(2)}
                          </TableCell>
                          <TableCell align="center">
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
                                fontSize: { xs: "0.75rem", sm: "0.85rem" },
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              component={Link}
                              to={`/bill/${bill.id}`}
                              variant="outlined"
                              color="primary"
                              size="small"
                              sx={{
                                minWidth: { xs: "100%", sm: "100px" },
                                height: { xs: "40px", sm: "40px" },
                                fontSize: { xs: "0.8rem", sm: "0.9rem" },
                                textTransform: "none",
                              }}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
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
                    fontSize: { xs: "0.85rem", sm: "0.95rem" },
                  },
              }}
            />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Home;
