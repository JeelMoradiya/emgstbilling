import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Avatar,
  Box,
  Menu,
  MenuItem,
  IconButton,
  Divider,
  ListItemIcon,
  MenuList,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  Collapse,
} from "@mui/material";
import {
  AccountCircle,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Group as GroupIcon,
  Receipt as ReceiptIcon,
  Menu as MenuIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowLeft as ArrowLeftIcon,
  MoreVert as MoreVertIcon,
  PersonAdd,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/logo.png";

const Navbar = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [partyMenuEl, setPartyMenuEl] = useState(null);
  const [invoiceMenuEl, setInvoiceMenuEl] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width:600px)");

  const handleMenu = (event) => setAnchorEl(event.currentTarget);
  const handlePartyMenu = (event) => setPartyMenuEl(event.currentTarget);
  const handleInvoiceMenu = (event) => setInvoiceMenuEl(event.currentTarget);
  const handleDrawerToggle = () => setDrawerOpen(!drawerOpen);

  const handleClose = () => {
    setAnchorEl(null);
    setPartyMenuEl(null);
    setInvoiceMenuEl(null);
    setDrawerOpen(false);
  };

  const handleProfile = () => {
    handleClose();
    navigate("/profile");
  };

  const handleSettings = () => {
    handleClose();
    navigate("/settings");
  };

  const handleLogout = async () => {
    try {
      handleClose();
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const getAvatarText = () => {
    if (userProfile?.companyName)
      return userProfile.companyName.charAt(0).toUpperCase();
    if (userProfile?.fullName)
      return userProfile.fullName.charAt(0).toUpperCase();
    if (currentUser?.displayName)
      return currentUser.displayName.charAt(0).toUpperCase();
    return "U";
  };

  const navItems = [
    { name: "Home", path: "/" },
    { name: "Parties", onClick: handlePartyMenu },
    { name: "Sales", onClick: handleInvoiceMenu },
    // { name: "Purchases ", onClick: handleInvoiceMenu },
    { name: "Payments", path: "/payments" },
  ];

  return (
    <AppBar
      position="static"
      sx={{ bgcolor: "#2c3e50", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ py: 1, justifyContent: "space-between" }}>
          {isMobile ? (
            <>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2, display: { md: "none" } }}
              >
                <MenuIcon />
              </IconButton>
              <Drawer
                anchor="left"
                open={drawerOpen}
                onClose={handleDrawerToggle}
                sx={{
                  "& .MuiDrawer-paper": {
                    bgcolor: "#34495e",
                    color: "#ecf0f1",
                    width: 240,
                  },
                }}
              >
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <RouterLink to="/">
                    <img
                      src={logo}
                      alt="Hisab Setu Logo"
                      style={{
                        maxWidth: isMobile ? "120px" : "150px",
                        height: "auto",
                        flexGrow: 1,
                      }}
                    />
                  </RouterLink>
                  <IconButton
                    color="inherit"
                    onClick={handleDrawerToggle}
                    sx={{ display: { md: "none" } }}
                  >
                    <ArrowLeftIcon />
                  </IconButton>
                </Box>
                <Divider sx={{ bgcolor: "#7f8c8d" }} />
                <List>
                  {navItems.map((item) => (
                    <ListItem key={item.name} disablePadding>
                      <ListItemButton
                        onClick={
                          item.onClick ||
                          (() => {
                            navigate(item.path);
                            handleClose();
                          })
                        }
                        sx={{
                          textTransform: "none",
                          fontSize: "1rem",
                          px: 2,
                          py: 1,
                          color: "#ecf0f1",
                          "&:hover": { bgcolor: "#2c3e50" },
                        }}
                      >
                        {item.name}
                      </ListItemButton>
                    </ListItem>
                  ))}
                  <Collapse
                    in={Boolean(partyMenuEl)}
                    timeout="auto"
                    unmountOnExit
                  >
                    <List component="div" disablePadding>
                      <ListItem disablePadding>
                        <ListItemButton
                          onClick={() => {
                            navigate("/add-party");
                            handleClose();
                          }}
                          sx={{
                            pl: 4,
                            color: "#ecf0f1",
                            "&:hover": { bgcolor: "#2c3e50" },
                          }}
                        >
                          Party Manage
                        </ListItemButton>
                      </ListItem>
                      <ListItem disablePadding>
                        <ListItemButton
                          onClick={() => {
                            navigate("/parties");
                            handleClose();
                          }}
                          sx={{
                            pl: 4,
                            color: "#ecf0f1",
                            "&:hover": { bgcolor: "#2c3e50" },
                          }}
                        >
                          All Parties
                        </ListItemButton>
                      </ListItem>
                    </List>
                  </Collapse>
                  <Collapse
                    in={Boolean(invoiceMenuEl)}
                    timeout="auto"
                    unmountOnExit
                  >
                    <List component="div" disablePadding>
                      <ListItem disablePadding>
                        <ListItemButton
                          onClick={() => {
                            navigate("/add-bill");
                            handleClose();
                          }}
                          sx={{
                            pl: 4,
                            color: "#ecf0f1",
                            "&:hover": { bgcolor: "#2c3e50" },
                          }}
                        >
                          Add Invoice
                        </ListItemButton>
                      </ListItem>
                      <ListItem disablePadding>
                        <ListItemButton
                          onClick={() => {
                            navigate("/challan-book");
                            handleClose();
                          }}
                          sx={{
                            pl: 4,
                            color: "#ecf0f1",
                            "&:hover": { bgcolor: "#2c3e50" },
                          }}
                        >
                          Challan Book
                        </ListItemButton>
                      </ListItem>
                    </List>
                  </Collapse>
                </List>
                <Box sx={{ px: 2, py: 1, mt: "auto" }}>
                  <Divider sx={{ bgcolor: "#7f8c8d", mb: 2 }} />
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: "#e74c3c",
                        fontSize: "1rem",
                        fontWeight: "bold",
                        mr: 1,
                      }}
                    >
                      {getAvatarText()}
                    </Avatar>
                    <Box>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontSize: "0.857rem",
                          fontWeight: "bold",
                          color: "#ecf0f1",
                        }}
                      >
                        {userProfile?.companyName || "No Company"}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontSize: "0.857rem", color: "#bdc3c7" }}
                      >
                        {userProfile?.fullName ||
                          currentUser?.displayName ||
                          "User"}
                      </Typography>
                    </Box>
                    <IconButton
                      color="inherit"
                      onClick={handleMenu}
                      sx={{ p: 0, alignSelf: "flex-end" }}
                    >
                      <MoreVertIcon sx={{ color: "#ecf0f1" }} />
                    </IconButton>
                  </Box>

                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleClose}
                    PaperProps={{
                      sx: {
                        mt: 1,
                        bgcolor: "#34495e",
                        color: "#ecf0f1",
                        borderRadius: "8px",
                        boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                        minWidth: 200,
                      },
                    }}
                  >
                    <MenuItem
                      onClick={handleProfile}
                      sx={{ fontSize: "1rem", py: 1, px: 2 }}
                    >
                      <ListItemIcon>
                        <AccountCircle sx={{ color: "#ecf0f1" }} />
                      </ListItemIcon>
                      Profile
                    </MenuItem>
                    <MenuItem
                      onClick={handleSettings}
                      sx={{ fontSize: "1rem", py: 1, px: 2 }}
                    >
                      <ListItemIcon>
                        <SettingsIcon sx={{ color: "#ecf0f1" }} />
                      </ListItemIcon>
                      Settings
                    </MenuItem>
                    <Divider sx={{ bgcolor: "#7f8c8d" }} />
                    <MenuItem
                      onClick={handleLogout}
                      sx={{ fontSize: "1rem", py: 1, px: 2 }}
                    >
                      <ListItemIcon>
                        <LogoutIcon sx={{ color: "#ecf0f1" }} />
                      </ListItemIcon>
                      Logout
                    </MenuItem>
                  </Menu>
                </Box>
              </Drawer>
            </>
          ) : (
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
              }}
            >
              <RouterLink to="/">
                <img
                  src={logo}
                  alt="Hisab Setu Logo"
                  style={{
                    maxWidth: isMobile ? "120px" : "150px",
                    height: "auto",
                    marginRight: "16px",
                  }}
                />
              </RouterLink>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {navItems.map((item) => (
                  <Box key={item.name} sx={{ position: "relative" }}>
                    <Button
                      color="inherit"
                      endIcon={
                        item.name === "Parties" || item.name === "Sales"
                          ? <ArrowDownIcon />
                          : null
                      }
                      onClick={
                        item.onClick ||
                        (() => {
                          navigate(item.path);
                          handleClose();
                        })
                      }
                      sx={{
                        textTransform: "none",
                        fontSize: "1rem",
                        px: 2,
                        py: 1,
                        borderRadius: "8px",
                        color: "#ecf0f1",
                        "&:hover": { bgcolor: "#34495e" },
                        minWidth: "100px",
                      }}
                    >
                      {item.name}
                    </Button>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 2 }}>
            <IconButton onClick={handleMenu} sx={{ p: 0 }}>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: "#e74c3c",
                  fontSize: "1rem",
                  fontWeight: "bold",
                }}
              >
                {getAvatarText()}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              PaperProps={{
                sx: {
                  mt: 1,
                  bgcolor: "#34495e",
                  color: "#ecf0f1",
                  borderRadius: "8px",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                  minWidth: 200,
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: "bold", color: "#ecf0f1" }}
                >
                  {userProfile?.companyName || "No Company"}
                </Typography>
                <Typography variant="body2" sx={{ color: "#bdc3c7" }}>
                  {userProfile?.fullName || currentUser?.displayName || "User"}
                </Typography>
              </Box>
              <Divider sx={{ bgcolor: "#7f8c8d" }} />
              <MenuItem
                onClick={handleProfile}
                sx={{ fontSize: "1rem", py: 1, px: 2 }}
              >
                <ListItemIcon>
                  <AccountCircle sx={{ color: "#ecf0f1" }} />
                </ListItemIcon>
                Profile
              </MenuItem>
              <MenuItem
                onClick={handleSettings}
                sx={{ fontSize: "1rem", py: 1, px: 2 }}
              >
                <ListItemIcon>
                  <SettingsIcon sx={{ color: "#ecf0f1" }} />
                </ListItemIcon>
                Settings
              </MenuItem>
              <Divider sx={{ bgcolor: "#7f8c8d" }} />
              <MenuItem
                onClick={handleLogout}
                sx={{ fontSize: "1rem", py: 1, px: 2 }}
              >
                <ListItemIcon>
                  <LogoutIcon sx={{ color: "#ecf0f1" }} />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>

            <Menu
              anchorEl={partyMenuEl}
              open={Boolean(partyMenuEl)}
              onClose={handleClose}
              PaperProps={{
                sx: {
                  mt: 1,
                  bgcolor: "#34495e",
                  color: "#ecf0f1",
                  borderRadius: "8px",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                },
              }}
            >
              <MenuItem
                onClick={() => {
                  navigate("/add-party");
                  handleClose();
                }}
                sx={{ fontSize: "1rem", py: 1, px: 2 }}
              >
                <ListItemIcon>
                  <PersonAdd sx={{ color: "#ecf0f1" }} />
                </ListItemIcon>
                Party Manage
              </MenuItem>
              <MenuItem
                onClick={() => {
                  navigate("/parties");
                  handleClose();
                }}
                sx={{ fontSize: "1rem", py: 1, px: 2 }}
              >
                <ListItemIcon>
                  <GroupIcon sx={{ color: "#ecf0f1" }} />
                </ListItemIcon>
                All Parties
              </MenuItem>
            </Menu>

            <Menu
              anchorEl={invoiceMenuEl}
              open={Boolean(invoiceMenuEl)}
              onClose={handleClose}
              PaperProps={{
                sx: {
                  mt: 1,
                  bgcolor: "#34495e",
                  color: "#ecf0f1",
                  borderRadius: "8px",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                },
              }}
            >
              <MenuItem
                onClick={() => {
                  navigate("/add-bill");
                  handleClose();
                }}
                sx={{ fontSize: "1rem", py: 1, px: 2 }}
              >
                <ListItemIcon>
                  <ReceiptIcon sx={{ color: "#ecf0f1" }} />
                </ListItemIcon>
                Tax Invoice
              </MenuItem>
              <MenuItem
                onClick={() => {
                  navigate("/challan-book");
                  handleClose();
                }}
                sx={{ fontSize: "1rem", py: 1, px: 2 }}
              >
                <ListItemIcon>
                  <ReceiptIcon sx={{ color: "#ecf0f1" }} />
                </ListItemIcon>
                Challan Book
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;