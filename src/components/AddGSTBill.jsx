import { useState, useEffect } from 'react';
import { addDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { format } from 'date-fns';
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
  Box
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';

const AddGSTBill = () => {
  const [parties, setParties] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [items, setItems] = useState([{ name: '', hsn: '', quantity: 1, price: 0 }]);

  useEffect(() => {
    const fetchParties = async () => {
      const querySnapshot = await getDocs(collection(db, 'parties'));
      const partiesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setParties(partiesData);
    };

    fetchParties();
  }, []);

  const calculateTotals = (values) => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const cgst = subtotal * (values.gstRate / 100 / 2);
    const sgst = subtotal * (values.gstRate / 100 / 2);
    const total = subtotal + cgst + sgst;
    
    return {
      subtotal,
      cgst,
      sgst,
      total
    };
  };

  const formik = useFormik({
    initialValues: {
      billNo: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      partyId: '',
      paymentMethod: 'cash',
      gstRate: 18,
      status: 'pending',
    },
    validationSchema: Yup.object({
      billNo: Yup.string().required('Required'),
      date: Yup.date().required('Required'),
      partyId: Yup.string().required('Required'),
      paymentMethod: Yup.string().required('Required'),
      gstRate: Yup.number().required('Required'),
    }),
    onSubmit: async (values) => {
      setIsSubmitting(true);
      setSuccess(false);
      try {
        const { subtotal, cgst, sgst, total } = calculateTotals(values);
        
        const selectedParty = parties.find(p => p.id === values.partyId);
        
        await addDoc(collection(db, 'bills'), {
          ...values,
          items,
          subtotal,
          cgst,
          sgst,
          total,
          partyDetails: selectedParty,
          createdAt: new Date().toISOString(),
        });
        
        setSuccess(true);
      } catch (error) {
        console.error('Error generating bill: ', error);
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const handleAddItem = () => {
    setItems([...items, { name: '', hsn: '', quantity: 1, price: 0 }]);
  };

  const handleRemoveItem = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = field === 'quantity' || field === 'price' ? parseFloat(value) || 0 : value;
    setItems(newItems);
  };

  const { subtotal, cgst, sgst, total } = calculateTotals(formik.values);

  const numberToWords = (num) => {
    // Implement number to words conversion logic here
    return "Rupees " + num.toFixed(2) + " only";
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Generate GST Bill
        </Typography>
        
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            GST Bill generated successfully!
          </Alert>
        )}

        <form onSubmit={formik.handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="billNo"
                name="billNo"
                label="Bill No"
                value={formik.values.billNo}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.billNo && Boolean(formik.errors.billNo)}
                helperText={formik.touched.billNo && formik.errors.billNo}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="date"
                name="date"
                label="Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={formik.values.date}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.date && Boolean(formik.errors.date)}
                helperText={formik.touched.date && formik.errors.date}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="party-label">Party</InputLabel>
                <Select
                  labelId="party-label"
                  id="partyId"
                  name="partyId"
                  label="Party"
                  value={formik.values.partyId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.partyId && Boolean(formik.errors.partyId)}
                >
                  <MenuItem value="">Select Party</MenuItem>
                  {parties.map(party => (
                    <MenuItem key={party.id} value={party.id}>
                      {party.partyName} ({party.gstNo})
                    </MenuItem>
                  ))}
                </Select>
                {formik.touched.partyId && formik.errors.partyId && (
                  <Typography color="error" variant="caption">{formik.errors.partyId}</Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="payment-method-label">Payment Method</InputLabel>
                <Select
                  labelId="payment-method-label"
                  id="paymentMethod"
                  name="paymentMethod"
                  label="Payment Method"
                  value={formik.values.paymentMethod}
                  onChange={formik.handleChange}
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="upi">UPI</MenuItem>
                  <MenuItem value="netbanking">Net Banking</MenuItem>
                  <MenuItem value="mobilebanking">Mobile Banking</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="gst-rate-label">GST Rate (%)</InputLabel>
                <Select
                  labelId="gst-rate-label"
                  id="gstRate"
                  name="gstRate"
                  label="GST Rate (%)"
                  value={formik.values.gstRate}
                  onChange={formik.handleChange}
                >
                  <MenuItem value={5}>5%</MenuItem>
                  <MenuItem value={12}>12%</MenuItem>
                  <MenuItem value={18}>18%</MenuItem>
                  <MenuItem value={28}>28%</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Items
              </Typography>
              <TableContainer component={Paper} elevation={2} sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item Name</TableCell>
                      <TableCell>HSN</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <TextField
                            fullWidth
                            size="small"
                            value={item.name}
                            onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            fullWidth
                            size="small"
                            value={item.hsn}
                            onChange={(e) => handleItemChange(index, 'hsn', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            inputProps={{ min: 1 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            value={item.price}
                            onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                            inputProps={{ min: 0, step: 0.01 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {(item.quantity * item.price).toFixed(2)}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            color="error"
                            onClick={() => handleRemoveItem(index)}
                            disabled={items.length <= 1}
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
                startIcon={<AddIcon />}
                onClick={handleAddItem}
              >
                Add Item
              </Button>
            </Grid>

            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1">
                      <strong>Subtotal:</strong> ₹{subtotal.toFixed(2)}
                    </Typography>
                    <Typography variant="subtitle1">
                      <strong>CGST ({formik.values.gstRate / 2}%):</strong> ₹{cgst.toFixed(2)}
                    </Typography>
                    <Typography variant="subtitle1">
                      <strong>SGST ({formik.values.gstRate / 2}%):</strong> ₹{sgst.toFixed(2)}
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 1 }}>
                      <strong>Total:</strong> ₹{total.toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2">
                      <strong>Amount in Words:</strong> {numberToWords(total)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  id="status"
                  name="status"
                  label="Status"
                  value={formik.values.status}
                  onChange={formik.handleChange}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                disabled={isSubmitting}
              >
                {isSubmitting ? <CircularProgress size={24} /> : 'Generate GST Bill'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};

export default AddGSTBill;