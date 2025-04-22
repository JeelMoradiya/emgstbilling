import { useState, useEffect } from "react";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useFormik } from "formik";
import * as Yup from "yup";
import { format } from "date-fns";
import { useAuth } from "../contexts/AuthContext";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
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
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { numberToWords } from "../utils";
import logo from "../assets/logo.gif";

const AddGSTBill = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [parties, setParties] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([
    { name: "", hsn: "", quantity: "", price: "" },
  ]);
  const [discount, setDiscount] = useState("");
  const [nextBillNo, setNextBillNo] = useState(null);
  const { currentUser } = useAuth();
  const [openDialog, setOpenDialog] = useState(false);
  const [userState, setUserState] = useState("");
  const [userGSTCode, setUserGSTCode] = useState("");
  const [partySearchInput, setPartySearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  const validationSchema = Yup.object({
    partyId: Yup.string()
      .required("Party is required")
      .min(1, "Party selection is required"),
    paymentMethod: Yup.string()
      .required("Payment method is required")
      .oneOf(["cheque", "cash", "upi", "netbanking"], "Invalid payment method"),
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
    fetchNextBillNo();
  };

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
        values.billNo = nextBillNo;

        const billQuery = query(
          collection(db, "bills"),
          where("createdBy", "==", currentUser.uid),
          where("billNo", "==", values.billNo)
        );
        const existingBills = await getDocs(billQuery);

        if (!existingBills.empty) {
          setError(`Bill number ${values.billNo} already exists`);
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
        const isInterState = selectedParty.state !== userState;

        await addDoc(collection(db, "bills"), {
          ...values,
          partyId: values.partyId,
          items,
          subtotal,
          discount: parseFloat(discount) || 0,
          discountAmount,
          taxableAmount,
          cgst: isInterState ? 0 : cgst,
          sgst: isInterState ? 0 : sgst,
          igst: isInterState ? igst : 0,
          total,
          roundedTotal,
          roundOff,
          partyDetails: selectedParty,
          createdAt: new Date().toISOString(),
          createdBy: currentUser.uid,
        });

        const counterRef = doc(db, "billCounters", `${currentUser.uid}`);
        await setDoc(
          counterRef,
          { lastBillNo: values.billNo },
          { merge: true }
        );

        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          resetComponentState();
        }, 2000);
      } catch (error) {
        console.error("Error generating bill: ", error);
        setError("Failed to create bill: " + error.message);
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  useEffect(() => {
    const fetchPartiesAndUserState = async () => {
      if (!currentUser) return;
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

        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserState(userSnap.data().address?.state || "");
          setUserGSTCode(userSnap.data().gstCode || "");
        }
      } catch (err) {
        setError("Failed to fetch parties or user data: " + err.message);
      }
    };
    fetchPartiesAndUserState();
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
    fetchNextBillNo();
  }, [currentUser]);

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
    const roundedTotal = Number(Math.round(total)).toFixed(2); // Round to nearest integer
    const roundOff = Number(roundedTotal - total).toFixed(2); // Difference for rounding

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
      setOpenDialog(true);
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
          New GST Invoice
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
            GST Invoice created successfully! Page will refresh...
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
                  parties.find((p) => p.id === formik.values.partyId) || null
                }
                onChange={(event, newValue) => {
                  formik.setFieldValue("partyId", newValue ? newValue.id : "");
                }}
                onBlur={() => formik.setFieldTouched("partyId", true)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Party *"
                    size="small"
                    error={
                      formik.touched.partyId && Boolean(formik.errors.partyId)
                    }
                    helperText={formik.touched.partyId && formik.errors.partyId}
                    sx={{
                      "& .MuiInputBase-root": {
                        fontSize: { xs: "0.9rem", sm: "1rem" },
                      },
                    }}
                  />
                )}
                sx={{
                  "& .MuiAutocomplete-inputRoot": {
                    fontSize: { xs: "0.9rem", sm: "1rem" },
                  },
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                id="billNo"
                name="billNo"
                label="Invoice No"
                value={nextBillNo || ""}
                InputProps={{
                  readOnly: true,
                }}
                helperText="Auto-generated"
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
                id="challanNo"
                name="challanNo"
                label="Party Challan No *"
                value={formik.values.challanNo}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.challanNo && Boolean(formik.errors.challanNo)
                }
                helperText={formik.touched.challanNo && formik.errors.challanNo}
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
                inputProps={{
                  max: new Date().toISOString().split("T")[0],
                }}
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
                error={formik.touched.status && Boolean(formik.errors.status)}
              >
                <InputLabel
                  id="status-label"
                  sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                >
                  Status
                </InputLabel>
                <Select
                  labelId="status-label"
                  id="status"
                  name="status"
                  label="Status"
                  value={formik.values.status}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  variant="outlined"
                  size="small"
                  sx={{
                    "& .MuiSelect-select": {
                      fontSize: { xs: "0.85rem", sm: "0.9rem" },
                    },
                  }}
                >
                  <MenuItem
                    value="pending"
                    sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                  >
                    Pending
                  </MenuItem>
                  <MenuItem
                    value="paid"
                    sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                  >
                    Paid
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl
                fullWidth
                error={
                  formik.touched.paymentMethod &&
                  Boolean(formik.errors.paymentMethod)
                }
              >
                <InputLabel
                  id="payment-method-label"
                  sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                >
                  Payment Method *
                </InputLabel>
                <Select
                  labelId="payment-method-label"
                  id="paymentMethod"
                  name="paymentMethod"
                  label="Payment Method *"
                  value={formik.values.paymentMethod}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  variant="outlined"
                  size="small"
                  sx={{
                    "& .MuiSelect-select": {
                      fontSize: { xs: "0.85rem", sm: "0.9rem" },
                    },
                  }}
                >
                  <MenuItem
                    value="cheque"
                    sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                  >
                    Cheque
                  </MenuItem>
                  <MenuItem
                    value="cash"
                    sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                  >
                    Cash
                  </MenuItem>
                  <MenuItem
                    value="upi"
                    sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                  >
                    UPI
                  </MenuItem>
                  <MenuItem
                    value="netbanking"
                    sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                  >
                    Net Banking
                  </MenuItem>
                </Select>
                {formik.touched.paymentMethod &&
                  formik.errors.paymentMethod && (
                    <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                      {formik.errors.paymentMethod}
                    </Typography>
                  )}
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl
                fullWidth
                error={formik.touched.gstRate && Boolean(formik.errors.gstRate)}
              >
                <InputLabel
                  id="gst-rate-label"
                  sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                >
                  GST Rate (%) *
                </InputLabel>
                <Select
                  labelId="gst-rate-label"
                  id="gstRate"
                  name="gstRate"
                  label="GST Rate (%) *"
                  value={formik.values.gstRate}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  variant="outlined"
                  size="small"
                  sx={{
                    "& .MuiSelect-select": {
                      fontSize: { xs: "0.85rem", sm: "0.9rem" },
                    },
                  }}
                >
                  <MenuItem
                    value={0}
                    sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                  >
                    0% (Exempt)
                  </MenuItem>
                  <MenuItem
                    value={5}
                    sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                  >
                    5%
                  </MenuItem>
                  <MenuItem
                    value={12}
                    sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                  >
                    12%
                  </MenuItem>
                  <MenuItem
                    value={18}
                    sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                  >
                    18%
                  </MenuItem>
                  <MenuItem
                    value={28}
                    sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                  >
                    28%
                  </MenuItem>
                </Select>
                {formik.touched.gstRate && formik.errors.gstRate && (
                  <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                    {formik.errors.gstRate}
                  </Typography>
                )}
              </FormControl>
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
                          fontSize: {
                            xs: "0.85rem",
                            sm: "0.95rem",
                            md: "1rem",
                          },
                        }}
                      >
                        Item Name
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          fontSize: {
                            xs: "0.85rem",
                            sm: "0.95rem",
                            md: "1rem",
                          },
                        }}
                      >
                        HSN Code
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          fontSize: {
                            xs: "0.85rem",
                            sm: "0.95rem",
                            md: "1rem",
                          },
                        }}
                      >
                        Quantity
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          fontSize: {
                            xs: "0.85rem",
                            sm: "0.95rem",
                            md: "1rem",
                          },
                        }}
                      >
                        Price (₹)
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          fontSize: {
                            xs: "0.85rem",
                            sm: "0.95rem",
                            md: "1rem",
                          },
                        }}
                      >
                        Amount (₹)
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          fontSize: {
                            xs: "0.85rem",
                            sm: "0.95rem",
                            md: "1rem",
                          },
                        }}
                      >
                        Action
                      </TableCell>
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
                            onChange={(e) =>
                              handleItemChange(index, "name", e.target.value)
                            }
                            onBlur={() =>
                              formik.setFieldTouched(
                                `items[${index}].name`,
                                true
                              )
                            }
                            placeholder="Enter item name"
                            variant="outlined"
                            error={
                              formik.touched.items &&
                              formik.touched.items[index]?.name &&
                              Boolean(
                                formik.errors.items &&
                                  formik.errors.items[index]?.name
                              )
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
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            fullWidth
                            size="small"
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
                            placeholder="Enter HSN code (optional)"
                            variant="outlined"
                            error={
                              formik.touched.items &&
                              formik.touched.items[index]?.hsn &&
                              Boolean(
                                formik.errors.items &&
                                  formik.errors.items[index]?.hsn
                              )
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
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
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
                            inputProps={{ min: 1, step: 1 }}
                            placeholder="Enter quantity"
                            variant="outlined"
                            error={
                              formik.touched.items &&
                              formik.touched.items[index]?.quantity &&
                              Boolean(
                                formik.errors.items &&
                                  formik.errors.items[index]?.quantity
                              )
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
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            value={item.price}
                            onChange={(e) =>
                              handleItemChange(index, "price", e.target.value)
                            }
                            onBlur={() =>
                              formik.setFieldTouched(
                                `items[${index}].price`,
                                true
                              )
                            }
                            inputProps={{ min: 0, step: 0.01 }}
                            placeholder="Enter price"
                            variant="outlined"
                            error={
                              formik.touched.items &&
                              formik.touched.items[index]?.price &&
                              Boolean(
                                formik.errors.items &&
                                  formik.errors.items[index]?.price
                              )
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
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: {
                              xs: "0.8rem",
                              sm: "0.9rem",
                              md: "1rem",
                            },
                          }}
                        >
                          {(
                            (parseFloat(item.quantity) || 0) *
                            (parseFloat(item.price) || 0)
                          ).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            color="error"
                            onClick={() => handleRemoveItem(index)}
                            size={isMobile ? "small" : "medium"}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
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
                error={
                  formik.touched.discount && Boolean(formik.errors.discount)
                }
                helperText={formik.touched.discount && formik.errors.discount}
                sx={{
                  "& .MuiInputBase-root": {
                    fontSize: { xs: "0.85rem", sm: "0.9rem" },
                  },
                  "& .MuiFormHelperText-root": {
                    color: "error.main",
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
                <Grid
                  container
                  spacing={2}
                  direction={isMobile ? "column" : "row"}
                >
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
                      <strong>Taxable Amount:</strong> ₹
                      {taxableAmount.toFixed(2)}
                    </Typography>
                    {cgst > 0 && (
                      <Typography
                        variant="body1"
                        gutterBottom
                        sx={{
                          fontSize: {
                            xs: "0.85rem",
                            sm: "0.95rem",
                            md: "1rem",
                          },
                        }}
                      >
                        <strong>CGST ({formik.values.gstRate / 2}%):</strong> ₹
                        {cgst.toFixed(2)}
                      </Typography>
                    )}
                    {sgst > 0 && (
                      <Typography
                        variant="body1"
                        gutterBottom
                        sx={{
                          fontSize: {
                            xs: "0.85rem",
                            sm: "0.95rem",
                            md: "1rem",
                          },
                        }}
                      >
                        <strong>SGST ({formik.values.gstRate / 2}%):</strong> ₹
                        {sgst.toFixed(2)}
                      </Typography>
                    )}
                    {igst > 0 && (
                      <Typography
                        variant="body1"
                        gutterBottom
                        sx={{
                          fontSize: {
                            xs: "0.85rem",
                            sm: "0.95rem",
                            md: "1rem",
                          },
                        }}
                      >
                        <strong>IGST ({formik.values.gstRate}%):</strong> ₹
                        {igst.toFixed(2)}
                      </Typography>
                    )}
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
                        fontSize: {
                          xs: "1rem",
                          sm: "1.25rem",
                          md: "1.5rem",
                        },
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
                        fontSize: {
                          xs: "0.75rem",
                          sm: "0.875rem",
                          md: "1rem",
                        },
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

            <Grid item xs={12}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: { xs: "center", sm: "flex-end" },
                  mt: 4,
                }}
              >
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={
                    isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />
                  }
                  disabled={isSubmitting || !nextBillNo}
                  sx={{
                    minWidth: { xs: "100%", sm: "160px" },
                    fontSize: { xs: "0.85rem", sm: "0.9rem" },
                    textTransform: "none",
                  }}
                >
                  {isSubmitting ? "Creating..." : "Generate GST Invoice"}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle
          sx={{
            bgcolor: "primary.main",
            color: "white",
            py: 2,
            fontSize: { xs: "1rem", sm: "1.25rem" },
          }}
        >
          Cannot Remove Item
        </DialogTitle>
        <DialogContent sx={{ mt: 2, px: { xs: 2, sm: 3 } }}>
          <Typography
            sx={{ fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" } }}
          >
            An invoice must have at least one item.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: { xs: 1, sm: 2 } }}>
          <Button
            onClick={() => setOpenDialog(false)}
            variant="contained"
            color="primary"
            size="small"
            sx={{
              minWidth: { xs: "100%", sm: "160px" },
              fontSize: { xs: "0.85rem", sm: "0.9rem" },
              textTransform: "none",
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AddGSTBill;