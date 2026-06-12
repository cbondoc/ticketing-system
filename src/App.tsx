import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import type { Profile } from './types';

import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateTicket from './pages/CreateTicket';
import TicketDetail from './pages/TicketDetail';
import AssignedTickets from './pages/AssignedTickets';
import Unauthorized from './pages/Unauthorized';
import ChangePassword from './pages/ChangePassword';
import ProfilePage from './pages/Profile';
import ConfirmEmailChange from './pages/ConfirmEmailChange';
import ForgotPassword from './pages/ForgotPassword';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, role, created_at")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Profile fetch error:", error.message);
      setProfile(null);
    } else {
      setProfile(data);
    }
    setLoading(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          // Public routes
          <Route path="/login" element={<Login role="customer" />} />
          <Route path="/tech/login" element={<Login role="technician" />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/profile" element={<ProfilePage setProfile={setProfile} profile={profile} />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/tech/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/callback" element={<ConfirmEmailChange />} />

          // Protected routes
          <Route
            path="/"
            element={
              <ProtectedRoute user={user} loading={loading} profile={profile}>
                {profile?.role === "technician"
                  ? <Navigate to="/tech" replace />
                  : <Layout profile={profile}>
                    <Dashboard profile={profile} />
                  </Layout>
                }
              </ProtectedRoute>
            }
          />
          <Route
            path="/tech"
            element={
              <ProtectedRoute user={user} loading={loading} expectedRole="technician" profile={profile}>
                <Layout profile={profile}>
                  <Dashboard profile={profile} />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tickets/create"
            element={
              <ProtectedRoute user={user} loading={loading} expectedRole="customer" profile={profile}>
                <Layout profile={profile}>
                  <CreateTicket profile={profile} />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tech/tickets/create"
            element={
              <ProtectedRoute user={user} loading={loading} expectedRole="technician" profile={profile}>
                <Layout profile={profile}>
                  <CreateTicket profile={profile} />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tickets/assigned"
            element={
              <ProtectedRoute user={user} loading={loading} expectedRole="customer" profile={profile}>
                <Layout profile={profile}>
                  <AssignedTickets profile={profile} />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tech/tickets/assigned"
            element={
              <ProtectedRoute user={user} loading={loading} expectedRole="technician" profile={profile}>
                <Layout profile={profile}>
                  <AssignedTickets profile={profile} />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tickets/:id"
            element={
              <ProtectedRoute user={user} loading={loading} expectedRole="customer" profile={profile}>
                <Layout profile={profile}>
                  <TicketDetail profile={profile} />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tech/tickets/:id"
            element={
              <ProtectedRoute user={user} loading={loading} expectedRole="technician" profile={profile}>
                <Layout profile={profile}>
                  <TicketDetail profile={profile} />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/change-password"
            element={
              <ChangePassword profile={profile} />
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
