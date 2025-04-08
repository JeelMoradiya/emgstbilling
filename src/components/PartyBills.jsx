import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';
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
  Chip,
  CircularProgress,
  Box,
  IconButton,
  Tooltip
} from '@mui/material';
import { ArrowBack, PictureAsPdf, Add } from '@mui/icons-material';
import { PDFDownloadLink } from '@react-pdf/renderer';
import BillPDF from './BillPDF';

const PartyBills = () => {
  const { partyId } = useParams();
  const [bills, setBills] = useState([]);
  const [party, setParty] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBillsAndParty = async () => {
      try {
        // Fetch party details
        const partyQuery = query(collection(db, 'parties'), where('__name__', '==', partyId));
        const partySnapshot = await getDocs(partyQuery);
        if (!partySnapshot.empty) {
          setParty({
            id: partySnapshot.docs[0].id,
            ...partySnapshot.docs[0].data()
          });
        }

        // Fetch bills for this party
        const billsQuery = query(collection(db, 'bills'), where('partyId', '==', partyId));
        const billsSnapshot = await getDocs(billsQuery);
        const billsData = billsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBills(billsData);
      } catch (error) {
        console.error('Error fetching data: ', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBillsAndParty();
  }, [partyId]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!party) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography variant="h6">Party not found</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">
            Bills for {party.partyName} ({party.gstNo})
          </Typography>
          <Button
            variant="contained"
            component={Link}
            to="/add-bill"
            startIcon={<Add />}
          >
            Add New Bill
          </Button>
        </Box>

        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Bill No</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bills.length > 0 ? (
                bills.map(bill => (
                  <TableRow key={bill.id}>
                    <TableCell>{bill.billNo}</TableCell>
                    <TableCell>{format(new Date(bill.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell align="right">₹{bill.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip
                        label={bill.status}
                        color={
                          bill.status === 'paid' ? 'success' :
                          bill.status === 'pending' ? 'warning' : 'error'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        component={Link}
                        to={`/bill/${bill.id}`}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 1 }}
                      >
                        View
                      </Button>
                      {/* <PDFDownloadLink
                        document={<BillPDF bill={bill} />}
                        fileName={`bill_${bill.billNo}.pdf`}
                      >
                        {({ loading }) => (
                          <Tooltip title="Download PDF">
                            <IconButton size="small" disabled={loading}>
                              <PictureAsPdf color="error" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </PDFDownloadLink> */}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body1" sx={{ py: 2 }}>
                      No bills found for this party
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 2 }}>
          <Button
            component={Link}
            to="/parties"
            startIcon={<ArrowBack />}
          >
            Back to All Parties
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default PartyBills;