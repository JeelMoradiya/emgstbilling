import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
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
  Card,
  CardContent,
  TextField,
  TablePagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  IconButton,
} from "@mui/material";
import { Search, Download } from "@mui/icons-material";
import { format, isWithinInterval, parseISO } from "date-fns";
import { BarChart, PieChart, LineChart } from "@mui/x-charts";
import logo from "../assets/logo.gif";

const Home = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // State for bills, parties, and filtering
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [parties, setParties] = useState({});
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [partySearch, setPartySearch] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("All");
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // State for charts and financial metrics
  const [billStats, setBillStats] = useState({ paid: [], pending: [] });
  const [billTimePeriod, setBillTimePeriod] = useState("month");
  const [paymentTimePeriod, setPaymentTimePeriod] = useState("month");
  const [turnoverTimePeriod, setTurnoverTimePeriod] = useState("year");
  const [paidPendingTimePeriod, setPaidPendingTimePeriod] = useState("month");
  const [paymentMethodData, setPaymentMethodData] = useState([]);
  const [turnoverData, setTurnoverData] = useState([]);
  const [paidAmountData, setPaidAmountData] = useState([]);
  const [pendingAmountData, setPendingAmountData] = useState([]);
  const [hoveredMethod, setHoveredMethod] = useState(null);

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
        const partiesQuery = query(
          collection(db, "parties"),
          where("createdBy", "==", currentUser.uid)
        );
        const partiesSnapshot = await getDocs(partiesQuery);
        const partiesMap = {};
        partiesSnapshot.forEach((doc) => {
          partiesMap[doc.id] =
            doc.data().companyName || doc.data().partyName || "Unknown";
        });
        setParties(partiesMap);

        // Fetch bills
        const billsQuery = query(
          collection(db, "bills"),
          where("createdBy", "==", currentUser.uid)
        );
        const billsSnapshot = await getDocs(billsQuery);
        const billsData = billsSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .sort((a, b) =>
            String(a.billNo || "").localeCompare(String(b.billNo || ""))
          );
        setBills(billsData);
        setFilteredBills(billsData);

        // Calculate financial metrics
        calculateFinancialMetrics(billsData, partiesMap);
      } catch (error) {
        console.error("Error fetching data: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const getPeriods = (periodType) => {
    const now = new Date();
    let length;
    switch (periodType) {
      case "day":
        length = 7;
        break;
      case "week":
        length = 4;
        break;
      case "month":
        length = 6;
        break;
      case "year":
        length = 6;
        break;
      default:
        return [];
    }
    return Array.from({ length }, (_, i) => {
      const date = new Date(now);
      if (periodType === "day") date.setDate(now.getDate() - i);
      else if (periodType === "week") date.setDate(now.getDate() - i * 7);
      else if (periodType === "month") date.setMonth(now.getMonth() - i);
      else if (periodType === "year") date.setFullYear(now.getFullYear() - i);
      return date;
    }).reverse();
  };

  const isInPeriod = (billDate, periodDate, periodType) => {
    if (!(billDate instanceof Date) || isNaN(billDate)) return false;
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

  const formatLabel = (date, periodType) => {
    switch (periodType) {
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

  const calculateBillStats = (billsData, periodType) => {
    const periods = getPeriods(periodType);
    const stats = {
      paid: new Array(periods.length).fill(0),
      pending: new Array(periods.length).fill(0),
    };

    billsData.forEach((bill) => {
      try {
        const billDate = parseISO(bill.date);
        periods.forEach((period, index) => {
          if (isInPeriod(billDate, period, periodType)) {
            if (bill.status === "paid") stats.paid[index]++;
            else if (bill.status === "pending") stats.pending[index]++;
          }
        });
      } catch (error) {
        console.error("Error parsing bill date:", bill.date, error);
      }
    });

    return stats;
  };

  const calculatePaidPendingAmounts = (billsData, periodType) => {
    const periods = getPeriods(periodType);
    const paid = new Array(periods.length).fill(0);
    const pending = new Array(periods.length).fill(0);

    billsData.forEach((bill) => {
      try {
        const billDate = parseISO(bill.date);
        periods.forEach((period, index) => {
          if (isInPeriod(billDate, period, periodType)) {
            if (bill.status === "paid") paid[index] += bill.total || 0;
            else if (bill.status === "pending")
              pending[index] += bill.total || 0;
          }
        });
      } catch (error) {
        console.error("Error parsing bill date:", bill.date, error);
      }
    });

    return { paid, pending };
  };

  const calculateFinancialMetrics = (billsData, partiesMap) => {
    // Calculate bill stats for BarChart
    const billStatsData = calculateBillStats(billsData, billTimePeriod);
    setBillStats(billStatsData);

    // Calculate paid and pending amounts for LineChart
    const paidPendingData = calculatePaidPendingAmounts(
      billsData,
      paidPendingTimePeriod
    );
    setPaidAmountData(paidPendingData.paid);
    setPendingAmountData(paidPendingData.pending);

    const paymentPeriods = getPeriods(paymentTimePeriod);
    const turnoverPeriods = getPeriods(turnoverTimePeriod);

    // Payment Methods Distribution
    const methodCounts = { cheque: 0, cash: 0, upi: 0, netbanking: 0, none: 0 };
    const methodTotals = { cheque: 0, cash: 0, upi: 0, netbanking: 0, none: 0 };
    billsData.forEach((bill) => {
      try {
        const billDate = parseISO(bill.date);
        if (isInPeriod(billDate, paymentPeriods[0], paymentTimePeriod)) {
          const method = bill.paymentMethod || "none";
          methodCounts[method]++;
          methodTotals[method] += bill.total || 0;
        }
      } catch (error) {
        console.error("Error parsing bill date:", bill.date, error);
      }
    });

    const totalTransactions = Object.values(methodCounts).reduce(
      (sum, count) => sum + count,
      0
    );
    const paymentData = [
      {
        id: 0,
        value: methodCounts.cheque,
        label: "Cheque",
        color: "#3498db",
        total: methodTotals.cheque,
        percentage: totalTransactions
          ? ((methodCounts.cheque / totalTransactions) * 100).toFixed(1)
          : 0,
      },
      {
        id: 1,
        value: methodCounts.cash,
        label: "Cash",
        color: "#2ecc71",
        total: methodTotals.cash,
        percentage: totalTransactions
          ? ((methodCounts.cash / totalTransactions) * 100).toFixed(1)
          : 0,
      },
      {
        id: 2,
        value: methodCounts.upi,
        label: "UPI",
        color: "#e74c3c",
        total: methodTotals.upi,
        percentage: totalTransactions
          ? ((methodCounts.upi / totalTransactions) * 100).toFixed(1)
          : 0,
      },
      {
        id: 3,
        value: methodCounts.netbanking,
        label: "Net Banking",
        color: "#f1c40f",
        total: methodTotals.netbanking,
        percentage: totalTransactions
          ? ((methodCounts.netbanking / totalTransactions) * 100).toFixed(1)
          : 0,
      },
      {
        id: 4,
        value: methodCounts.none,
        label: "None",
        color: "#95a5a6",
        total: methodTotals.none,
        percentage: totalTransactions
          ? ((methodCounts.none / totalTransactions) * 100).toFixed(1)
          : 0,
      },
    ];
    setPaymentMethodData(paymentData);

    // Turnover
    const turnover = new Array(turnoverPeriods.length).fill(0);
    billsData.forEach((bill) => {
      try {
        const billDate = parseISO(bill.date);
        turnoverPeriods.forEach((period, index) => {
          if (
            bill.status === "paid" &&
            isInPeriod(billDate, period, turnoverTimePeriod)
          ) {
            turnover[index] += bill.total || 0;
          }
        });
      } catch (error) {
        console.error("Error parsing bill date:", bill.date, error);
      }
    });
    setTurnoverData(turnover);
  };

  const applyFilters = () => {
    let filtered = [...bills];

    // Filter by party name
    if (partySearch.trim()) {
      filtered = filtered.filter((bill) => {
        const partyName = parties[bill.partyId] || "Unknown";
        return partyName
          .toLowerCase()
          .includes(partySearch.trim().toLowerCase());
      });
    }

    // Filter by status
    if (statusFilter === "Paid") {
      filtered = filtered.filter((bill) => bill.status === "paid");
    } else if (statusFilter === "Pending") {
      filtered = filtered.filter((bill) => bill.status === "pending");
    }

    // Filter by date range
    if (startDate && endDate && isFilterApplied) {
      filtered = filtered.filter((bill) => {
        try {
          const billDate = parseISO(bill.date);
          const start = parseISO(startDate);
          const end = parseISO(endDate);
          return isWithinInterval(billDate, { start, end });
        } catch (error) {
          console.error("Date parsing error:", bill.date, error);
          return false;
        }
      });
    }

    // Filter by payment method
    if (paymentMethodFilter !== "All") {
      filtered = filtered.filter((bill) => {
        const method = bill.paymentMethod || "none";
        return method === paymentMethodFilter.toLowerCase();
      });
    }

    setFilteredBills(filtered);
    setPage(0);
    calculateFinancialMetrics(filtered, parties);
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

  const handlePaymentMethodFilterChange = (event) => {
    setPaymentMethodFilter(event.target.value);
  };

  const handleDownloadPaymentData = () => {
    const csvContent = [
      "Payment Method,Transactions,Percentage,Total Amount",
      ...paymentMethodData.map(
        (method) =>
          `${method.label},${method.value},${
            method.percentage
          }%,₹${method.total.toFixed(2)}`
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment_methods_${paymentTimePeriod}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (
      !startDate &&
      !endDate &&
      !partySearch &&
      paymentMethodFilter === "All"
    ) {
      setIsFilterApplied(false);
      setFilteredBills(bills);
      setPage(0);
    }
  }, [startDate, endDate, partySearch, paymentMethodFilter, bills]);

  useEffect(() => {
    applyFilters();
  }, [
    bills,
    statusFilter,
    paymentMethodFilter,
    billTimePeriod,
    paymentTimePeriod,
    turnoverTimePeriod,
    paidPendingTimePeriod,
  ]);

  const summary = {
    total: filteredBills.reduce((sum, bill) => sum + (bill.total || 0), 0),
    paid: filteredBills
      .filter((bill) => bill.status === "paid")
      .reduce((sum, bill) => sum + (bill.total || 0), 0),
    pending: filteredBills
      .filter((bill) => bill.status === "pending")
      .reduce((sum, bill) => sum + (bill.total || 0), 0),
  };

  const turnoverSummary = {
    day: bills
      .filter(
        (bill) =>
          bill.status === "paid" &&
          isInPeriod(parseISO(bill.date), new Date(), "day")
      )
      .reduce((sum, bill) => sum + (bill.total || 0), 0),
    week: bills
      .filter(
        (bill) =>
          bill.status === "paid" &&
          isInPeriod(parseISO(bill.date), new Date(), "week")
      )
      .reduce((sum, bill) => sum + (bill.total || 0), 0),
    month: bills
      .filter(
        (bill) =>
          bill.status === "paid" &&
          isInPeriod(parseISO(bill.date), new Date(), "month")
      )
      .reduce((sum, bill) => sum + (bill.total || 0), 0),
    year: bills
      .filter(
        (bill) =>
          bill.status === "paid" &&
          isInPeriod(parseISO(bill.date), new Date(), "year")
      )
      .reduce((sum, bill) => sum + (bill.total || 0), 0),
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
        <img
          src={logo}
          alt="Logo"
          style={{ width: "100px", height: "100px" }}
        />
      </Container>
    );
  }

  const totalTransactions = paymentMethodData.reduce(
    (sum, method) => sum + method.value,
    0
  );

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
        {/* Turnover Summary Cards */}
        <Grid item xs={12}>
          <Grid container spacing={{ xs: 1, sm: 2 }}>
            {["day", "week", "month", "year"].map((period) => (
              <Grid item xs={12} sm={6} md={3} key={period}>
                <Card
                  sx={{
                    bgcolor: "primary.light",
                    borderRadius: 2,
                    textAlign: "center",
                    transition: "transform 0.3s",
                    "&:hover": { transform: "scale(1.03)" },
                  }}
                >
                  <CardContent>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
                    >
                      {period.charAt(0).toUpperCase() + period.slice(1)}{" "}
                      Turnover
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{ fontSize: { xs: "1.2rem", sm: "1.5rem" } }}
                    >
                      ₹{turnoverSummary[period].toFixed(2)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Bill Statistics */}
        <Grid item xs={12} md={6}>
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
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: "bold",
                  color: "primary.main",
                  fontSize: { xs: "1.25rem", sm: "1.5rem" },
                }}
              >
                Bill Statistics
              </Typography>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}>
                  Period
                </InputLabel>
                <Select
                  value={billTimePeriod}
                  onChange={(e) => setBillTimePeriod(e.target.value)}
                  label="Period"
                  size="small"
                  sx={{
                    "& .MuiSelect-select": {
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                    },
                  }}
                >
                  <MenuItem value="day">Daily</MenuItem>
                  <MenuItem value="week">Weekly</MenuItem>
                  <MenuItem value="month">Monthly</MenuItem>
                  <MenuItem value="year">Yearly</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <BarChart
              series={[
                { data: billStats.paid, label: "Paid Bills", color: "#2ecc71" },
                {
                  data: billStats.pending,
                  label: "Pending Bills",
                  color: "#f1c40f",
                },
              ]}
              height={350}
              xAxis={[
                {
                  data: getPeriods(billTimePeriod).map((date) =>
                    formatLabel(date, billTimePeriod)
                  ),
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

        {/* Paid and Pending Amounts */}
        <Grid item xs={12} md={6}>
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
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: "bold",
                  color: "primary.main",
                  fontSize: { xs: "1.25rem", sm: "1.5rem" },
                }}
              >
                Paid & Pending Amounts
              </Typography>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}>
                  Period
                </InputLabel>
                <Select
                  value={paidPendingTimePeriod}
                  onChange={(e) => setPaidPendingTimePeriod(e.target.value)}
                  label="Period"
                  size="small"
                  sx={{
                    "& .MuiSelect-select": {
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                    },
                  }}
                >
                  <MenuItem value="day">Daily</MenuItem>
                  <MenuItem value="week">Weekly</MenuItem>
                  <MenuItem value="month">Monthly</MenuItem>
                  <MenuItem value="year">Yearly</MenuItem>
                </Select>
              </FormControl>
            </Box>
            {paidAmountData.length ===
              getPeriods(paidPendingTimePeriod).length &&
            pendingAmountData.length ===
              getPeriods(paidPendingTimePeriod).length ? (
              <LineChart
                series={[
                  {
                    data: paidAmountData,
                    label: "Paid Amount",
                    color: "#2ecc71",
                  },
                  {
                    data: pendingAmountData,
                    label: "Pending Amount",
                    color: "#f1c40f",
                  },
                ]}
                height={350}
                xAxis={[
                  {
                    data: getPeriods(paidPendingTimePeriod).map((date) =>
                      formatLabel(date, paidPendingTimePeriod)
                    ),
                    scaleType: "point",
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
            ) : (
              <Typography color="error">
                Data mismatch: Please try again.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Payment Methods Distribution */}
        <Grid item xs={12} md={6}>
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
                fontSize: { xs: "1.25rem", sm: "1.5rem" },
              }}
            >
              Payment Methods Distribution
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                gap: 3,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <PieChart
                  series={[
                    {
                      data: filteredBills
                        .reduce((acc, bill) => {
                          const method = bill.paymentDetails?.method || "none";
                          const existing = acc.find(
                            (item) => item.label === method
                          );
                          if (existing) {
                            existing.value += 1;
                            existing.total += bill.total || 0;
                          } else {
                            acc.push({
                              id: acc.length,
                              value: 1,
                              label: method,
                              color:
                                method === "cheque"
                                  ? "#3498db"
                                  : method === "cash"
                                  ? "#2ecc71"
                                  : method === "upi"
                                  ? "#e74c3c"
                                  : method === "netbanking"
                                  ? "#f1c40f"
                                  : "#95a5a6",
                              total: bill.total || 0,
                              percentage: 0, // Will be calculated below
                            });
                          }
                          return acc;
                        }, [])
                        .map((item) => ({
                          ...item,
                          percentage: filteredBills.length
                            ? (
                                (item.value / filteredBills.length) *
                                100
                              ).toFixed(1)
                            : 0,
                        })),
                      innerRadius: 40,
                      outerRadius: 120,
                      paddingAngle: 2,
                      cornerRadius: 5,
                      highlightScope: {
                        faded: "global",
                        highlighted: "item",
                      },
                      faded: { innerRadius: 30, additionalRadius: -10 },
                    },
                  ]}
                  height={300}
                  margin={{ top: 20, bottom: 40, left: 20, right: 20 }}
                  slotProps={{
                    legend: {
                      direction: "row",
                      position: { vertical: "bottom", horizontal: "middle" },
                      padding: 0,
                      itemMarkWidth: 15,
                      itemMarkHeight: 15,
                      labelStyle: { fontSize: { xs: 12, sm: 14 } },
                    },
                  }}
                  onItemClick={(event, d) => setHoveredMethod(d.dataIndex)}
                  sx={{
                    "& .MuiChartsLegend-root": { marginTop: "10px" },
                    "& .MuiPieArc-root": {
                      transition: "all 0.3s",
                      "&:hover": { opacity: 0.9, transform: "scale(1.05)" },
                    },
                    width: "100%",
                  }}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ mb: 1, fontWeight: "bold" }}
                >
                  Payment Method Breakdown
                </Typography>
                <Grid container spacing={1}>
                  {filteredBills
                    .reduce((acc, bill) => {
                      const method = bill.paymentDetails?.method || "none";
                      const existing = acc.find(
                        (item) => item.label === method
                      );
                      if (existing) {
                        existing.value += 1;
                        existing.total += bill.total || 0;
                      } else {
                        acc.push({
                          id: acc.length,
                          value: 1,
                          label: method,
                          color:
                            method === "cheque"
                              ? "#3498db"
                              : method === "cash"
                              ? "#2ecc71"
                              : method === "upi"
                              ? "#e74c3c"
                              : method === "netbanking"
                              ? "#f1c40f"
                              : "#95a5a6",
                          total: bill.total || 0,
                          percentage: 0,
                        });
                      }
                      return acc;
                    }, [])
                    .map((method) => ({
                      ...method,
                      percentage: filteredBills.length
                        ? ((method.value / filteredBills.length) * 100).toFixed(
                            1
                          )
                        : 0,
                    }))
                    .map((method) => (
                      <Grid item xs={12} key={method.id}>
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: 1,
                            bgcolor:
                              hoveredMethod === method.id
                                ? `${method.color}22`
                                : "transparent",
                            transition: "all 0.3s",
                            "&:hover": {
                              bgcolor: `${method.color}22`,
                              cursor: "pointer",
                            },
                          }}
                          onMouseEnter={() => setHoveredMethod(method.id)}
                          onMouseLeave={() => setHoveredMethod(null)}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Box
                              sx={{
                                width: 9,
                                height: 9,
                                bgcolor: method.color,
                                borderRadius: "50%",
                              }}
                            />
                            <Typography variant="body2" sx={{ flex: 1 }}>
                              {method.label.charAt(0).toUpperCase() +
                                method.label.slice(1)}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: "bold" }}
                            >
                              {method.percentage}%
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {method.value} transactions | ₹
                            {method.total.toFixed(2)}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                </Grid>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Turnover Over Time */}
        <Grid item xs={12} md={6}>
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
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: "bold",
                  color: "primary.main",
                  fontSize: { xs: "1.25rem", sm: "1.5rem" },
                }}
              >
                Turnover Over Time
              </Typography>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}>
                  Period
                </InputLabel>
                <Select
                  value={turnoverTimePeriod}
                  onChange={(e) => setTurnoverTimePeriod(e.target.value)}
                  label="Period"
                  size="small"
                  sx={{
                    "& .MuiSelect-select": {
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                    },
                  }}
                >
                  <MenuItem value="day">Daily</MenuItem>
                  <MenuItem value="week">Weekly</MenuItem>
                  <MenuItem value="month">Monthly</MenuItem>
                  <MenuItem value="year">Yearly</MenuItem>
                </Select>
              </FormControl>
            </Box>
            {turnoverData.length === getPeriods(turnoverTimePeriod).length ? (
              <LineChart
                series={[
                  {
                    data: turnoverData,
                    label: "Total Turnover",
                    color: "#3498db",
                  },
                ]}
                height={300}
                xAxis={[
                  {
                    data: getPeriods(turnoverTimePeriod).map((date) =>
                      formatLabel(date, turnoverTimePeriod)
                    ),
                    scaleType: "point",
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
            ) : (
              <Typography color="error">
                Data mismatch: Please try again.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Recent Bills */}
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
              Recent Bills
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
                mb: 4,
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
                      Payment Method
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
                            {bill.paymentDetails?.method
                              ? bill.paymentDetails.method.toUpperCase()
                              : "N/A"}
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
