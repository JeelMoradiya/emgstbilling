import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
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
  Box,
  Alert,
  TextField,
  TablePagination,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  Search,
  MoreVert,
} from "@mui/icons-material";
import logo from "../../assets/logo.gif"

const AllParties = () => {
  const [parties, setParties] = useState([]);
  const [filteredParties, setFilteredParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const { currentUser } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedPartyId, setSelectedPartyId] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      setError("Please log in to view parties");
      setLoading(false);
      return;
    }

    const fetchParties = async () => {
      try {
        const q = query(
          collection(db, "parties"),
          where("createdBy", "==", currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        const partiesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setParties(partiesData);
        setFilteredParties(partiesData);
      } catch (error) {
        console.error("Error fetching parties: ", error);
        setError("Failed to fetch parties: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchParties();
  }, [currentUser]);

  const handleSearch = async () => {
    try {
      let filtered = parties;
      if (searchTerm.trim()) {
        filtered = parties.filter(
          (party) =>
            (party.companyName || "")
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            (party.gstNo || "").toLowerCase().includes(searchTerm.toLowerCase())
        );

        for (let party of filtered) {
          const billsQuery = query(
            collection(db, "bills"),
            where("partyId", "==", party.id),
            where("status", "==", "pending")
          );
          const billsSnapshot = await getDocs(billsQuery);
          const pendingBills = billsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          party.pendingBills = pendingBills;
        }
      } else {
        filtered = parties.map((party) => ({
          ...party,
          pendingBills: [],
        }));
      }
      setFilteredParties(filtered);
      setPage(0);
    } catch (error) {
      console.error("Error searching parties: ", error);
      setError("Failed to search parties: " + error.message);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuOpen = (event, partyId) => {
    setAnchorEl(event.currentTarget);
    setSelectedPartyId(partyId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPartyId(null);
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
        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 2,
              fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
            }}
          >
            {error}
          </Alert>
        )}
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
            variant="h5"
            sx={{
              fontWeight: "bold",
              color: "primary.main",
              fontSize: { xs: "1rem", sm: "1.5rem", md: "1.75rem" },
            }}
          >
            All Parties
          </Typography>
        </Box>

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
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              width: { xs: "auto", sm: "100%" },
            }}
          >
            <TextField
              fullWidth
              placeholder="Search by company name or GST number"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{
                "& .MuiInputBase-root": {
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                },
              }}
            />
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
                    fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                  }}
                >
                  Company Name
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                  }}
                >
                  GST No
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                  }}
                >
                  Mobile
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                  }}
                >
                  Email
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                  }}
                ></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredParties.length > 0 ? (
                filteredParties
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((party) => (
                    <TableRow key={party.id} hover>
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" },
                        }}
                      >
                        {party.companyName || "N/A"}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" },
                        }}
                      >
                        {party.gstNo || "N/A"}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" },
                        }}
                      >
                        {party.mobileNo || "N/A"}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" },
                        }}
                      >
                        {party.email || "N/A"}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          onClick={(e) => handleMenuOpen(e, party.id)}
                          size="small"
                        >
                          <MoreVert />
                        </IconButton>
                        <Menu
                          anchorEl={anchorEl}
                          open={
                            Boolean(anchorEl) && selectedPartyId === party.id
                          }
                          onClose={handleMenuClose}
                        >
                          <MenuItem
                            component={Link}
                            to={`/party-bills/${party.id}`}
                            onClick={handleMenuClose}
                          >
                            {" "}
                            View Bills
                          </MenuItem>
                          <MenuItem
                            component={Link}
                            to={`/payment/${party.id}`}
                            onClick={handleMenuClose}
                          >
                            Payment
                          </MenuItem>
                        </Menu>
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography
                      variant="body1"
                      sx={{
                        py: 3,
                        color: "text.secondary",
                        fontSize: { xs: "0.9rem", sm: "1rem" },
                      }}
                    >
                      No parties found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredParties.some((party) => party.pendingBills?.length > 0) && (
          <Box mt={4}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                color: "primary.main",
                mb: 2,
                fontSize: { xs: "1rem", sm: "1.25rem" },
              }}
            >
              Pending Bills
            </Typography>
            {filteredParties.map(
              (party) =>
                party.pendingBills?.length > 0 && (
                  <Box key={party.id} mb={3}>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: "bold", mb: 1 }}
                    >
                      {party.companyName}
                    </Typography>
                    <TableContainer component={Paper} elevation={1}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Bill ID</TableCell>
                            <TableCell>Total Amount</TableCell>
                            <TableCell>TDS</TableCell>
                            <TableCell>Other (Claim)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {party.pendingBills.map((bill) => (
                            <TableRow key={bill.id}>
                              <TableCell>{bill.id}</TableCell>
                              <TableCell>{bill.totalAmount || "N/A"}</TableCell>
                              <TableCell>{bill.tds || "0"}</TableCell>
                              <TableCell>{bill.otherClaim || "0"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )
            )}
          </Box>
        )}

        <TablePagination
          component="div"
          count={filteredParties.length}
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
    </Container>
  );
};

export default AllParties;
