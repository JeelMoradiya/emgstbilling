import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
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
  CircularProgress,
  Box,
  Alert,
} from '@mui/material';
import { Add } from '@mui/icons-material';

const AllParties = () => {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      setError('Please log in to view parties');
      setLoading(false);
      return;
    }

    const fetchParties = async () => {
      try {
        const q = query(collection(db, 'parties'), where('createdBy', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        const partiesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setParties(partiesData);
      } catch (error) {
        console.error('Error fetching parties: ', error);
        setError('Failed to fetch parties: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchParties();
  }, [currentUser]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h5">All Parties</Typography>
          <Button
            variant="contained"
            component={Link}
            to="/add-party"
            startIcon={<Add />}
            disabled={!currentUser}
          >
            Add New Party
          </Button>
        </Box>

        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Company Name</TableCell>{" "}
                {/* Updated to use companyName */}
                <TableCell>GST No</TableCell>
                <TableCell>Mobile</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {parties.length > 0 ? (
                parties.map((party) => (
                  <TableRow key={party.id}>
                    <TableCell>{party.companyName || "N/A"}</TableCell>{" "}
                    {/* Updated */}
                    <TableCell>{party.gstNo || "N/A"}</TableCell>
                    <TableCell>{party.mobileNo || "N/A"}</TableCell>
                    <TableCell>{party.email || "N/A"}</TableCell>
                    <TableCell>
                      <Button
                        component={Link}
                        to={`/party-bills/${party.id}`}
                        size="small"
                        variant="outlined"
                      >
                        View Bills
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body1" sx={{ py: 2 }}>
                      No parties found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
};

export default AllParties;