import { useState } from "react";
import { supabase } from '../lib/supabase';
import {
    Container, Box, Paper, Typography, TextField, Button, Alert
} from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setError(null);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: "https://ticketing-system-one-blond.vercel.app/change-password",
        });

        if (error) {
            setError(error.message);
        } else {
            setMessage("If that email exists, a reset link has been sent.");
        }
    };

    return (
        <Container maxWidth="xs">
            <Box sx={{ mt: 8, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Paper elevation={3} sx={{ p: 4, width: "100%" }}>
                    <Typography variant="h5" align="center" gutterBottom>
                        Forgot Password
                    </Typography>

                    {error && <Alert severity="error">{error}</Alert>}
                    {message && <Alert severity="success">{message}</Alert>}

                    <Box component="form" onSubmit={handleForgotPassword}>
                        <TextField
                            fullWidth
                            required
                            margin="normal"
                            label="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <Button type="submit" fullWidth variant="contained" sx={{ mt: 3 }}>
                            Send Reset Link
                        </Button>
                        {location.pathname === "/forgot-password" ? (
                            <Button
                                variant="outlined"
                                fullWidth
                                sx={{ mt: 3 }}
                                onClick={() => navigate("/login")}
                            >
                                Go Back
                            </Button>
                        ) : location.pathname === "/tech/forgot-password" ? (
                            <Button
                                variant="outlined"
                                fullWidth
                                sx={{ mt: 3 }}
                                onClick={() => navigate("/tech/login")}
                            >
                                Go Back
                            </Button>
                        ) : null}
                    </Box>
                </Paper>
            </Box>
        </Container>
    );
}