import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useFormik } from "formik";
import * as Yup from "yup";
import { format, parseISO, isWithinInterval } from "date-fns";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
  Autocomplete,
  Menu,
  MenuItem,
  Fab,
  Snackbar,
  Checkbox,
} from "@mui/material";
import {
  Add as AddIcon,
  Save as SaveIcon,
  MoreVert,
  Visibility,
  Edit,
  Delete,
  Download,
  Print,
  Share,
} from "@mui/icons-material";
import { numberToWords } from "../utils";
import logo from "../assets/logo.gif";
import { PDFDownloadLink, pdf } from "@react-pdf/renderer";
import ChallanPDF from "./ChallanPDF";

const ChallanBook = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [challans, setChallans] = useState([]);
  const [filteredChallans, setFilteredChallans] = useState([]);
  const [parties, setParties] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([{ name: "", hsn: "", quantity: "", price: "" }]);
  const [discount, setDiscount] = useState("");
  const [nextChallanNo, setNextChallanNo] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState("add");
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedChallanId, setSelectedChallanId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [selectedChallans, setSelectedChallans] = useState([]);
  const [userData, setUserData] = useState({});
  const [searchParty, setSearchParty] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [userState, setUserState] = useState("");

  const validationSchema = Yup.object({
    partyId: Yup.string().required("Party is required").min(1, "Party selection is required"),
    date: Yup.date()
      .required("Challan date is required")
      .max(new Date(), "Date cannot be in the future")
      .typeError("Invalid date format"),
    items: Yup.array()
      .of(
        Yup.object({
          name: Yup.string()
            .trim()
            .required("Item name is required")
            .min(1, "Item name cannot be empty")
            .max(100, "Item name cannot exceed 100 characters"),
          hsn: Yup.string()
            .optional()
            .matches(/^\d{4,8}$/, {
              message: "HSN code must be 4 to 8 digits",
              excludeEmptyString: true,
            })
            .max(8, "HSN code cannot exceed 8 characters"),
          quantity: Yup.number()
            .required("Quantity is required")
            .min(1, "Quantity must be at least 1")
            .max(10000, "Quantity cannot exceed 10,000")
            .typeError("Quantity must be a number"),
          price: Yup.number()
            .required("Price is required")
            .min(0.01, "Price must be greater than 0")
            .max(1000000, "Price cannot exceed 1,000,000")
            .typeError("Price must be a number"),
        })
      )
      .min(1, "At least one item is required")
      .required("Items are required"),
    discount: Yup.string()
      .optional()
      .test(
        "discount-validation",
        "Discount must be a number between 0 and 100",
        (value) =>
          !value ||
          value.trim() === "" ||
          (/^\d*\.?\d*$/.test(value) && parseFloat(value) >= 0 && parseFloat(value) <= 100)
      ),
    notes: Yup.string().optional().max(500, "Notes cannot exceed 500 characters"),
  });

  const formik = useFormik({
    initialValues: {
      challanNo: "",
      date: format(new Date(), "yyyy-MM-dd"),
      partyId: "",
      notes: "",
      items: items,
      discount: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      if (!currentUser) {
        setError("Please log in to create challans");
        return;
      }

      setIsSubmitting(true);
      setSuccess(false);
      setError(null);

      try {
        let challanNoToUse = values.challanNo;
        if (dialogMode === "add") {
          challanNoToUse = nextChallanNo;
        }

        const challanQuery = query(
          collection(db, "challans"),
          where("createdBy", "==", currentUser.uid),
          where("challanNo", "==", challanNoToUse)
        );
        const existingChallans = await getDocs(challanQuery);

        if (!existingChallans.empty && dialogMode === "add") {
          setError(`Challan number ${challanNoToUse} already exists`);
          setIsSubmitting(false);
          return;
        }

        const { subtotal, discountAmount, total, roundedTotal, roundOff } = calculateTotals();
        const selectedParty = parties.find((p) => p.id === values.partyId);

        const challanData = {
          ...values,
          challanNo: challanNoToUse,
          partyId: values.partyId,
          items,
          subtotal,
          discount: parseFloat(discount) || 0,
          discountAmount,
          total,
          roundedTotal,
          roundOff,
          partyDetails: selectedParty,
          createdAt: new Date().toISOString(),
          createdBy: currentUser.uid,
        };

        if (dialogMode === "edit" && selectedChallan) {
          const challanRef = doc(db, "challans", selectedChallan.id);
          await updateDoc(challanRef, challanData);
          setChallans((prev) =>
            prev.map((challan) =>
              challan.id === selectedChallan.id ? { id: challan.id, ...challanData } : challan
            )
          );
        } else {
          const docRef = await addDoc(collection(db, "challans"), challanData);
          setChallans((prev) => [
            ...prev,
            { id: docRef.id, ...challanData },
          ]);
          const counterRef = doc(db, "challanCounters", `${currentUser.uid}`);
          await setDoc(counterRef, { lastChallanNo: nextChallanNo }, { merge: true });
          setNextChallanNo(nextChallanNo + 1);
        }

        setSnackbar({
          open: true,
          message: dialogMode === "edit" ? "Challan updated successfully" : "Challan created successfully",
          severity: "success",
        });
        setTimeout(() => {
          setSuccess(false);
          resetComponentState();
          setOpenDialog(false);
          setDialogMode("add");
          setSelectedChallan(null);
        }, 2000);
      } catch (error) {
        console.error("Error generating challan: ", error);
        setError("Failed to create challan: " + error.message);
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const resetComponentState = () => {
    setItems([{ name: "", hsn: "", quantity: "", price: "" }]);
    setDiscount("");
    formik.resetForm({
      values: {
        challanNo: dialogMode === "add" ? "" : formik.values.challanNo,
        date: format(new Date(), "yyyy-MM-dd"),
        partyId: "",
        notes: "",
        items: [{ name: "", hsn: "", quantity: "", price: "" }],
        discount: "",
      },
    });
    if (dialogMode === "add") {
      fetchNextChallanNo();
    }
  };

  useEffect(() => {
    const fetchPartiesAndChallans = async () => {
      if (!currentUser) return;
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserData(userSnap.data());
          setUserState(userSnap.data().address?.state || "");
        } else {
          console.warn("User data not found, using fallback");
          setUserData({ companyName: "Your Company", gstNo: "N/A", udyamNo: "N/A" });
          setUserState("");
        }

        const q = query(collection(db, "parties"), where("createdBy", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);
        const partiesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setParties(partiesData);

        const challanQuery = query(
          collection(db, "challans"),
          where("createdBy", "==", currentUser.uid)
        );
        const challanSnapshot = await getDocs(challanQuery);
        const challansData = challanSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .sort((a, b) => a.challanNo - b.challanNo);
        setChallans(challansData);
        setFilteredChallans(challansData);
      } catch (err) {
        setError("Failed to fetch parties or challans: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPartiesAndChallans();
  }, [currentUser]);

  const fetchNextChallanNo = async () => {
    if (!currentUser) return;
    try {
      const counterRef = doc(db, "challanCounters", `${currentUser.uid}`);
      const counterSnap = await getDoc(counterRef);
      if (counterSnap.exists()) {
        setNextChallanNo(counterSnap.data().lastChallanNo + 1);
      } else {
        setNextChallanNo(1);
      }
    } catch (err) {
      console.error("Error fetching challan counter:", err);
      setNextChallanNo(1);
    }
  };

  useEffect(() => {
    if (dialogMode === "add") {
      fetchNextChallanNo();
    }
  }, [dialogMode, currentUser]);

  const calculateTotals = () => {
    const subtotal = items.reduce(
      (sum, item) =>
        sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0),
      0
    );
    const discountAmount = subtotal * ((parseFloat(discount) || 0) / 100);
    const total = subtotal - discountAmount;
    const roundedTotal = Number(Math.round(total)).toFixed(2);
    const roundOff = Number(roundedTotal - total).toFixed(2);

    return {
      subtotal,
      discountAmount,
      total,
      roundedTotal,
      roundOff,
    };
  };

  const handleAddItem = () => {
    setItems([...items, { name: "", hsn: "", quantity: "", price: "" }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      setSnackbar({
        open: true,
        message: "A challan must have at least one item",
        severity: "error",
      });
      return;
    }
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
    formik.setFieldValue("items", newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
    formik.setFieldValue("items", newItems);
  };

  const handleMenuOpen = (event, challanId) => {
    setAnchorEl(event.currentTarget);
    setSelectedChallanId(challanId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedChallanId(null);
  };

  const handleOpenDialog = (challan, mode = "add") => {
    setSelectedChallan(challan);
    setDialogMode(mode);
    setOpenDialog(true);
    if (mode === "edit" || mode === "view") {
      setItems(challan.items);
      setDiscount(challan.discount.toString());
      formik.setValues({
        challanNo: challan.challanNo,
        date: format(parseISO(challan.date), "yyyy-MM-dd"),
        partyId: challan.partyId,
        notes: challan.notes || "",
        items: challan.items,
        discount: challan.discount.toString(),
      });
    } else {
      resetComponentState();
    }
  };

  const handleDeleteChallan = async (challanId) => {
    try {
      await deleteDoc(doc(db, "challans", challanId));
      setChallans((prev) => prev.filter((challan) => challan.id !== challanId));
      setFilteredChallans((prev) => prev.filter((challan) => challan.id !== challanId));
      setSelectedChallans((prev) => prev.filter((id) => id !== challanId));
      setSnackbar({
        open: true,
        message: "Challan deleted successfully",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to delete challan: " + error.message,
        severity: "error",
      });
    }
    handleMenuClose();
  };

  const handleConvertToInvoice = async (challan) => {
    try {
      // Fetch next bill number
      const billQuery = query(
        collection(db, "bills"),
        where("createdBy", "==", currentUser.uid)
      );
      const billSnapshot = await getDocs(billQuery);
      const nextBillNo = billSnapshot.empty
        ? 1
        : Math.max(...billSnapshot.docs.map((doc) => doc.data().billNo)) + 1;

      // Calculate totals for the invoice
      const subtotal = challan.items.reduce(
        (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0),
        0
      );
      const discountAmount = subtotal * (challan.discount / 100);
      const taxableAmount = subtotal - discountAmount;
      const isInterState = challan.partyDetails.state !== userState;

      // Default GST rate (can be customized based on your requirements)
      const gstRate = 5; // Example: 18% GST; adjust as needed
      const cgst = isInterState ? 0 : taxableAmount * (gstRate / 100 / 2);
      const sgst = isInterState ? 0 : taxableAmount * (gstRate / 100 / 2);
      const igst = isInterState ? taxableAmount * (gstRate / 100) : 0;
      const total = taxableAmount + (isInterState ? igst : cgst + sgst);
      const roundedTotal = Number(Math.round(total)).toFixed(2);
      const roundOff = Number(roundedTotal - total).toFixed(2);

      const billData = {
        billNo: nextBillNo,
        challanNo: challan.challanNo.toString(),
        date: challan.date,
        partyId: challan.partyId,
        items: challan.items,
        subtotal,
        discount: challan.discount,
        discountAmount,
        taxableAmount,
        cgst,
        sgst,
        igst,
        total,
        roundedTotal,
        roundOff,
        partyDetails: challan.partyDetails,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.uid,
        status: "pending",
        paymentMethod: "cheque",
        gstRate,
      };

      // Add to bills collection
      await addDoc(collection(db, "bills"), billData);

      // Update bill counter
      const counterRef = doc(db, "billCounters", `${currentUser.uid}`);
      await setDoc(counterRef, { lastBillNo: nextBillNo }, { merge: true });

      setSnackbar({
        open: true,
        message: `Challan converted to Invoice No. ${nextBillNo} successfully`,
        severity: "success",
      });
    } catch (error) {
      console.error("Error converting challan to invoice:", error);
      setSnackbar({
        open: true,
        message: "Failed to convert challan to invoice: " + error.message,
        severity: "error",
      });
    }
  };

  const handlePrint = async (challan) => {
    try {
      const pdfDoc = <ChallanPDF challans={[challan]} user={userData} />;
      const blob = await pdf(pdfDoc).toBlob();
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url);
      printWindow.onload = () => {
        printWindow.print();
        printWindow.onbeforeunload = () => URL.revokeObjectURL(url);
      };
    } catch (error) {
      console.error("Error generating print PDF:", error);
      setSnackbar({
        open: true,
        message: "Failed to generate print PDF: " + error.message,
        severity: "error",
      });
    }
    handleMenuClose();
  };

  const handlePrintSelected = async () => {
    try {
      const pdfDoc = (
        <ChallanPDF
          challans={challans.filter((challan) => selectedChallans.includes(challan.id))}
          user={userData}
        />
      );
      const blob = await pdf(pdfDoc).toBlob();
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url);
      printWindow.onload = () => {
        printWindow.print();
        printWindow.onbeforeunload = () => URL.revokeObjectURL(url);
      };
    } catch (error) {
      console.error("Error generating print PDF:", error);
      setSnackbar({
        open: true,
        message: "Failed to generate print PDF: " + error.message,
        severity: "error",
      });
    }
  };

  const handleShareWhatsApp = (challan) => {
    const message = `Challan No: ${challan.challanNo}\nParty: ${challan.partyDetails.companyName}\nDate: ${format(
      parseISO(challan.date),
      "dd-MM-yyyy"
    )}\nTotal: ₹${challan.roundedTotal}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    handleMenuClose();
  };

  const handleSelectChallan = (challanId) => {
    setSelectedChallans((prev) =>
      prev.includes(challanId)
        ? prev.filter((id) => id !== challanId)
        : [...prev, challanId]
    );
  };

  const handleDownloadSelectedPDFs = () => {
    if (selectedChallans.length === 0) {
      setSnackbar({
        open: true,
        message: "Please select at least one challan to download",
        severity: "error",
      });
      return;
    }
  };

  const handleSearch = () => {
    let filtered = [...challans];

    if (searchParty) {
      filtered = filtered.filter((challan) => challan.partyId === searchParty.id);
    }

    if (startDate && endDate) {
      filtered = filtered.filter((challan) => {
        try {
          const challanDate = parseISO(challan.date);
          return isWithinInterval(challanDate, {
            start: new Date(startDate),
            end: new Date(endDate),
          });
        } catch {
          return false;
        }
      });
    }

    setFilteredChallans(filtered);
  };

  useEffect(() => {
    handleSearch();
  }, [searchParty, startDate, endDate, challans]);

  const { subtotal, discountAmount, total, roundedTotal, roundOff } = calculateTotals();

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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, px: { xs: 1, sm: 2 } }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 2, width: "100%" }}>
        <Typography
          variant={isMobile ? "h5" : "h4"}
          gutterBottom
          sx={{
            mb: 4,
            fontWeight: "bold",
            color: "primary.main",
            textAlign: { xs: "center", sm: "left" },
            fontSize: { xs: "1rem", sm: "1.5rem", md: "1.75rem" },
          }}
        >
          Challan Book
        </Typography>

        {success && (
          <Alert
            severity="success"
            sx={{
              mb: 3,
              width: "100%",
              fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
            }}
          >
            Challan created successfully! Page will refresh...
          </Alert>
        )}
        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              width: "100%",
              fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
            }}
          >
            {error}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Autocomplete
              id="search-party"
              options={parties}
              getOptionLabel={(option) => option.companyName}
              value={searchParty}
              onChange={(event, newValue) => setSearchParty(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search by Party"
                  size="small"
                  sx={{
                    "& .MuiInputBase-root": {
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                    },
                  }}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{
                "& .MuiInputBase-root": {
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{
                "& .MuiInputBase-root": {
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                },
              }}
            />
          </Grid>
        </Grid>

        {selectedChallans.length > 0 && (
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2, gap: 1 }}>
            <PDFDownloadLink
              document={
                <ChallanPDF
                  challans={challans.filter((challan) => selectedChallans.includes(challan.id))}
                  user={userData}
                />
              }
              fileName="Challans.pdf"
            >
              {({ loading }) => (
                <Button
                  variant="contained"
                  color="primary"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <Download />}
                  onClick={handleDownloadSelectedPDFs}
                  size="small"
                  sx={{
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  }}
                >
                  {loading ? "Generating PDF..." : "Download Selected"}
                </Button>
              )}
            </PDFDownloadLink>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Print />}
              onClick={handlePrintSelected}
              size="small"
              sx={{
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              }}
            >
              Print Selected
            </Button>
          </Box>
        )}

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
                    checked={selectedChallans.length === filteredChallans.length && filteredChallans.length > 0}
                    onChange={() =>
                      setSelectedChallans(
                        selectedChallans.length === filteredChallans.length
                          ? []
                          : filteredChallans.map((challan) => challan.id)
                      )
                    }
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: "bold", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                  Challan No
                </TableCell>
                <TableCell sx={{ fontWeight: "bold", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                  Date
                </TableCell>
                <TableCell sx={{ fontWeight: "bold", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                  Party Name
                </TableCell>
                <TableCell sx={{ fontWeight: "bold", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                  Mobile
                </TableCell>
                <TableCell sx={{ fontWeight: "bold", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                  Amount
                </TableCell>
                <TableCell sx={{ fontWeight: "bold", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredChallans.length > 0 ? (
                filteredChallans.map((challan) => (
                  <TableRow key={challan.id} hover>
                    <TableCell>
                      <Checkbox
                        checked={selectedChallans.includes(challan.id)}
                        onChange={() => handleSelectChallan(challan.id)}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                      {challan.challanNo}
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                      {format(parseISO(challan.date), "dd-MM-yyyy")}
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                      {challan.partyDetails.companyName}
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                      {challan.partyDetails.mobile || "N/A"}
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                      ₹{challan.roundedTotal}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={(e) => handleMenuOpen(e, challan.id)}
                        size="small"
                      >
                        <MoreVert />
                      </IconButton>
                      <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl) && selectedChallanId === challan.id}
                        onClose={handleMenuClose}
                      >
                        <MenuItem
                          onClick={() => {
                            handleOpenDialog(challan, "view");
                            handleMenuClose();
                          }}
                          sx={{ fontSize: { xs: "0.85rem", sm: "0.95rem" } }}
                        >
                          <Visibility sx={{ mr: 1 }} /> View
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            handleOpenDialog(challan, "edit");
                            handleMenuClose();
                          }}
                          sx={{ fontSize: { xs: "0.85rem", sm: "0.95rem" } }}
                        >
                          <Edit sx={{ mr: 1 }} /> Edit
                        </MenuItem>
                        <MenuItem sx={{ fontSize: { xs: "0.85rem", sm: "0.95rem" } }}>
                          <PDFDownloadLink
                            document={<ChallanPDF challans={[challan]} user={userData} />}
                            fileName={`Challan_${challan.challanNo}.pdf`}
                          >
                            {({ loading }) => (
                              <Box sx={{ display: "flex", alignItems: "center" }}>
                                <Download sx={{ mr: 1 }} />
                                {loading ? "Generating..." : "Download"}
                              </Box>
                            )}
                          </PDFDownloadLink>
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            handlePrint(challan);
                          }}
                          sx={{ fontSize: { xs: "0.85rem", sm: "0.95rem" } }}
                        >
                          <Print sx={{ mr: 1 }} /> Print
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            handleShareWhatsApp(challan);
                          }}
                          sx={{ fontSize: { xs: "0.85rem", sm: "0.95rem" } }}
                        >
                          <Share sx={{ mr: 1 }} /> Share on WhatsApp
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            handleDeleteChallan(challan.id);
                          }}
                          sx={{ fontSize: { xs: "0.85rem", sm: "0.95rem" } }}
                        >
                          <Delete sx={{ mr: 1 }} /> Delete
                        </MenuItem>
                      </Menu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography
                      variant="body1"
                      sx={{
                        py: 3,
                        color: "text.secondary",
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      }}
                    >
                      No challans found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: "fixed", bottom: 16, right: 16 }}
          onClick={() => handleOpenDialog(null, "add")}
        >
          <AddIcon />
        </Fab>

        <Dialog
          open={openDialog}
          onClose={() => {
            setOpenDialog(false);
            setDialogMode("add");
            setSelectedChallan(null);
            resetComponentState();
          }}
          maxWidth="lg"
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
            {dialogMode === "view" ? "View Challan" : dialogMode === "edit" ? "Edit Challan" : "New Challan"}
          </DialogTitle>
          <DialogContent sx={{ mt: 2, px: { xs: 2, sm: 3 } }}>
            <form onSubmit={formik.handleSubmit}>
              <Grid container spacing={{ xs: 2, sm: 3 }}>
                <Grid item xs={12}>
                  <Autocomplete
                    id="partyId"
                    options={parties}
                    getOptionLabel={(option) => option.companyName}
                    value={parties.find((p) => p.id === formik.values.partyId) || null}
                    onChange={(event, newValue) => {
                      formik.setFieldValue("partyId", newValue ? newValue.id : "");
                    }}
                    onBlur={() => formik.setFieldTouched("partyId", true)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Party *"
                        size="small"
                        error={formik.touched.partyId && Boolean(formik.errors.partyId)}
                        helperText={formik.touched.partyId && formik.errors.partyId}
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                          },
                        }}
                      />
                    )}
                    disabled={dialogMode === "view"}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    id="challanNo"
                    name="challanNo"
                    label="Challan No"
                    value={dialogMode === "add" ? nextChallanNo || "" : formik.values.challanNo}
                    InputProps={{ readOnly: true }}
                    helperText="Auto-generated"
                    variant="outlined"
                    size="small"
                    sx={{
                      "& .MuiInputBase-root": {
                        fontSize: { xs: "0.85rem", sm: "0.9rem" },
                      },
                    }}
                    disabled
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    id="date"
                    name="date"
                    label="Challan Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={formik.values.date}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.date && Boolean(formik.errors.date)}
                    helperText={formik.touched.date && formik.errors.date}
                    inputProps={{ max: new Date().toISOString().split("T")[0] }}
                    variant="outlined"
                    size="small"
                    sx={{
                      "& .MuiInputBase-root": {
                        fontSize: { xs: "0.85rem", sm: "0.9rem" },
                      },
                    }}
                    disabled={dialogMode === "view"}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography
                    variant={isMobile ? "h6" : "h5"}
                    gutterBottom
                    sx={{
                      mt: 3,
                      mb: 2,
                      color: "text.primary",
                      textAlign: { xs: "center", sm: "left" },
                      fontSize: { xs: "1.25rem", sm: "1.5rem", md: "1.75rem" },
                    }}
                  >
                    Item Details
                  </Typography>
                  <TableContainer
                    component={Paper}
                    elevation={2}
                    sx={{
                      mb: 3,
                      borderRadius: 2,
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
                            Item Name
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: "bold",
                              fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                            }}
                          >
                            HSN Code
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: "bold",
                              fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                            }}
                          >
                            Quantity
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: "bold",
                              fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                            }}
                          >
                            Price (₹)
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: "bold",
                              fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                            }}
                          >
                            Amount (₹)
                          </TableCell>
                          {dialogMode !== "view" && (
                            <TableCell
                              sx={{
                                fontWeight: "bold",
                                fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                              }}
                            >
                              Action
                            </TableCell>
                          )}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {items.map((item, index) => (
                          <TableRow key={index} hover>
                            <TableCell>
                              <TextField
                                fullWidth
                                size="small"
                                value={item.name}
                                onChange={(e) => handleItemChange(index, "name", e.target.value)}
                                onBlur={() => formik.setFieldTouched(`items[${index}].name`, true)}
                                placeholder="Enter item name"
                                variant="outlined"
                                error={
                                  formik.touched.items &&
                                  formik.touched.items[index]?.name &&
                                  Boolean(formik.errors.items && formik.errors.items[index]?.name)
                                }
                                helperText={
                                  formik.touched.items &&
                                  formik.touched.items[index]?.name &&
                                  formik.errors.items &&
                                  formik.errors.items[index]?.name
                                }
                                sx={{
                                  minWidth: { xs: 100, sm: 150 },
                                  "& .MuiInputBase-root": {
                                    fontSize: { xs: "0.85rem", sm: "0.9rem" },
                                  },
                                  "& .MuiFormHelperText-root": {
                                    color: "error.main",
                                  },
                                }}
                                disabled={dialogMode === "view"}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                fullWidth
                                size="small"
                                value={item.hsn}
                                onChange={(e) => handleItemChange(index, "hsn", e.target.value)}
                                onBlur={() => formik.setFieldTouched(`items[${index}].hsn`, true)}
                                placeholder="Enter HSN code (optional)"
                                variant="outlined"
                                error={
                                  formik.touched.items &&
                                  formik.touched.items[index]?.hsn &&
                                  Boolean(formik.errors.items && formik.errors.items[index]?.hsn)
                                }
                                helperText={
                                  formik.touched.items &&
                                  formik.touched.items[index]?.hsn &&
                                  formik.errors.items &&
                                  formik.errors.items[index]?.hsn
                                }
                                sx={{
                                  minWidth: { xs: 80, sm: 120 },
                                  "& .MuiInputBase-root": {
                                    fontSize: { xs: "0.85rem", sm: "0.9rem" },
                                  },
                                  "& .MuiFormHelperText-root": {
                                    color: "error.main",
                                  },
                                }}
                                disabled={dialogMode === "view"}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                fullWidth
                                size="small"
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                onBlur={() => formik.setFieldTouched(`items[${index}].quantity`, true)}
                                inputProps={{ min: 1, step: 1 }}
                                placeholder="Enter quantity"
                                variant="outlined"
                                error={
                                  formik.touched.items &&
                                  formik.touched.items[index]?.quantity &&
                                  Boolean(formik.errors.items && formik.errors.items[index]?.quantity)
                                }
                                helperText={
                                  formik.touched.items &&
                                  formik.touched.items[index]?.quantity &&
                                  formik.errors.items &&
                                  formik.errors.items[index]?.quantity
                                }
                                sx={{
                                  minWidth: { xs: 60, sm: 80 },
                                  "& .MuiInputBase-root": {
                                    fontSize: { xs: "0.85rem", sm: "0.9rem" },
                                  },
                                  "& .MuiFormHelperText-root": {
                                    color: "error.main",
                                  },
                                }}
                                disabled={dialogMode === "view"}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                fullWidth
                                size="small"
                                type="number"
                                value={item.price}
                                onChange={(e) => handleItemChange(index, "price", e.target.value)}
                                onBlur={() => formik.setFieldTouched(`items[${index}].price`, true)}
                                inputProps={{ min: 0, step: 0.01 }}
                                placeholder="Enter price"
                                variant="outlined"
                                error={
                                  formik.touched.items &&
                                  formik.touched.items[index]?.price &&
                                  Boolean(formik.errors.items && formik.errors.items[index]?.price)
                                }
                                helperText={
                                  formik.touched.items &&
                                  formik.touched.items[index]?.price &&
                                  formik.errors.items &&
                                  formik.errors.items[index]?.price
                                }
                                sx={{
                                  minWidth: { xs: 80, sm: 100 },
                                  "& .MuiInputBase-root": {
                                    fontSize: { xs: "0.85rem", sm: "0.9rem" },
                                  },
                                  "& .MuiFormHelperText-root": {
                                    color: "error.main",
                                  },
                                }}
                                disabled={dialogMode === "view"}
                              />
                            </TableCell>
                            <TableCell
                              sx={{
                                fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" },
                              }}
                            >
                              {((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)).toFixed(2)}
                            </TableCell>
                            {dialogMode !== "view" && (
                              <TableCell>
                                <IconButton
                                  color="error"
                                  onClick={() => handleRemoveItem(index)}
                                  size={isMobile ? "small" : "medium"}
                                >
                                  <Delete />
                                </IconButton>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {dialogMode !== "view" && (
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<AddIcon />}
                      onClick={handleAddItem}
                      size="small"
                      sx={{
                        mb: 3,
                        minWidth: { xs: "100%", sm: "160px" },
                        fontSize: { xs: "0.85rem", sm: "0.9rem" },
                        textTransform: "none",
                      }}
                    >
                      Add New Item
                    </Button>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <Typography
                    variant={isMobile ? "h6" : "h5"}
                    gutterBottom
                    sx={{
                      mt: 3,
                      mb: 2,
                      color: "text.primary",
                      textAlign: { xs: "center", sm: "left" },
                      fontSize: { xs: "1.25rem", sm: "1.5rem", md: "1.75rem" },
                    }}
                  >
                    Additional Details (Optional)
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    id="discount"
                    name="discount"
                    label="Discount (%)"
                    type="text"
                    value={formik.values.discount}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDiscount(value);
                      formik.setFieldValue("discount", value);
                    }}
                    onBlur={formik.handleBlur}
                    placeholder="Enter discount percentage (optional)"
                    variant="outlined"
                    size="small"
                    error={formik.touched.discount && Boolean(formik.errors.discount)}
                    helperText={formik.touched.discount && formik.errors.discount}
                    sx={{
                      "& .MuiInputBase-root": {
                        fontSize: { xs: "0.85rem", sm: "0.9rem" },
                      },
                      "& .MuiFormHelperText-root": {
                        color: "error.main",
                      },
                    }}
                    disabled={dialogMode === "view"}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    id="notes"
                    name="notes"
                    label="Additional Notes"
                    value={formik.values.notes}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    multiline
                    rows={isMobile ? 2 : 3}
                    placeholder="Add any additional information (optional)"
                    variant="outlined"
                    size="small"
                    error={formik.touched.notes && Boolean(formik.errors.notes)}
                    helperText={formik.touched.notes && formik.errors.notes}
                    sx={{
                      "& .MuiInputBase-root": {
                        fontSize: { xs: "0.85rem", sm: "0.9rem" },
                      },
                      "& .MuiFormHelperText-root": {
                        color: "error.main",
                      },
                    }}
                    disabled={dialogMode === "view"}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Paper
                    elevation={2}
                    sx={{
                      p: { xs: 2, sm: 3 },
                      mt: 3,
                      borderRadius: 2,
                      backgroundColor: "background.default",
                      width: "100%",
                    }}
                  >
                    <Grid container spacing={2} direction={isMobile ? "column" : "row"}>
                      <Grid item xs={12} md={6}>
                        <Typography
                          variant="body1"
                          gutterBottom
                          sx={{
                            fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                          }}
                        >
                          <strong>Subtotal:</strong> ₹{subtotal.toFixed(2)}
                        </Typography>
                        <Typography
                          variant="body1"
                          gutterBottom
                          sx={{
                            fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                          }}
                        >
                          <strong>Discount ({parseFloat(discount) || 0}%):</strong>{" "}
                          ₹{discountAmount.toFixed(2)}
                        </Typography>
                        <Typography
                          variant="body1"
                          gutterBottom
                          sx={{
                            fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                          }}
                        >
                          <strong>Round Off:</strong> ₹{Math.abs(roundOff).toFixed(2)}
                        </Typography>
                        <Typography
                          variant="h6"
                          sx={{
                            mt: 2,
                            color: "primary.main",
                            fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" },
                          }}
                        >
                          <strong>Total Amount:</strong> ₹{roundedTotal}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontStyle: "italic",
                            color: "text.secondary",
                            fontSize: { xs: "0.75rem", sm: "0.875rem", md: "1rem" },
                            wordBreak: "break-word",
                          }}
                        >
                          <strong>Amount in Words:</strong>{" "}
                          {numberToWords(parseFloat(roundedTotal))}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>
            </form>
          </DialogContent>
          <DialogActions sx={{ p: { xs: 1, sm: 2 } }}>
            {(dialogMode === "view" || dialogMode === "edit") && selectedChallan && (
              <Button
                variant="contained"
                color="secondary"
                size="small"
                onClick={() => handleConvertToInvoice(selectedChallan)}
                sx={{
                  minWidth: { xs: "100%", sm: "160px" },
                  fontSize: { xs: "0.85rem", sm: "0.9rem" },
                  textTransform: "none",
                }}
              >
                Convert to Invoice
              </Button>
            )}
            {dialogMode !== "view" && (
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="small"
                startIcon={isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
                disabled={isSubmitting || !nextChallanNo}
                onClick={formik.handleSubmit}
                sx={{
                  minWidth: { xs: "100%", sm: "160px" },
                  fontSize: { xs: "0.85rem", sm: "0.9rem" },
                  textTransform: "none",
                }}
              >
                {isSubmitting
                  ? "Processing..."
                  : dialogMode === "edit"
                  ? "Update Challan"
                  : "Generate Challan"}
              </Button>
            )}
            <Button
              onClick={() => {
                setOpenDialog(false);
                setDialogMode("add");
                setSelectedChallan(null);
                resetComponentState();
              }}
              variant="outlined"
              color="primary"
              size="small"
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

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
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

export default ChallanBook;