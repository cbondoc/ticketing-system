import React, { type JSX } from "react";
import { Box, Typography, Button } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Decide message and actions based on attempted path
  let message: string = "You don’t have permission to view this page.";
  let actions: JSX.Element | null = null;

  if (location.pathname.startsWith("/tech")) {
    message = "This page is for technicians only.";
    actions = (
      <Box display="flex" gap={2}>
        <Button variant="contained" color="primary" onClick={() => navigate("/login")}>
          Go to Login
        </Button>
      </Box>
    );
  } else if (location.pathname === "/") {
    message = "This page is for customers only.";
    actions = (
      <Box display="flex" gap={2}>
        <Button variant="outlined" color="secondary" onClick={() => navigate("/tech/login")}>
          Login
        </Button>
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      textAlign="center"
      gap={2}
    >
      <Typography variant="h3" color="error">
        🚫 Unauthorized
      </Typography>
      <Typography variant="body1">{message}</Typography>
      {actions}
    </Box>
  );
};

export default Unauthorized;