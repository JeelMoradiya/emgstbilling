import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useReactToPrint } from "react-to-print";
import { useRef } from "react";
import {
  Container,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  Box,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  ArrowBack,
  Edit,
  PictureAsPdf,
  Save,
  Cancel,
  Add,
  Delete,
} from "@mui/icons-material";
import { PDFDownloadLink } from "@react-pdf/renderer";
import BillPDF from "./BillPDF";
import { numberToWords } from "../utils";
import { useAuth } from "../contexts/AuthContext";

const ViewBill = () => {
  const { billId } = useParams();
  const { userProfile } = useAuth();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBill, setEditedBill] = useState(null);
  const [openAddItem, setOpenAddItem] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    hsn: "",
    quantity: 0,
    price: 0,
  });
  const componentRef = useRef();

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const docRef = doc(db, "bills", billId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const billData = { id: docSnap.id, ...docSnap.data() };
          setBill(billData);
          setEditedBill(billData);
        }
      } catch (error) {
        console.error("Error fetching bill: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBill();
  }, [billId]);

  const formatAddress = (address) => {
    if (!address || typeof address !== "object") return "N/A";
    const { plotHouseNo, line1, area, landmark, city, state, pincode } =
      address;
    return [plotHouseNo, line1, area, landmark, city, state, pincode]
      .filter(Boolean)
      .join(", ");
  };

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      setEditedBill(bill);
    }
  };

  const handleSave = async () => {
    try {
      const docRef = doc(db, "bills", billId);
      await updateDoc(docRef, editedBill);
      setBill(editedBill);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating bill: ", error);
    }
  };

  const handleInputChange = (field, value) => {
    setEditedBill((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...editedBill.items];
    updatedItems[index][field] = value;
    setEditedBill((prev) => ({
      ...prev,
      items: updatedItems,
      subtotal: updatedItems.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0
      ),
      cgst:
        (updatedItems.reduce(
          (sum, item) => sum + item.quantity * item.price,
          0
        ) *
          editedBill.gstRate) /
        200,
      sgst:
        (updatedItems.reduce(
          (sum, item) => sum + item.quantity * item.price,
          0
        ) *
          editedBill.gstRate) /
        200,
      total:
        updatedItems.reduce(
          (sum, item) => sum + item.quantity * item.price,
          0
        ) *
        (1 + editedBill.gstRate / 100),
    }));
  };

  const handleAddItem = () => {
    setEditedBill((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
      subtotal: prev.subtotal + newItem.quantity * newItem.price,
      cgst:
        ((prev.subtotal + newItem.quantity * newItem.price) * prev.gstRate) /
        200,
      sgst:
        ((prev.subtotal + newItem.quantity * newItem.price) * prev.gstRate) /
        200,
      total:
        (prev.subtotal + newItem.quantity * newItem.price) *
        (1 + prev.gstRate / 100),
    }));
    setNewItem({ name: "", hsn: "", quantity: 0, price: 0 });
    setOpenAddItem(false);
  };

  const handleDeleteItem = (index) => {
    const updatedItems = editedBill.items.filter((_, i) => i !== index);
    setEditedBill((prev) => ({
      ...prev,
      items: updatedItems,
      subtotal: updatedItems.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0
      ),
      cgst:
        (updatedItems.reduce(
          (sum, item) => sum + item.quantity * item.price,
          0
        ) *
          editedBill.gstRate) /
        200,
      sgst:
        (updatedItems.reduce(
          (sum, item) => sum + item.quantity * item.price,
          0
        ) *
          editedBill.gstRate) /
        200,
      total:
        updatedItems.reduce(
          (sum, item) => sum + item.quantity * item.price,
          0
        ) *
        (1 + editedBill.gstRate / 100),
    }));
  };

  if (loading) {
    return (
      <Container
        maxWidth="lg"
        sx={{ mt: 4, display: "flex", justifyContent: "center" }}
      >
        <CircularProgress />
      </Container>
    );
  }

  if (!bill) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography variant="h6">Bill not found</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between" }}>
        <Button
          component={Link}
          to={`/party-bills/${bill.partyId}`}
          startIcon={<ArrowBack />}
        >
          Back to Party Bills
        </Button>
        <Box>
          {isEditing ? (
            <>
              <Tooltip title="Save Changes">
                <IconButton onClick={handleSave} sx={{ mr: 1 }}>
                  <Save color="success" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Cancel Editing">
                <IconButton onClick={handleEditToggle}>
                  <Cancel color="error" />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip title="Edit Bill">
                <IconButton onClick={handleEditToggle} sx={{ mr: 1 }}>
                  <Edit />
                </IconButton>
              </Tooltip>
              <PDFDownloadLink
                document={<BillPDF bill={bill} user={userProfile} />}
                fileName={`bill_${bill.billNo}.pdf`}
              >
                {({ loading }) => (
                  <Tooltip title="Download PDF">
                    <span>
                      <IconButton disabled={loading}>
                        <PictureAsPdf color={loading ? "disabled" : "error"} />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </PDFDownloadLink>
            </>
          )}
        </Box>
      </Box>

      <div ref={componentRef}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Grid
            container
            justifyContent="space-between"
            alignItems="flex-start"
            sx={{ mb: 4 }}
          >
            <Grid item>
              <Typography variant="h4" gutterBottom>
                {userProfile?.companyName || "N/A"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                GSTIN: {userProfile?.gstNo || "N/A"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Address: {formatAddress(userProfile?.address)}
              </Typography>
            </Grid>
            <Grid item>
              {isEditing ? (
                <TextField
                  label="Invoice #"
                  value={editedBill.billNo}
                  onChange={(e) => handleInputChange("billNo", e.target.value)}
                  size="small"
                />
              ) : (
                <Typography variant="subtitle1">
                  <strong>Invoice No. :</strong> {bill.billNo}
                </Typography>
              )}
              <Typography variant="body2">
                <strong>Date:</strong>{" "}
                {new Date(bill.date).toLocaleDateString()}
              </Typography>
            </Grid>
          </Grid>

          <Grid container spacing={4} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Billed To:</strong>
              </Typography>
              {isEditing ? (
                <>
                  <TextField
                    fullWidth
                    label="Company Name"
                    value={editedBill.partyDetails.companyName || ""}
                    onChange={(e) =>
                      setEditedBill((prev) => ({
                        ...prev,
                        partyDetails: {
                          ...prev.partyDetails,
                          companyName: e.target.value,
                        },
                      }))
                    }
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="GSTIN"
                    value={editedBill.partyDetails.gstNo || ""}
                    onChange={(e) =>
                      setEditedBill((prev) => ({
                        ...prev,
                        partyDetails: {
                          ...prev.partyDetails,
                          gstNo: e.target.value,
                        },
                      }))
                    }
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Mobile"
                    value={editedBill.partyDetails.mobileNo || ""}
                    onChange={(e) =>
                      setEditedBill((prev) => ({
                        ...prev,
                        partyDetails: {
                          ...prev.partyDetails,
                          mobileNo: e.target.value,
                        },
                      }))
                    }
                  />
                </>
              ) : (
                <>
                  <Typography>
                    {bill.partyDetails.companyName || "N/A"}
                  </Typography>
                  <Typography>
                    GSTIN: {bill.partyDetails.gstNo || "N/A"}
                  </Typography>
                  <Typography>
                    Mobile: {bill.partyDetails.mobileNo || "N/A"}
                  </Typography>
                  <Typography>{formatAddress(bill.partyDetails)}</Typography>
                </>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Payment Details:</strong>
              </Typography>
              {isEditing ? (
                <>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Payment Method</InputLabel>
                    <Select
                      value={editedBill.paymentMethod}
                      onChange={(e) =>
                        handleInputChange("paymentMethod", e.target.value)
                      }
                    >
                      <MenuItem value="cash">Cash</MenuItem>
                      <MenuItem value="upi">UPI</MenuItem>
                      <MenuItem value="netbanking">Net Banking</MenuItem>
                      <MenuItem value="mobilebanking">Mobile Banking</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={editedBill.status}
                      onChange={(e) =>
                        handleInputChange("status", e.target.value)
                      }
                    >
                      <MenuItem value="paid">Paid</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="overdue">Overdue</MenuItem>
                    </Select>
                  </FormControl>
                </>
              ) : (
                <>
                  <Typography>
                    <strong>Method:</strong> {bill.paymentMethod.toUpperCase()}
                  </Typography>
                  <Box>
                    <strong>Status:</strong>{" "}
                    <Chip
                      label={bill.status}
                      color={
                        bill.status === "paid"
                          ? "success"
                          : bill.status === "pending"
                          ? "warning"
                          : "error"
                      }
                      size="small"
                    />
                  </Box>
                </>
              )}
            </Grid>
          </Grid>

          <TableContainer component={Paper} elevation={2} sx={{ mb: 4 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>No.</TableCell>
                  <TableCell>Item</TableCell>
                  <TableCell>HSN</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  {isEditing && <TableCell>Action</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {editedBill.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <TextField
                          value={item.name}
                          onChange={(e) =>
                            handleItemChange(index, "name", e.target.value)
                          }
                          size="small"
                        />
                      ) : (
                        item.name
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <TextField
                          value={item.hsn}
                          onChange={(e) =>
                            handleItemChange(index, "hsn", e.target.value)
                          }
                          size="small"
                        />
                      ) : (
                        item.hsn
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {isEditing ? (
                        <TextField
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "quantity",
                              Number(e.target.value)
                            )
                          }
                          size="small"
                        />
                      ) : (
                        item.quantity
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {isEditing ? (
                        <TextField
                          type="number"
                          value={item.price}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "price",
                              Number(e.target.value)
                            )
                          }
                          size="small"
                        />
                      ) : (
                        `₹${item.price.toFixed(2)}`
                      )}
                    </TableCell>
                    <TableCell align="right">
                      ₹{(item.quantity * item.price).toFixed(2)}
                    </TableCell>
                    {isEditing && (
                      <TableCell>
                        <IconButton
                          onClick={() => handleDeleteItem(index)}
                          color="error"
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

          {isEditing && (
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => setOpenAddItem(true)}
              sx={{ mb: 4 }}
            >
              Add Item
            </Button>
          )}

          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="body1" gutterBottom>
                <strong>Amount in Words:</strong>{" "}
                {numberToWords(editedBill.total)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Box sx={{ mb: 1 }}>
                  <Grid container justifyContent="space-between">
                    <Typography>Subtotal:</Typography>
                    <Typography>₹{editedBill.subtotal.toFixed(2)}</Typography>
                  </Grid>
                </Box>
                {isEditing ? (
                  <Box sx={{ mb: 1 }}>
                    <FormControl fullWidth>
                      <InputLabel>GST Rate (%)</InputLabel>
                      <Select
                        value={editedBill.gstRate}
                        onChange={(e) => {
                          const rate = Number(e.target.value);
                          setEditedBill((prev) => ({
                            ...prev,
                            gstRate: rate,
                            cgst: (prev.subtotal * rate) / 200,
                            sgst: (prev.subtotal * rate) / 200,
                            total: prev.subtotal * (1 + rate / 100),
                          }));
                        }}
                      >
                        <MenuItem value={5}>5%</MenuItem>
                        <MenuItem value={12}>12%</MenuItem>
                        <MenuItem value={18}>18%</MenuItem>
                        <MenuItem value={28}>28%</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                ) : (
                  <>
                    <Box sx={{ mb: 1 }}>
                      <Grid container justifyContent="space-between">
                        <Typography>CGST ({bill.gstRate / 2}%):</Typography>
                        <Typography>₹{editedBill.cgst.toFixed(2)}</Typography>
                      </Grid>
                    </Box>
                    <Box sx={{ mb: 1 }}>
                      <Grid container justifyContent="space-between">
                        <Typography>SGST ({bill.gstRate / 2}%):</Typography>
                        <Typography>₹{editedBill.sgst.toFixed(2)}</Typography>
                      </Grid>
                    </Box>
                  </>
                )}
                <Box
                  sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}
                >
                  <Grid container justifyContent="space-between">
                    <Typography variant="subtitle1">
                      <strong>Total:</strong>
                    </Typography>
                    <Typography variant="subtitle1">
                      <strong>₹{editedBill.total.toFixed(2)}</strong>
                    </Typography>
                  </Grid>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      </div>

      <Dialog open={openAddItem} onClose={() => setOpenAddItem(false)}>
        <DialogTitle>Add New Item</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Item Name"
            value={newItem.name}
            onChange={(e) =>
              setNewItem((prev) => ({ ...prev, name: e.target.value }))
            }
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="HSN Code"
            value={newItem.hsn}
            onChange={(e) =>
              setNewItem((prev) => ({ ...prev, hsn: e.target.value }))
            }
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            type="number"
            label="Quantity"
            value={newItem.quantity}
            onChange={(e) =>
              setNewItem((prev) => ({
                ...prev,
                quantity: Number(e.target.value),
              }))
            }
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            type="number"
            label="Price"
            value={newItem.price}
            onChange={(e) =>
              setNewItem((prev) => ({ ...prev, price: Number(e.target.value) }))
            }
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddItem(false)}>Cancel</Button>
          <Button onClick={handleAddItem} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ViewBill;
