import { Navigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { CircularProgress, Box } from '@mui/material';
import type { Profile } from '../types';

interface ProtectedRouteProps {
  user: User | null;
  loading: boolean;
  children: React.ReactNode;
  expectedRole?: "customer" | "technician";
  profile?: Profile | null; // ✅ allow null
}

export default function ProtectedRoute({
  user,
  loading,
  children,
  expectedRole,
  profile,
}: ProtectedRouteProps) {
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }
  
  if (!user) {
    return expectedRole === "technician"
      ? <Navigate to="/tech/login" replace />
      : <Navigate to="/login" replace />;
  }
  
  if (!profile) {
    // 👈 still fetching profile, don’t redirect yet
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }
  
  if (expectedRole && profile.role !== expectedRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}