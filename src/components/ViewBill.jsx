import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import { useRef } from 'react';
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
  CircularProgress
} from '@mui/material';
import { ArrowBack, Print, PictureAsPdf } from '@mui/icons-material';
import { PDFDownloadLink } from '@react-pdf/renderer';
import BillPDF from './BillPDF';
import { numberToWords } from '../utils';
import { useAuth } from '../contexts/AuthContext';

const ViewBill = () => {
  const { billId } = useParams();
  const { userProfile } = useAuth(); // Get user profile from AuthContext
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const componentRef = useRef();

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const docRef = doc(db, 'bills', billId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setBill({
            id: docSnap.id,
            ...docSnap.data()
          });
        } else {
          console.log('No such document!');
        }
      } catch (error) {
        console.error('Error fetching bill: ', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBill();
  }, [billId]);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
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
          <Tooltip title="Print Bill">
            <IconButton onClick={handlePrint} sx={{ mr: 1 }}>
              <Print />
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
                {userProfile?.companyName || 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                GSTIN: {userProfile?.gstNo || 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Address: {userProfile?.address || 'N/A'}
              </Typography>
            </Grid>
            <Grid item>
              <Typography variant="subtitle1">
                <strong>Invoice #:</strong> {bill.billNo}
              </Typography>
              <Typography variant="body2">
                <strong>Date:</strong>{" "}
                {format(new Date(bill.date), "dd/MM/yyyy")}
              </Typography>
            </Grid>
          </Grid>

          <Grid container spacing={4} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Billed To:</strong>
              </Typography>
              <Typography>{bill.partyDetails.partyName}</Typography>
              <Typography>{bill.partyDetails.address}</Typography>
              <Typography>GSTIN: {bill.partyDetails.gstNo}</Typography>
              <Typography>Mobile: {bill.partyDetails.mobileNo}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Payment Details:</strong>
              </Typography>
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
            </Grid>
          </Grid>

          <TableContainer component={Paper} elevation={2} sx={{ mb: 4 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Item</TableCell>
                  <TableCell>HSN</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bill.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.hsn}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right">
                      ₹{item.price.toFixed(2)}
                    </TableCell>
                    <TableCell align="right">
                      ₹{(item.quantity * item.price).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="body1" gutterBottom>
                <strong>Amount in Words:</strong> {numberToWords(bill.total)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Box sx={{ mb: 1 }}>
                  <Grid container justifyContent="space-between">
                    <Typography>Subtotal:</Typography>
                    <Typography>₹{bill.subtotal.toFixed(2)}</Typography>
                  </Grid>
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Grid container justifyContent="space-between">
                    <Typography>CGST ({bill.gstRate / 2}%):</Typography>
                    <Typography>₹{bill.cgst.toFixed(2)}</Typography>
                  </Grid>
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Grid container justifyContent="space-between">
                    <Typography>SGST ({bill.gstRate / 2}%):</Typography>
                    <Typography>₹{bill.sgst.toFixed(2)}</Typography>
                  </Grid>
                </Box>
                <Box
                  sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}
                >
                  <Grid container justifyContent="space-between">
                    <Typography variant="subtitle1">
                      <strong>Total:</strong>
                    </Typography>
                    <Typography variant="subtitle1">
                      <strong>₹{bill.total.toFixed(2)}</strong>
                    </Typography>
                  </Grid>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          <Box sx={{ mt: 6, pt: 6, borderTop: 1, borderColor: "divider" }}>
            <Grid container spacing={4}>
              <Grid item xs={6} md={6} sx={{ textAlign: "center" }}>
                <Typography variant="body1" gutterBottom>
                  <strong>Receiver's Signature</strong>
                </Typography>
                <Box sx={{ height: 80 }}></Box>
              </Grid>
              <Grid item xs={6} md={6} sx={{ textAlign: "center" }}>
                <Typography variant="body1" gutterBottom>
                  <strong>Authorized Signatory</strong>
                </Typography>
                <Box sx={{ height: 80 }}></Box>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </div>
    </Container>
  );
};

export default ViewBill;