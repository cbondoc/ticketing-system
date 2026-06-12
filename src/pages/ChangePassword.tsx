import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Box,
    Button,
    Container,
    TextField,
    Typography,
    Paper,
    Alert,
    InputAdornment,
    IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types";

interface CurrentProfile {
    profile: Profile | null;
}

export default function ChangePassword({ profile }: CurrentProfile) {
    const [password, setPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [changing, setChanging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isResetMode, setIsResetMode] = useState(false); // 👈 flag
    const navigate = useNavigate();

    useEffect(() => {
        const { data: subscription } = supabase.auth.onAuthStateChange(
            (event) => {
                if (event === "PASSWORD_RECOVERY") {
                    setIsResetMode(true);
                }
            }
        );

        return () => {
            subscription.subscription.unsubscribe();
        };
    }, []);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setChanging(true);
        setError(null);
        setSuccess(null);

        if (!isResetMode) {
            // Normal logged-in flow: verify current password
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError || !userData?.user?.email) {
                setError("User not authenticated");
                setChanging(false);
                return;
            }

            const email = userData.user.email;
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (signInError) {
                setError("Current password is incorrect");
                setChanging(false);
                return;
            }
        }

        // ✅ Works for both reset mode and logged-in mode
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (updateError) {
            setError(updateError.message);
        } else {
            if (isResetMode) {
                // Forgot Password flow → redirect after success
                setSuccess("Password updated successfully! Redirecting to login after 5 seconds");
                setPassword("");
                setNewPassword("");

                setTimeout(() => {
                    navigate("/login");
                }, 5000);
            } else {
                // Logged-in user flow → no redirect
                setSuccess("Password updated successfully!");
                setPassword("");
                setNewPassword("");
            }
        }


        setChanging(false);
    };

    return (
        <Container component="main" maxWidth="xs">
            <Box sx={{ mt: 8, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Paper elevation={3} sx={{ p: 4, width: "100%" }}>
                    <Typography component="h1" variant="h4" align="center" gutterBottom>
                        Change Password
                    </Typography>

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                    <Box component="form" onSubmit={handleChangePassword}>
                        {/* Only show current password if NOT reset mode */}
                        {!isResetMode && (
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="password"
                                label="Current Password"
                                type={showPassword ? "text" : "password"}
                                id="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label="toggle password visibility"
                                                onClick={() => setShowPassword(!showPassword)}
                                                edge="end"
                                            >
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        )}

                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="newPassword"
                            label="New Password"
                            type={showNewPassword ? "text" : "password"}
                            id="new-password"
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            edge="end"
                                        >
                                            {showNewPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                            disabled={changing}
                        >
                            {changing ? "Changing password..." : "Change Password"}
                        </Button>
                        {isResetMode ? (
                            profile?.role === "customer" ? (
                                <Button variant="outlined" fullWidth sx={{ mt: 2 }} onClick={() => navigate("/login")}>
                                    Cancel
                                </Button>
                            ) : (
                                <Button variant="outlined" fullWidth sx={{ mt: 2 }} onClick={() => navigate("/tech/login")}>
                                    Cancel
                                </Button>
                            )
                        ) : (
                            profile?.role === "customer" ? (
                                <Button variant="outlined" fullWidth sx={{ mt: 2 }} onClick={() => navigate(-1)}>
                                    Cancel
                                </Button>
                            ) : (
                                <Button variant="outlined" fullWidth sx={{ mt: 2 }} onClick={() => navigate(-1)}>
                                    Cancel
                                </Button>
                            ))
                        }

                    </Box>
                </Paper>
            </Box>
        </Container>
    );
}