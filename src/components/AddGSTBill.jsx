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
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { numberToWords } from "../utils";

const AddGSTBill = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

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
          where("partyId", "==", values.partyId),
          where("billNo", "==", values.billNo)
        );
        const existingBills = await getDocs(billQuery);

        if (!existingBills.empty) {
          setError(
            `Bill number ${values.billNo} already exists for this party`
          );
          setIsSubmitting(false);
          return;
        }

        const { subtotal, discountAmount, taxableAmount, cgst, sgst, total } =
          calculateTotals();
        const selectedParty = parties.find((p) => p.id === values.partyId);

        await addDoc(collection(db, "bills"), {
          ...values,
          items,
          subtotal,
          discount: parseFloat(discount) || 0,
          discountAmount,
          taxableAmount,
          cgst,
          sgst,
          total,
          partyDetails: selectedParty,
          createdAt: new Date().toISOString(),
          createdBy: currentUser.uid,
        });

        const counterRef = doc(
          db,
          "billCounters",
          `${currentUser.uid}_${values.partyId}`
        );
        await setDoc(
          counterRef,
          { lastBillNo: values.billNo },
          { merge: true }
        );

        setSuccess(true);
        setItems([{ name: "", hsn: "", quantity: "", price: "" }]);
        setDiscount("");
        formik.resetForm();
        formik.setFieldValue("date", format(new Date(), "yyyy-MM-dd"));
        setNextBillNo(null);
      } catch (error) {
        console.error("Error generating bill: ", error);
        setError("Failed to create bill: " + error.message);
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  useEffect(() => {
    const fetchParties = async () => {
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
      } catch (err) {
        setError("Failed to fetch parties: " + err.message);
      }
    };
    fetchParties();
  }, [currentUser]);

  useEffect(() => {
    const fetchNextBillNo = async (partyId) => {
      if (!currentUser || !partyId) return;
      try {
        const counterRef = doc(
          db,
          "billCounters",
          `${currentUser.uid}_${partyId}`
        );
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
    if (formik.values.partyId) {
      fetchNextBillNo(formik.values.partyId);
    }
  }, [currentUser, formik.values.partyId]);

  const calculateTotals = () => {
    const subtotal = items.reduce(
      (sum, item) =>
        sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0),
      0
    );
    const discountAmount = subtotal * ((parseFloat(discount) || 0) / 100);
    const taxableAmount = subtotal - discountAmount;
    const cgst = taxableAmount * (formik.values.gstRate / 100 / 2);
    const sgst = taxableAmount * (formik.values.gstRate / 100 / 2);
    const total = taxableAmount + cgst + sgst;
    return { subtotal, discountAmount, taxableAmount, cgst, sgst, total };
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

  const { subtotal, discountAmount, taxableAmount, cgst, sgst, total } =
    calculateTotals();

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
            GST Invoice created successfully!
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
              <FormControl
                fullWidth
                error={formik.touched.partyId && Boolean(formik.errors.partyId)}
              >
                <InputLabel
                  id="party-label"
                  sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                >
                  Select Party *
                </InputLabel>
                <Select
                  labelId="party-label"
                  id="partyId"
                  name="partyId"
                  label="Select Party *"
                  value={formik.values.partyId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  variant="outlined"
                  sx={{
                    "& .MuiSelect-select": {
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                    },
                  }}
                >
                  <MenuItem
                    value=""
                    sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                  >
                    Select a party
                  </MenuItem>
                  {parties.map((party) => (
                    <MenuItem
                      key={party.id}
                      value={party.id}
                      sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                    >
                      {party.companyName} ({party.gstNo})
                    </MenuItem>
                  ))}
                </Select>
                {formik.touched.partyId && formik.errors.partyId && (
                  <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                    {formik.errors.partyId}
                  </Typography>
                )}
              </FormControl>
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
                helperText="Auto-generated based on party"
                variant="outlined"
                sx={{
                  "& .MuiInputBase-root": {
                    fontSize: { xs: "0.9rem", sm: "1rem" },
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
                sx={{
                  "& .MuiInputBase-root": {
                    fontSize: { xs: "0.9rem", sm: "1rem" },
                  },
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel
                  id="status-label"
                  sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
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
                  sx={{
                    "& .MuiSelect-select": {
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                    },
                  }}
                >
                  <MenuItem
                    value="pending"
                    sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                  >
                    Pending
                  </MenuItem>
                  <MenuItem
                    value="paid"
                    sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                  >
                    Paid
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl
                fullWidth
                error={
                  formik.touched.paymentMethod &&
                  Boolean(formik.errors.paymentMethod)
                }
              >
                <InputLabel
                  id="payment-method-label"
                  sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
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
                  sx={{
                    "& .MuiSelect-select": {
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                    },
                  }}
                >
                  <MenuItem
                    value="cheque"
                    sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                  >
                    Cheque
                  </MenuItem>
                  <MenuItem
                    value="cash"
                    sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                  >
                    Cash
                  </MenuItem>
                  <MenuItem
                    value="upi"
                    sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                  >
                    UPI
                  </MenuItem>
                  <MenuItem
                    value="netbanking"
                    sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
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

            <Grid item xs={12} sm={6}>
              <FormControl
                fullWidth
                error={formik.touched.gstRate && Boolean(formik.errors.gstRate)}
              >
                <InputLabel
                  id="gst-rate-label"
                  sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
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
                  sx={{
                    "& .MuiSelect-select": {
                      fontSize: { xs: "0.9rem", sm: "1rem" },
                    },
                  }}
                >
                  <MenuItem
                    value={0}
                    sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                  >
                    0% (Exempt)
                  </MenuItem>
                  <MenuItem
                    value={5}
                    sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                  >
                    5%
                  </MenuItem>
                  <MenuItem
                    value={12}
                    sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                  >
                    12%
                  </MenuItem>
                  <MenuItem
                    value={18}
                    sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                  >
                    18%
                  </MenuItem>
                  <MenuItem
                    value={28}
                    sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
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
                                fontSize: { xs: "0.9rem", sm: "1rem" },
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
                                fontSize: { xs: "0.9rem", sm: "1rem" },
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
                                fontSize: { xs: "0.9rem", sm: "1rem" },
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
                                fontSize: { xs: "0.9rem", sm: "1rem" },
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
                size="large"
                sx={{
                  mb: 3,
                  minWidth: { xs: "100%", sm: "160px" },
                  height: { xs: "48px", sm: "56px" },
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                  textTransform: "none",
                }}
              >
                Add New Item
              </Button>
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
                error={
                  formik.touched.discount && Boolean(formik.errors.discount)
                }
                helperText={formik.touched.discount && formik.errors.discount}
                sx={{
                  "& .MuiInputBase-root": {
                    fontSize: { xs: "0.9rem", sm: "1rem" },
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
                error={formik.touched.notes && Boolean(formik.errors.notes)}
                helperText={formik.touched.notes && formik.errors.notes}
                sx={{
                  "& .MuiInputBase-root": {
                    fontSize: { xs: "0.9rem", sm: "1rem" },
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
                    <Typography
                      variant="body1"
                      gutterBottom
                      sx={{
                        fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                      }}
                    >
                      <strong>CGST ({formik.values.gstRate / 2}%):</strong> ₹
                      {cgst.toFixed(2)}
                    </Typography>
                    <Typography
                      variant="body1"
                      gutterBottom
                      sx={{
                        fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1rem" },
                      }}
                    >
                      <strong>SGST ({formik.values.gstRate / 2}%):</strong> ₹
                      {sgst.toFixed(2)}
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
                      <strong>Total Amount:</strong> ₹{total.toFixed(2)}
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
                      <strong>Amount in Words:</strong> {numberToWords(total)}
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
                  size="large"
                  startIcon={
                    isSubmitting ? <CircularProgress size={24} /> : <SaveIcon />
                  }
                  disabled={isSubmitting || !nextBillNo}
                  sx={{
                    minWidth: { xs: "100%", sm: "160px" },
                    height: { xs: "48px", sm: "56px" },
                    fontSize: { xs: "0.9rem", sm: "1rem" },
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
            size="large"
            sx={{
              minWidth: { xs: "100%", sm: "160px" },
              height: { xs: "48px", sm: "56px" },
              fontSize: { xs: "0.9rem", sm: "1rem" },
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
