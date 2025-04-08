import { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Alert
} from '@mui/material';

const AddParty = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  const formik = useFormik({
    initialValues: {
      partyName: '',
      email: '',
      mobileNo: '',
      address: '',
      gstNo: '',
    },
    validationSchema: Yup.object({
      partyName: Yup.string().required('Required'),
      email: Yup.string().email('Invalid email address').required('Required'),
      mobileNo: Yup.string()
        .matches(/^[0-9]{10}$/, 'Mobile number must be 10 digits')
        .required('Required'),
      address: Yup.string().required('Required'),
      gstNo: Yup.string()
        .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number')
        .required('Required'),
    }),
    onSubmit: async (values) => {
      if (!currentUser) {
        setError('Please log in to add a party');
        return;
      }

      setIsSubmitting(true);
      setSuccess(false);
      setError(null);
      try {
        await addDoc(collection(db, 'parties'), {
          ...values,
          createdAt: new Date().toISOString(),
          createdBy: currentUser.uid
        });
        formik.resetForm();
        setSuccess(true);
      } catch (error) {
        console.error('Error adding party: ', error);
        setError('Failed to add party: ' + error.message);
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Add New Party
        </Typography>
        
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Party added successfully!
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={formik.handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="partyName"
                name="partyName"
                label="Party Name"
                value={formik.values.partyName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.partyName && Boolean(formik.errors.partyName)}
                helperText={formik.touched.partyName && formik.errors.partyName}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="email"
                name="email"
                label="Email"
                type="email"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="mobileNo"
                name="mobileNo"
                label="Mobile No"
                value={formik.values.mobileNo}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.mobileNo && Boolean(formik.errors.mobileNo)}
                helperText={formik.touched.mobileNo && formik.errors.mobileNo}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="gstNo"
                name="gstNo"
                label="GST No"
                value={formik.values.gstNo}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.gstNo && Boolean(formik.errors.gstNo)}
                helperText={formik.touched.gstNo && formik.errors.gstNo}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                id="address"
                name="address"
                label="Party Address"
                multiline
                rows={3}
                value={formik.values.address}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.address && Boolean(formik.errors.address)}
                helperText={formik.touched.address && formik.errors.address}
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                color="primary"
                variant="contained"
                fullWidth
                type="submit"
                disabled={isSubmitting || !currentUser}
                size="large"
              >
                {isSubmitting ? <CircularProgress size={24} /> : 'Add Party'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};

export default AddParty;