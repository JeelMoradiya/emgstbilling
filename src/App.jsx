import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "./contexts/AuthContext";
import Navbar from "./components/layouts/Navbar";
import Home from "./pages/Home";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import AddParty from "./pages/parties/AddParty";
import AddGSTBill from "./pages/bills/AddGSTBill";
import PartyBills from "./pages/parties/PartyBills";
import ViewBill from "./pages/bills/ViewBill";
import AllParties from "./pages/parties/AllParties";
import Payment from "./pages/payments/Payment";
import Payments from "./pages/payments/Payments";
import ChallanBook from "./pages/challan/ChallanBook";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import { useAuth } from "./contexts/AuthContext";
import { useEffect } from "react";

const theme = createTheme({
  palette: {
    primary: { main: "#2c3e50" },
    secondary: { main: "#34495e" },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

const ProtectedRoute = ({ component: Component, navbar: Navbar }) => {
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    if (currentUser) {
      window.history.pushState(null, "", window.location.href);
      window.onpopstate = () => {
        window.history.pushState(null, "", window.location.href);
      };
      return () => {
        window.onpopstate = null;
      };
    }
  }, [currentUser]);

  if (loading) return <div>Loading...</div>;

  return currentUser ? (
    <>
      {Navbar}
      <Component />
    </>
  ) : (
    <Navigate to="/login" replace />
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <ToastContainer position="top-right" autoClose={2000} />
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route
              path="/"
              element={<ProtectedRoute component={Home} navbar={<Navbar />} />}
            />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route
              path="/add-party"
              element={
                <ProtectedRoute component={AddParty} navbar={<Navbar />} />
              }
            />
            <Route
              path="/add-bill"
              element={
                <ProtectedRoute component={AddGSTBill} navbar={<Navbar />} />
              }
            />
            <Route
              path="/add-bill/:partyId"
              element={
                <ProtectedRoute component={AddGSTBill} navbar={<Navbar />} />
              }
            />
            <Route
              path="/party-bills/:partyId"
              element={
                <ProtectedRoute component={PartyBills} navbar={<Navbar />} />
              }
            />
            <Route
              path="/bill/:billId"
              element={
                <ProtectedRoute component={ViewBill} navbar={<Navbar />} />
              }
            />
            <Route
              path="/parties"
              element={
                <ProtectedRoute component={AllParties} navbar={<Navbar />} />
              }
            />
            <Route
              path="/challan-book"
              element={
                <ProtectedRoute component={ChallanBook} navbar={<Navbar />} />
              }
            />
            <Route
              path="/payment/:partyId"
              element={
                <ProtectedRoute component={Payment} navbar={<Navbar />} />
              }
            />
            <Route path="/payments" element={
                <ProtectedRoute component={Payments} navbar={<Navbar />} />
              }/>
            <Route
              path="/profile"
              element={
                <ProtectedRoute component={Profile} navbar={<Navbar />} />
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute component={Settings} navbar={<Navbar />} />
              }
            />
            <Route
              path="/privacy-policy"
              element={
                <ProtectedRoute component={PrivacyPolicy} navbar={<Navbar />} />
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
