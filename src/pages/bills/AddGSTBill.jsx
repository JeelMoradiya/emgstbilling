// AddGSTBill.jsx
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
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
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
  Select,
  MenuItem as SelectMenuItem,
  InputLabel,
  FormControl,
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
  Search,
} from "@mui/icons-material";
import { numberToWords } from "../../utils/utils";
import { PDFDownloadLink, pdf } from "@react-pdf/renderer";
import BillPDF from "./BillPDF";
import logo from "../../assets/logo.gif";
import { Buffer } from "buffer";
import BillListPDF from "./BillListPDF";

if (typeof window !== "undefined") {
  window.Buffer = window.Buffer || Buffer;
}

const AddGSTBill = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [parties, setParties] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([
    { name: "", hsn: "", quantity: "", price: "" },
  ]);
  const [discount, setDiscount] = useState("");
  const [nextBillNo, setNextBillNo] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState("add");
  const [selectedBill, setSelectedBill] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedBillId, setSelectedBillId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [selectedBills, setSelectedBills] = useState([]);
  const [userData, setUserData] = useState({});
  const [searchParty, setSearchParty] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [userState, setUserState] = useState("");
  const [partySearchInput, setPartySearchInput] = useState("");

  const validationSchema = Yup.object({
    partyId: Yup.string()
      .required("Party is required")
      .min(1, "Party selection is required"),
    gstRate: Yup.number()
      .required("GST rate is required")
      .min(0, "GST rate cannot be negative")
      .oneOf([0, 5, 12, 18, 28], "Invalid GST rate"),
    date: Yup.date()
      .required("Invoice date is required")
      .max(new Date(), "Date cannot be in the future")
      .typeError("Invalid date format"),
    challanNo: Yup.string()
      .matches(/^[0-9-]{1,20}$/, "Invalid party challan number format")
      .max(20, "Party Challan number cannot exceed 20 characters"),
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
          (/^\d*\.?\d*$/.test(value) &&
            parseFloat(value) >= 0 &&
            parseFloat(value) <= 100)
      ),
    notes: Yup.string()
      .optional()
      .max(500, "Notes cannot exceed 500 characters"),
  });

  const formik = useFormik({
    initialValues: {
      billNo: "",
      challanNo: "",
      date: format(new Date(), "yyyy-MM-dd"),
      partyId: "",
      paymentMethod: "cheque",
      gstRate: 0,
      status: "pending",
      notes: "",
      items: items,
      discount: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      if (!currentUser) {
        setError("Please log in to create bills");
        return;
      }

      setIsSubmitting(true);
      setSuccess(false);
      setError(null);

      try {
        let billNoToUse = values.billNo;
        if (dialogMode === "add") {
          billNoToUse = nextBillNo;
        }

        const billQuery = query(
          collection(db, "bills"),
          where("createdBy", "==", currentUser.uid),
          where("billNo", "==", billNoToUse)
        );
        const existingBills = await getDocs(billQuery);

        if (!existingBills.empty && dialogMode === "add") {
          setError(`Bill number ${billNoToUse} already exists`);
          setIsSubmitting(false);
          return;
        }

        const {
          subtotal,
          discountAmount,
          taxableAmount,
          cgst,
          sgst,
          igst,
          total,
          roundedTotal,
          roundOff,
        } = calculateTotals();
        const selectedParty = parties.find((p) => p.id === values.partyId);

        const normalizedItems = items.map((item) => ({
          ...item,
          price: parseFloat(item.price) || 0,
          quantity: parseFloat(item.quantity) || 0,
        }));

        const billData = {
          ...values,
          billNo: billNoToUse,
          partyId: values.partyId,
          items: normalizedItems,
          subtotal,
          discount: parseFloat(discount) || 0,
          discountAmount,
          taxableAmount,
          cgst,
          sgst,
          igst,
          total,
          roundedTotal,
          roundOff,
          partyDetails: selectedParty,
          createdAt: new Date().toISOString(),
          createdBy: currentUser.uid,
        };

        if (dialogMode === "edit" && selectedBill) {
          const billRef = doc(db, "bills", selectedBill.id);
          await updateDoc(billRef, billData);
          setBills((prev) =>
            prev.map((bill) =>
              bill.id === selectedBill.id ? { id: bill.id, ...billData } : bill
            )
          );
        } else {
          const docRef = await addDoc(collection(db, "bills"), billData);
          setBills((prev) => [...prev, { id: docRef.id, ...billData }]);
          const counterRef = doc(db, "billCounters", `${currentUser.uid}`);
          await setDoc(counterRef, { lastBillNo: nextBillNo }, { merge: true });
          setNextBillNo(nextBillNo + 1);
        }

        setSnackbar({
          open: true,
          message:
            dialogMode === "edit"
              ? "Bill updated successfully"
              : "Bill created successfully",
          severity: "success",
        });
        setTimeout(() => {
          setSuccess(false);
          resetComponentState();
          setOpenDialog(false);
          setDialogMode("add");
          setSelectedBill(null);
        }, 2000);
      } catch (error) {
        console.error("Error generating bill: ", error);
        setError("Failed to create bill: " + error.message);
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const resetComponentState = () => {
    setItems([{ name: "", hsn: "", quantity: "", price: "" }]);
    setDiscount("");
    setPartySearchInput("");
    formik.resetForm({
      values: {
        billNo: "",
        challanNo: "",
        date: format(new Date(), "yyyy-MM-dd"),
        partyId: "",
        paymentMethod: "cheque",
        gstRate: 0,
        status: "pending",
        notes: "",
        items: [{ name: "", hsn: "", quantity: "", price: "" }],
        discount: "",
      },
    });
    if (dialogMode === "add") {
      fetchNextBillNo();
    }
  };

  useEffect(() => {
    const fetchPartiesAndBills = async () => {
      if (!currentUser) return;
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserData(userSnap.data());
          setUserState(userSnap.data().address?.state || "");
        } else {
          console.warn("User data not found, using fallback");
          setUserData({
            companyName: "Your Company",
            gstNo: "N/A",
            udyamNo: "N/A",
          });
          setUserState("");
        }

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

        const billQuery = query(
          collection(db, "bills"),
          where("createdBy", "==", currentUser.uid)
        );
        const billSnapshot = await getDocs(billQuery);
        const billsData = billSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .sort((a, b) => Number(a.billNo) - Number(b.billNo));
        setBills(billsData);
        setFilteredBills(billsData);
      } catch (err) {
        setError("Failed to fetch parties or bills: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPartiesAndBills();
  }, [currentUser]);

  const fetchNextBillNo = async () => {
    if (!currentUser) return;
    try {
      const counterRef = doc(db, "billCounters", `${currentUser.uid}`);
      const counterSnap = await getDoc(counterRef);
      if (counterSnap.exists()) {
        setNextBillNo(counterSnap.data().lastBillNo + 1);
      } else {
        setNextBillNo(1);
      }
    } catch (err) {
      console.error("Error fetching bill counter:", err);
      setNextBillNo(1);
    }
  };

  useEffect(() => {
    if (dialogMode === "add") {
      fetchNextBillNo();
    }
  }, [dialogMode, currentUser]);

  const calculateTotals = () => {
    const subtotal = items.reduce(
      (sum, item) =>
        sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0),
      0
    );
    const discountAmount = subtotal * ((parseFloat(discount) || 0) / 100);
    const taxableAmount = subtotal - discountAmount;
    const selectedParty = parties.find((p) => p.id === formik.values.partyId);
    const isInterState = selectedParty && selectedParty.state !== userState;

    const cgst = isInterState
      ? 0
      : taxableAmount * (formik.values.gstRate / 100 / 2);
    const sgst = isInterState
      ? 0
      : taxableAmount * (formik.values.gstRate / 100 / 2);
    const igst = isInterState
      ? taxableAmount * (formik.values.gstRate / 100)
      : 0;
    const total = taxableAmount + (isInterState ? igst : cgst + sgst);
    const roundedTotal = Number(Math.round(total)).toFixed(2);
    const roundOff = Number(roundedTotal - total).toFixed(2);

    return {
      subtotal,
      discountAmount,
      taxableAmount,
      cgst,
      sgst,
      igst,
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
        message: "An invoice must have at least one item",
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

  const handleMenuOpen = (event, billId) => {
    setAnchorEl(event.currentTarget);
    setSelectedBillId(billId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedBillId(null);
  };

  const handleOpenDialog = (bill, mode = "add") => {
    setSelectedBill(bill);
    setDialogMode(mode);
    setOpenDialog(true);
    if (mode === "edit") {
      setItems(bill.items);
      setDiscount(bill.discount.toString());
      formik.setValues({
        billNo: bill.billNo,
        challanNo: bill.challanNo || "",
        date: format(parseISO(bill.date), "yyyy-MM-dd"),
        partyId: bill.partyId,
        paymentMethod: bill.paymentMethod,
        gstRate: bill.gstRate,
        status: bill.status,
        notes: bill.notes || "",
        items: bill.items,
        discount: bill.discount.toString(),
      });
    } else {
      resetComponentState();
    }
  };

  const handleDeleteBill = async (billId) => {
    try {
      await deleteDoc(doc(db, "bills", billId));
      setBills((prev) => prev.filter((bill) => bill.id !== billId));
      setFilteredBills((prev) => prev.filter((bill) => bill.id !== billId));
      setSelectedBills((prev) => prev.filter((id) => id !== billId));
      setSnackbar({
        open: true,
        message: "Bill deleted successfully",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to delete bill: " + error.message,
        severity: "error",
      });
    }
    handleMenuClose();
  };

  const handlePrint = async (bill) => {
    try {
      const pdfDoc = <BillPDF bill={bill} user={userData} />;
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

  const handleShareWhatsApp = async (bill) => {
    try {
      const pdfDoc = <BillPDF bill={bill} user={userData} />;
      const blob = await pdf(pdfDoc).toBlob();
      const file = new File([blob], `invoice_${bill.billNo}.pdf`, {
        type: "application/pdf",
      });
      const message = `Bill No: ${bill.billNo}\nParty: ${
        bill.partyDetails.companyName
      }\nDate: ${format(parseISO(bill.date), "dd-MM-yyyy")}\nTotal: ₹${
        bill.roundedTotal
      }\n\nDownload PDF: `;
      const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
      if (navigator.share) {
        await navigator.share({
          files: [file],
          text: message,
        });
      }
    } catch (error) {
      console.error("Error sharing bill:", error);
      setSnackbar({
        open: true,
        message: "Failed to share bill: " + error.message,
        severity: "error",
      });
    }
    handleMenuClose();
  };

  const handleSelectBill = (billId) => {
    setSelectedBills((prev) =>
      prev.includes(billId)
        ? prev.filter((id) => id !== billId)
        : [...prev, billId]
    );
  };

  // Handle print selected bills
  const handlePrintSelected = async () => {
    if (selectedBills.length === 0) {
      setSnackbar({
        open: true,
        message: "Please select at least one bill to print",
        severity: "error",
      });
      return;
    }
    try {
      const selectedBillsData = bills.filter((bill) =>
        selectedBills.includes(bill.id)
      );
      const pdfDoc = <BillListPDF bills={selectedBillsData} user={userData} />;
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

  const handleShareSelectedWhatsApp = async () => {
    if (selectedBills.length === 0) {
      setSnackbar({
        open: true,
        message: "Please select at least one bill to share",
        severity: "error",
      });
      return;
    }
    try {
      const selectedBillsData = bills.filter((bill) =>
        selectedBills.includes(bill.id)
      );
      const pdfDoc = <BillListPDF bills={selectedBillsData} user={userData} />;
      const blob = await pdf(pdfDoc).toBlob();
      const file = new File([blob], `selected_invoices.pdf`, {
        type: "application/pdf",
      });
      const message = `Selected Bills:\n${selectedBillsData
        .map(
          (bill) =>
            `Bill No: ${bill.billNo}, Party: ${
              bill.partyDetails.companyName
            }, Date: ${format(parseISO(bill.date), "dd-MM-yyyy")}, Total: ₹${
              bill.roundedTotal
            }`
        )
        .join("\n")}\n\nDownload PDF: `;
      const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
      if (navigator.share) {
        await navigator.share({
          files: [file],
          text: message,
        });
      }
    } catch (error) {
      console.error("Error sharing selected bills:", error);
      setSnackbar({
        open: true,
        message: "Failed to share selected bills: " + error.message,
        severity: "error",
      });
    }
  };

const handleSearch = () => {
    const filtered = bills.filter((bill) => {
      const partyMatch = searchParty
        ? bill.partyId === searchParty.id // Adjust based on your bill structure
        : true;
      const dateMatch =
        (startDate
          ? new Date(bill.date) >= new Date(startDate)
          : true) &&
        (endDate ? new Date(bill.date) <= new Date(endDate) : true);
      return partyMatch && dateMatch;
    });
    setFilteredBills(filtered);
  };

  useEffect(() => {
    handleSearch();
  }, [searchParty, startDate, endDate, bills]);

  const {
    subtotal,
    discountAmount,
    taxableAmount,
    cgst,
    sgst,
    igst,
    total,
    roundedTotal,
    roundOff,
  } = calculateTotals();

  const calculateSelectedTotals = () => {
    let totalCons = 0;
    let totalQty = 0;
    let totalAmount = 0;

    const selectedBillsData = bills.filter((bill) =>
      selectedBills.includes(bill.id)
    );
    selectedBillsData.forEach((bill) => {
      bill.items.forEach((item) => {
        totalCons += 15.0; // As per the image
        totalQty += parseFloat(item.quantity) || 0;
        totalAmount +=
          (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
      });
    });

    return { totalCons, totalQty, totalAmount };
  };

  const { totalCons, totalQty, totalAmount } = calculateSelectedTotals();

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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, px: { xs: 1, sm: 2 } }}>
      <Paper
        elevation={3}
        sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 2, width: "100%" }}
      >
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
          Sale Invoices
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
            Bill created successfully! Page will refresh...
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

        <Grid container display="flex" spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12}>
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
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSearch}
                size="small"
                sx={{
                  width: { xs: "100%", sm: "auto" },
                  height: { xs: "40px", sm: "40px" },
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                }}
              >
                <Search />
              </Button>
              {selectedBills.length > 0 && (
                <>
                  <PDFDownloadLink
                    document={
                      <BillListPDF
                        bills={bills.filter((bill) =>
                          selectedBills.includes(bill.id)
                        )}
                        user={userData}
                      />
                    }
                    fileName="Selected_Bills.pdf"
                  >
                    {({ loading }) => (
                      <Button
                        variant="contained"
                        color="primary"
                        disabled={loading}
                        size="small"
                        sx={{
                          width: { xs: "100%", sm: "auto" },
                          height: { xs: "40px", sm: "40px" },
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                        }}
                      >
                        {loading ? (
                          <CircularProgress size={20} />
                        ) : (
                          <Download />
                        )}
                      </Button>
                    )}
                  </PDFDownloadLink>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handlePrintSelected}
                    size="small"
                    sx={{
                      width: { xs: "100%", sm: "auto" },
                      height: { xs: "40px", sm: "40px" },
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    }}
                  >
                    <Print />
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleShareSelectedWhatsApp}
                    size="small"
                    sx={{
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    }}
                  >
                    <Share />
                  </Button>
                </>
              )}
            </Box>
          </Grid>
        </Grid>

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
                    checked={
                      selectedBills.length === filteredBills.length &&
                      filteredBills.length > 0
                    }
                    onChange={() =>
                      setSelectedBills(
                        selectedBills.length === filteredBills.length
                          ? []
                          : filteredBills.map((bill) => bill.id)
                      )
                    }
                  />
                </TableCell>
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
                  Party Name
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
                  }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBills.length > 0 ? (
                filteredBills.map((bill) => (
                  <TableRow key={bill.id} hover>
                    <TableCell>
                      <Checkbox
                        checked={selectedBills.includes(bill.id)}
                        onChange={() => handleSelectBill(bill.id)}
                      />
                    </TableCell>
                    <TableCell
                      sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                    >
                      {bill.billNo}
                    </TableCell>
                    <TableCell
                      sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                    >
                      {format(parseISO(bill.date), "dd-MM-yyyy")}
                    </TableCell>
                    <TableCell
                      sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                    >
                      {bill.partyDetails.companyName}
                    </TableCell>
                    <TableCell
                      sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                    >
                      ₹{bill.roundedTotal}
                    </TableCell>
                    <TableCell>
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
                          onClick={() => {
                            navigate(`/bill/${bill.id}`);
                            handleMenuClose();
                          }}
                          sx={{ fontSize: { xs: "0.85rem", sm: "0.95rem" } }}
                        >
                          <Visibility sx={{ mr: 1 }} /> View
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            handleOpenDialog(bill, "edit");
                            handleMenuClose();
                          }}
                          sx={{ fontSize: { xs: "0.85rem", sm: "0.95rem" } }}
                        >
                          <Edit sx={{ mr: 1 }} /> Edit
                        </MenuItem>
                        <MenuItem
                          sx={{ fontSize: { xs: "0.85rem", sm: "0.95rem" } }}
                        >
                          <PDFDownloadLink
                            document={<BillPDF bill={bill} user={userData} />}
                            fileName={`invoice_${bill.billNo}.pdf`}
                          >
                            {({ loading }) => (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <Download sx={{ fontSize: 18 }} />
                                {loading ? "Preparing..." : "Download"}
                              </Box>
                            )}
                          </PDFDownloadLink>
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            handlePrint(bill);
                          }}
                          sx={{ fontSize: { xs: "0.85rem", sm: "0.95rem" } }}
                        >
                          <Print sx={{ mr: 1 }} /> Print
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            handleShareWhatsApp(bill);
                          }}
                          sx={{ fontSize: { xs: "0.85rem", sm: "0.95rem" } }}
                        >
                          <Share sx={{ mr: 1 }} /> Share on WhatsApp
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            handleDeleteBill(bill.id);
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
                  <TableCell colSpan={6} align="center">
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
            setSelectedBill(null);
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
            {dialogMode === "edit" ? "Edit Bill" : "New GST Invoice"}
          </DialogTitle>
          <DialogContent sx={{ mt: 3, px: { xs: 3, sm: 4 } }}>
            <form onSubmit={formik.handleSubmit}>
              <Grid container spacing={{ xs: 2, sm: 3 }}>
                <Grid item xs={12}>
                  <Autocomplete
                    id="partyId"
                    options={parties}
                    getOptionLabel={(option) =>
                      `${option.companyName} (${option.gstNo})`
                    }
                    value={
                      parties.find((p) => p.id === formik.values.partyId) ||
                      null
                    }
                    onChange={(event, newValue) => {
                      formik.setFieldValue(
                        "partyId",
                        newValue ? newValue.id : ""
                      );
                    }}
                    onBlur={() => formik.setFieldTouched("partyId", true)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Party *"
                        size="small"
                        error={
                          formik.touched.partyId &&
                          Boolean(formik.errors.partyId)
                        }
                        helperText={
                          formik.touched.partyId && formik.errors.partyId
                        }
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                          },
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    id="billNo"
                    name="billNo"
                    label="Invoice No"
                    value={
                      dialogMode === "add"
                        ? nextBillNo || ""
                        : formik.values.billNo
                    }
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

                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    id="challanNo"
                    name="challanNo"
                    label="Party Challan No *"
                    value={formik.values.challanNo}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.challanNo &&
                      Boolean(formik.errors.challanNo)
                    }
                    helperText={
                      formik.touched.challanNo && formik.errors.challanNo
                    }
                    variant="outlined"
                    size="small"
                    sx={{
                      "& .MuiInputBase-root": {
                        fontSize: { xs: "0.85rem", sm: "0.9rem" },
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    id="date"
                    name="date"
                    label="Invoice Date"
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
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <FormControl
                    fullWidth
                    error={
                      formik.touched.status && Boolean(formik.errors.status)
                    }
                  >
                    <InputLabel
                      id="status-label"
                      sx={{
                        fontSize: { xs: "0.85rem", sm: "0.9rem" },
                        top: "-6px",
                      }}
                    >
                      Status *
                    </InputLabel>
                    <Select
                      labelId="status-label"
                      id="status"
                      name="status"
                      value={formik.values.status}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      size="small"
                      sx={{
                        "& .MuiInputBase-root": {
                          fontSize: { xs: "0.85rem", sm: "0.9rem" },
                        },
                      }}
                    >
                      <SelectMenuItem value="pending">Pending</SelectMenuItem>
                      <SelectMenuItem value="paid">Paid</SelectMenuItem>
                    </Select>
                    {formik.touched.status && formik.errors.status && (
                      <Typography
                        color="error"
                        variant="caption"
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.75rem" } }}
                      >
                        {formik.errors.status}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <FormControl
                    fullWidth
                    error={
                      formik.touched.gstRate && Boolean(formik.errors.gstRate)
                    }
                  >
                    <InputLabel
                      id="gst-rate-label"
                      sx={{
                        fontSize: { xs: "0.85rem", sm: "0.9rem" },
                        top: "-6px",
                      }}
                    >
                      GST Rate (%) *
                    </InputLabel>
                    <Select
                      labelId="gst-rate-label"
                      id="gstRate"
                      name="gstRate"
                      value={formik.values.gstRate}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      size="small"
                      sx={{
                        "& .MuiInputBase-root": {
                          fontSize: { xs: "0.85rem", sm: "0.9rem" },
                        },
                      }}
                    >
                      <SelectMenuItem value={0}>0%</SelectMenuItem>
                      <SelectMenuItem value={5}>5%</SelectMenuItem>
                      <SelectMenuItem value={12}>12%</SelectMenuItem>
                      <SelectMenuItem value={18}>18%</SelectMenuItem>
                      <SelectMenuItem value={28}>28%</SelectMenuItem>
                    </Select>
                    {formik.touched.gstRate && formik.errors.gstRate && (
                      <Typography
                        color="error"
                        variant="caption"
                        sx={{ fontSize: { xs: "0.75rem", sm: "0.75rem" } }}
                      >
                        {formik.errors.gstRate}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{
                      mt: 2,
                      mb: 1,
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                      fontWeight: "bold",
                    }}
                  >
                    Items Details
                  </Typography>
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
                            }}
                          >
                            Item Name
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: "bold",
                              fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            }}
                          >
                            HSN Code
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: "bold",
                              fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            }}
                          >
                            Quantity
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: "bold",
                              fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            }}
                          >
                            Price
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
                            }}
                          >
                            Actions
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {items.map((item, index) => (
                          <TableRow key={index} hover>
                            <TableCell
                              sx={{
                                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                              }}
                            >
                              <TextField
                                fullWidth
                                label="Item Name *"
                                value={item.name}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "name",
                                    e.target.value
                                  )
                                }
                                onBlur={() =>
                                  formik.setFieldTouched(
                                    `items[${index}].name`,
                                    true
                                  )
                                }
                                error={
                                  formik.touched.items?.[index]?.name &&
                                  Boolean(formik.errors.items?.[index]?.name)
                                }
                                helperText={
                                  formik.touched.items?.[index]?.name &&
                                  formik.errors.items?.[index]?.name
                                }
                                size="small"
                                sx={{
                                  "& .MuiInputBase-root": {
                                    fontSize: { xs: "0.85rem", sm: "0.9rem" },
                                  },
                                }}
                              />
                            </TableCell>
                            <TableCell
                              sx={{
                                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                              }}
                            >
                              <TextField
                                fullWidth
                                label="HSN Code"
                                value={item.hsn}
                                onChange={(e) =>
                                  handleItemChange(index, "hsn", e.target.value)
                                }
                                onBlur={() =>
                                  formik.setFieldTouched(
                                    `items[${index}].hsn`,
                                    true
                                  )
                                }
                                error={
                                  formik.touched.items?.[index]?.hsn &&
                                  Boolean(formik.errors.items?.[index]?.hsn)
                                }
                                helperText={
                                  formik.touched.items?.[index]?.hsn &&
                                  formik.errors.items?.[index]?.hsn
                                }
                                size="small"
                                sx={{
                                  "& .MuiInputBase-root": {
                                    fontSize: { xs: "0.85rem", sm: "0.9rem" },
                                  },
                                }}
                              />
                            </TableCell>
                            <TableCell
                              sx={{
                                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                              }}
                            >
                              <TextField
                                fullWidth
                                label="Quantity *"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "quantity",
                                    e.target.value
                                  )
                                }
                                onBlur={() =>
                                  formik.setFieldTouched(
                                    `items[${index}].quantity`,
                                    true
                                  )
                                }
                                error={
                                  formik.touched.items?.[index]?.quantity &&
                                  Boolean(
                                    formik.errors.items?.[index]?.quantity
                                  )
                                }
                                helperText={
                                  formik.touched.items?.[index]?.quantity &&
                                  formik.errors.items?.[index]?.quantity
                                }
                                size="small"
                                sx={{
                                  "& .MuiInputBase-root": {
                                    fontSize: { xs: "0.85rem", sm: "0.9rem" },
                                  },
                                }}
                              />
                            </TableCell>
                            <TableCell
                              sx={{
                                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                              }}
                            >
                              <TextField
                                fullWidth
                                label="Price *"
                                value={item.price}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "price",
                                    e.target.value
                                  )
                                }
                                onBlur={() =>
                                  formik.setFieldTouched(
                                    `items[${index}].price`,
                                    true
                                  )
                                }
                                error={
                                  formik.touched.items?.[index]?.price &&
                                  Boolean(formik.errors.items?.[index]?.price)
                                }
                                helperText={
                                  formik.touched.items?.[index]?.price &&
                                  formik.errors.items?.[index]?.price
                                }
                                size="small"
                                sx={{
                                  "& .MuiInputBase-root": {
                                    fontSize: { xs: "0.85rem", sm: "0.9rem" },
                                  },
                                }}
                              />
                            </TableCell>
                            <TableCell
                              sx={{
                                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                              }}
                            >
                              <Typography variant="body2">
                                {(item.quantity * item.price).toFixed(2)}
                              </Typography>
                            </TableCell>
                            <TableCell
                              sx={{
                                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                              }}
                            >
                              <IconButton
                                color="error"
                                onClick={() => handleRemoveItem(index)}
                                disabled={items.length <= 1}
                                size="small"
                              >
                                <Delete />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleAddItem}
                    sx={{
                      mt: 2,
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    }}
                  >
                    Add Item
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    id="discount"
                    name="discount"
                    label="Discount (%)"
                    value={discount}
                    onChange={(e) => {
                      setDiscount(e.target.value);
                      formik.setFieldValue("discount", e.target.value);
                    }}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.discount && Boolean(formik.errors.discount)
                    }
                    helperText={
                      formik.touched.discount && formik.errors.discount
                    }
                    size="small"
                    sx={{
                      "& .MuiInputBase-root": {
                        fontSize: { xs: "0.85rem", sm: "0.9rem" },
                      },
                    }}
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
                    error={formik.touched.notes && Boolean(formik.errors.notes)}
                    helperText={formik.touched.notes && formik.errors.notes}
                    multiline
                    rows={3}
                    size="small"
                    sx={{
                      "& .MuiInputBase-root": {
                        fontSize: { xs: "0.85rem", sm: "0.9rem" },
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{
                      mt: 2,
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                      fontWeight: "bold",
                    }}
                  >
                    Bill Summary
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography
                        sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                      >
                        Subtotal: ₹{subtotal.toFixed(2)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography
                        sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                      >
                        Discount ({discount || 0}%): ₹
                        {discountAmount.toFixed(2)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography
                        sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                      >
                        Taxable Amount: ₹{taxableAmount.toFixed(2)}
                      </Typography>
                    </Grid>
                    {cgst > 0 && (
                      <Grid item xs={6}>
                        <Typography
                          sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                        >
                          CGST ({formik.values.gstRate / 2}%): ₹
                          {cgst.toFixed(2)}
                        </Typography>
                      </Grid>
                    )}
                    {sgst > 0 && (
                      <Grid item xs={6}>
                        <Typography
                          sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                        >
                          SGST ({formik.values.gstRate / 2}%): ₹
                          {sgst.toFixed(2)}
                        </Typography>
                      </Grid>
                    )}
                    {igst > 0 && (
                      <Grid item xs={6}>
                        <Typography
                          sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                        >
                          IGST ({formik.values.gstRate}%): ₹{igst.toFixed(2)}
                        </Typography>
                      </Grid>
                    )}
                    <Grid item xs={6}>
                      <Typography
                        sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                      >
                        Round Off: ₹
                        {roundOff === "0.00"
                          ? "0.00"
                          : Math.abs(roundOff).toFixed(2)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: "bold",
                          color: "primary.main",
                          fontSize: { xs: "0.9rem", sm: "1rem" },
                        }}
                      >
                        Total: ₹{roundedTotal}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography
                        sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                      >
                        Amount in Words: {numberToWords(roundedTotal)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </form>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={() => {
                setOpenDialog(false);
                setDialogMode("add");
                setSelectedBill(null);
                resetComponentState();
              }}
              color="inherit"
              sx={{
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={formik.handleSubmit}
              variant="contained"
              color="primary"
              disabled={isSubmitting}
              startIcon={
                isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />
              }
              sx={{
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              }}
            >
              {isSubmitting
                ? "Saving..."
                : dialogMode === "edit"
                ? "Update Bill"
                : "Create Bill"}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
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

export default AddGSTBill;
