// src/App.jsx
import { useState } from 'react'; // Add this import
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import Profile from './components/Profile';
import Settings from './components/Settings';
import AddParty from './components/AddParty';
import AddGSTBill from './components/AddGSTBill';
import PartyBills from './components/PartyBills';
import ViewBill from './components/ViewBill';
import AllParties from './components/AllParties';
import { useAuth } from './contexts/AuthContext';

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
  typography: { fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif' },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#90caf9' },
    secondary: { main: '#f48fb1' },
  },
  typography: { fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif' },
});

const ProtectedRoute = ({ component: Component, navbar: Navbar }) => {
  const { currentUser, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  return currentUser ? (
    <>
      {Navbar}
      <Component />
    </>
  ) : (
    <Navigate to="/login" />
  );
};

function App() {
  const [themeMode, setThemeMode] = useState('light');
  const theme = themeMode === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/" element={<ProtectedRoute component={Home} navbar={<Navbar setThemeMode={setThemeMode} />} />} />
            <Route path="/add-party" element={<ProtectedRoute component={AddParty} navbar={<Navbar setThemeMode={setThemeMode} />} />} />
            <Route path="/add-bill" element={<ProtectedRoute component={AddGSTBill} navbar={<Navbar setThemeMode={setThemeMode} />} />} />
            <Route path="/party-bills/:partyId" element={<ProtectedRoute component={PartyBills} navbar={<Navbar setThemeMode={setThemeMode} />} />} />
            <Route path="/bill/:billId" element={<ProtectedRoute component={ViewBill} navbar={<Navbar setThemeMode={setThemeMode} />} />} />
            <Route path="/parties" element={<ProtectedRoute component={AllParties} navbar={<Navbar setThemeMode={setThemeMode} />} />} />
            <Route path="/profile" element={<ProtectedRoute component={Profile} navbar={<Navbar setThemeMode={setThemeMode} />} />} />
            <Route path="/settings" element={<ProtectedRoute component={Settings} navbar={<Navbar setThemeMode={setThemeMode} />} />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;