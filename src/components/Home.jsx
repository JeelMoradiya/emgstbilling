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
    CircularProgress
  } from '@mui/material';
  import { Link } from 'react-router-dom';
  import { Add, PictureAsPdf } from '@mui/icons-material';
  import { collection, getDocs } from 'firebase/firestore';
  import { db } from '../firebase';
  import { useEffect, useState } from 'react';
  import { PDFDownloadLink } from '@react-pdf/renderer';
  import BillPDF from './BillPDF';
  
  const Home = () => {
    const [recentBills, setRecentBills] = useState([]);
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
      const fetchRecentBills = async () => {
        try {
          const querySnapshot = await getDocs(collection(db, 'bills'));
          const billsData = querySnapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);
          setRecentBills(billsData);
        } catch (error) {
          console.error('Error fetching recent bills: ', error);
        } finally {
          setLoading(false);
        }
      };
  
      fetchRecentBills();
    }, []);
  
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Add New Party
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Register new business parties with their GST details
              </Typography>
              <Button 
                variant="contained" 
                component={Link} 
                to="/add-party"
                fullWidth
                startIcon={<Add />}
              >
                Go to Add Party
              </Button>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Create GST Bill
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Generate new GST invoices with tax calculations
              </Typography>
              <Button 
                variant="contained" 
                component={Link} 
                to="/add-bill"
                fullWidth
                startIcon={<Add />}
              >
                Go to Add Bill
              </Button>
            </Paper>
          </Grid>
        </Grid>
  
        {!loading && recentBills.length > 0 && (
          <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Recent Bills
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Bill No</TableCell>
                    {/* <TableCell>Name</TableCell> */}
                    <TableCell>Date</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Download</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentBills.map(bill => (
                    <TableRow key={bill.id}>
                      <TableCell>{bill.billNo}</TableCell>
                      {/* <TableCell>{bill.partyDetails.partyName}</TableCell> */}
                      <TableCell>{new Date(bill.date).toLocaleDateString()}</TableCell>
                      <TableCell>₹{bill.total.toFixed(2)}</TableCell>
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
                            <Button
                              size="small"
                              startIcon={<PictureAsPdf />}
                              disabled={loading}
                            >
                              PDF
                            </Button>
                          )}
                        </PDFDownloadLink> */}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Container>
    );
  };
  
  export default Home;