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
  CircularProgress,
  Tabs,
  Tab,
  Card,
  CardContent
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { Add, PictureAsPdf } from '@mui/icons-material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useEffect, useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import BillPDF from './BillPDF';
import { useAuth } from '../contexts/AuthContext';
import { BarChart } from '@mui/x-charts/BarChart';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: '16px',
  background: 'linear-gradient(145deg, #ffffff, #f0f0f0)',
  boxShadow: '8px 8px 16px #d1d1d1, -8px -8px 16px #ffffff',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-8px) scale(1.02)',
    boxShadow: '12px 12px 24px #b8b8b8, -12px -12px 24px #ffffff',
  },
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  borderRadius: '16px',
  background: 'linear-gradient(145deg, #ffffff, #f0f0f0)',
  boxShadow: '6px 6px 12px #d1d1d1, -6px -6px 12px #ffffff',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    boxShadow: '10px 10px 20px #b8b8b8, -10px -10px 20px #ffffff',
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: '12px',
  padding: '10px 24px',
  textTransform: 'none',
  fontWeight: 600,
  background: 'linear-gradient(90deg, #1976d2, #42a5f5)',
  boxShadow: '4px 4px 8px #b8b8b8',
  '&:hover': {
    boxShadow: '6px 6px 12px #a0a0a0',
    transform: 'translateY(-2px)',
  },
}));

const Home = () => {
  const [recentBills, setRecentBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billStats, setBillStats] = useState({ paid: [], pending: [], canceled: [] });
  const [timePeriod, setTimePeriod] = useState('month');
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { replace: true });
      return;
    }

    window.history.pushState(null, '', window.location.pathname);
    const handleBack = (event) => {
      event.preventDefault();
      window.history.pushState(null, '', window.location.pathname);
    };
    window.addEventListener('popstate', handleBack);

    return () => window.removeEventListener('popstate', handleBack);
  }, [currentUser, navigate]);

  useEffect(() => {
    if (!currentUser) return;

    const fetchBills = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'bills'));
        const billsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const sortedRecent = billsData
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 5);
        setRecentBills(sortedRecent);

        const now = new Date();
        const stats = { paid: [], pending: [], canceled: [] };
        const periods = getPeriods(timePeriod);

        periods.forEach(period => {
          const periodBills = billsData.filter(bill => {
            const billDate = new Date(bill.date);
            return isInPeriod(billDate, period, timePeriod);
          });
          
          stats.paid.push(periodBills.filter(b => b.status === 'paid').length);
          stats.pending.push(periodBills.filter(b => b.status === 'pending').length);
          stats.canceled.push(periodBills.filter(b => b.status === 'canceled').length);
        });

        setBillStats(stats);
      } catch (error) {
        console.error('Error fetching bills: ', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, [currentUser, timePeriod]);

  const getPeriods = (periodType) => {
    const now = new Date();
    switch (periodType) {
      case 'day':
        return Array.from({ length: 7 }, (_, i) => {
          const date = new Date(now);
          date.setDate(now.getDate() - i);
          return date;
        }).reverse();
      case 'week':
        return Array.from({ length: 4 }, (_, i) => {
          const date = new Date(now);
          date.setDate(now.getDate() - (i * 7));
          return date;
        }).reverse();
      case 'month':
        return Array.from({ length: 6 }, (_, i) => {
          const date = new Date(now);
          date.setMonth(now.getMonth() - i);
          return date;
        }).reverse();
      case 'year':
        return Array.from({ length: 5 }, (_, i) => {
          const date = new Date(now);
          date.setFullYear(now.getFullYear() - i);
          return date;
        }).reverse();
      default:
        return [];
    }
  };

  const isInPeriod = (billDate, periodDate, periodType) => {
    switch (periodType) {
      case 'day':
        return billDate.toDateString() === periodDate.toDateString();
      case 'week':
        const weekStart = new Date(periodDate);
        weekStart.setDate(periodDate.getDate() - periodDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return billDate >= weekStart && billDate <= weekEnd;
      case 'month':
        return billDate.getMonth() === periodDate.getMonth() &&
               billDate.getFullYear() === periodDate.getFullYear();
      case 'year':
        return billDate.getFullYear() === periodDate.getFullYear();
      default:
        return false;
    }
  };

  const formatLabel = (date) => {
    switch (timePeriod) {
      case 'day': return date.toLocaleDateString('en-US', { weekday: 'short' });
      case 'week': return `W${Math.ceil((date.getDate()) / 7)}`;
      case 'month': return date.toLocaleDateString('en-US', { month: 'short' });
      case 'year': return date.getFullYear().toString();
      default: return '';
    }
  };

  if (!currentUser || loading) {
    return (
      <Container maxWidth="lg" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={60} thickness={4} sx={{ color: '#1976d2' }} />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 6 }}>
      <Grid container spacing={4}>
        <Grid item xs={12} sm={6} md={4}>
          <StyledCard>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: '#1a237e' }}>
                Add New Party
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Register new business parties with their GST details
              </Typography>
              <StyledButton
                variant="contained"
                component={Link}
                to="/add-party"
                fullWidth
                startIcon={<Add />}
              >
                Add Party
              </StyledButton>
            </CardContent>
          </StyledCard>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <StyledCard>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: '#1a237e' }}>
                Create GST Bill
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Generate new GST invoices with tax calculations
              </Typography>
              <StyledButton
                variant="contained"
                component={Link}
                to="/add-bill"
                fullWidth
                startIcon={<Add />}
              >
                Create Bill
              </StyledButton>
            </CardContent>
          </StyledCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <StyledCard sx={{ height: '100%' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: '#1a237e' }}>
                Quick Stats
              </Typography>
              <Box>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  Paid Bills: {billStats.paid.reduce((a, b) => a + b, 0)}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  Pending: {billStats.pending.reduce((a, b) => a + b, 0)}
                </Typography>
                <Typography variant="body1">
                  Canceled: {billStats.canceled.reduce((a, b) => a + b, 0)}
                </Typography>
              </Box>
            </CardContent>
          </StyledCard>
        </Grid>

        <Grid item xs={12}>
          <StyledPaper sx={{ p: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, color: '#1a237e' }}>
              Bill Statistics
            </Typography>
            <Tabs 
              value={timePeriod} 
              onChange={(e, newValue) => setTimePeriod(newValue)}
              sx={{ mb: 4 }}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label="Daily" value="day" sx={{ fontWeight: 600 }} />
              <Tab label="Monthly" value="month" sx={{ fontWeight: 600 }} />
              <Tab label="Yearly" value="year" sx={{ fontWeight: 600 }} />
            </Tabs>
            <BarChart
              series={[
                { data: billStats.paid, label: 'Paid', color: '#2ecc71' },
                { data: billStats.pending, label: 'Pending', color: '#f1c40f' },
                { data: billStats.canceled, label: 'Canceled', color: '#e74c3c' },
              ]}
              height={350}
              xAxis={[{
                data: getPeriods(timePeriod).map(formatLabel),
                scaleType: 'band',
              }]}
              margin={{ top: 30, bottom: 50, left: 60, right: 30 }}
              sx={{
                '& .MuiChartsAxis-label': { fontSize: '1rem', fontWeight: 500 },
                '& .MuiChartsLegend-root': { marginTop: '20px' },
              }}
            />
          </StyledPaper>
        </Grid>

        {recentBills.length > 0 && (
          <Grid item xs={12}>
            <StyledPaper sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, color: '#1a237e' }}>
                Recent Bills
              </Typography>
              <TableContainer>
                <Table size="medium">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: '#1a237e' }}>Bill No</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#1a237e' }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#1a237e' }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#1a237e' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#1a237e' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentBills.map(bill => (
                      <TableRow key={bill.id} hover sx={{ '&:hover': { backgroundColor: '#f5f5f5' } }}>
                        <TableCell>{bill.billNo}</TableCell>
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
                            sx={{ 
                              minWidth: 90,
                              boxShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <StyledButton
                            component={Link}
                            to={`/bill/${bill.id}`}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              background: 'transparent',
                              border: '2px solid #1976d2',
                              '&:hover': { border: '2px solid #1565c0' }
                            }}
                          >
                            View
                          </StyledButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </StyledPaper>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default Home;