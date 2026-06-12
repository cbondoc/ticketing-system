import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom"; // or next/router if Next.js
import { supabase } from '../lib/supabase';
import { Box, CircularProgress, Typography, Alert } from "@mui/material";

export default function EmailConfirmation() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const confirmEmailChange = async () => {
      try {
        // Supabase will include an access_token in the URL
        const accessToken = searchParams.get("access_token");
        const type = searchParams.get("type");

        if (type === "email_change" && accessToken) {
          // Exchange the token for a session
          const { error } = await supabase.auth.exchangeCodeForSession(accessToken);

          if (error) {
            setStatus("error");
            setMessage(error.message);
          } else {
            setStatus("success");
            setMessage("Your email has been successfully updated!");
          }
        } else {
          setStatus("error");
          setMessage("Invalid or missing confirmation link.");
        }
      } catch (err: any) {
        setStatus("error");
        setMessage(err.message);
      }
    };

    confirmEmailChange();
  }, [searchParams]);

  return (
    <Box sx={{ maxWidth: 400, mx: "auto", mt: 4, textAlign: "center" }}>
      {status === "loading" && (
        <>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Confirming your email change...</Typography>
        </>
      )}
      {status === "success" && (
        <Alert severity="success">{message}</Alert>
      )}
      {status === "error" && (
        <Alert severity="error">{message}</Alert>
      )}
    </Box>
  );
}