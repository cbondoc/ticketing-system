import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Button,
  Divider,
  ButtonBase,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Add as AddIcon,
  Assignment as AssignmentIcon,
  Logout as LogoutIcon,
  Password as PasswordIcon,
  Person as UserIcon,
} from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

const drawerWidth = 240;

interface LayoutProps {
  children: React.ReactNode;
  profile: Profile | null;
}

export default function Layout({ children, profile }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleChangePassword = async () => {
    navigate('/change-password');
  };

  const handleProfile = async () => {
    navigate('/profile');
  };

  const handleLogout = async () => {
    const currentRole = profile?.role;
    await supabase.auth.signOut();

    if (currentRole === "technician") {
      navigate("/tech/login");
    } else {
      navigate("/login");
    }
  };

  const menuItems =
    profile?.role === "technician"
      ? [
        { text: "Dashboard", icon: <DashboardIcon />, path: "/tech" },
        { text: "Create Ticket", icon: <AddIcon />, path: "/tech/tickets/create" },
        { text: "Assigned Tickets", icon: <AssignmentIcon />, path: "/tech/tickets/assigned" },
      ]
      : [
        { text: "Dashboard", icon: <DashboardIcon />, path: "/" },
        { text: "Create Ticket", icon: <AddIcon />, path: "/tickets/create" },
        // 👈 no "Assigned Tickets" for customers
      ];

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Ticket System
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleProfile}>
            <ListItemIcon>
              <UserIcon />
            </ListItemIcon>
            <ListItemText primary="Profile" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={handleChangePassword}>
            <ListItemIcon>
              <PasswordIcon />
            </ListItemIcon>
            <ListItemText primary="Change Password" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find((item) => item.path === location.pathname)?.text
              || (location.pathname.includes("/tickets/") ? "Ticket Details" : "Dashboard")}
          </Typography>
          {profile && (
            <ButtonBase onClick={handleProfile}>
              <Typography variant="body2" sx={{ mr: 2, textTransform: "capitalize" }}>
                {profile.role}: {profile.username}
              </Typography>
            </ButtonBase>
          )}
          <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
