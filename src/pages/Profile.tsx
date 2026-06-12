import { useState, useEffect } from "react";
import { TextField, Button, Box, FormControlLabel, Switch, Alert, Typography } from "@mui/material";
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import type { Profile } from "../types";

interface ProfilePageProps {
    profile: Profile | null;
    setProfile: (profile: Profile | null) => void;
}

export default function ProfilePage({ setProfile, profile }: ProfilePageProps) {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [editMode, setEditMode] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // fetch from your profiles table
                const { data, error } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .single();

                if (!error && data) {
                    setEmail(user.email ?? ""); // email still comes from auth
                    setUsername(data.username ?? ""); // username from profiles table
                    setProfile(data);
                }
            }
        };
        fetchProfile();
    }, []);

    const handleUpdate = async () => {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setError("No user logged in");
            setLoading(false);
            return;
        }

        // update email in auth
        const { error: authError } = await supabase.auth.updateUser({ email });

        // update username in profiles table
        const { error: profileError } = await supabase
            .from("profiles")
            .update({ username })
            .eq("id", user.id);

        setLoading(false);

        if (authError || profileError) {
            setError(authError?.message || profileError?.message || "Update failed");
        } else {
            setSuccess("Profile updated successfully! Please confirm your new email if you change it.");
            setEditMode(false);

            // ✅ Only re-fetch if both updates succeeded
            const { data, error: refetchError } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            if (!refetchError && data) {
                setProfile(data); // Layout sees updated state immediately
            }
        }
    };

    const handleChangePassword = async () => {
        navigate('/change-password');
    };

    return (
        <Box sx={{ maxWidth: 400, mx: "auto", mt: 4 }}>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {success}
                </Alert>
            )}
            {/* Toggle for edit mode */}
            <FormControlLabel
                control={
                    <Switch
                        checked={editMode}
                        onChange={(e) => setEditMode(e.target.checked)}
                    />
                }
                label="Edit Profile"
            />

            <TextField
                fullWidth
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                margin="normal"
                disabled={!editMode}
            />
            <TextField
                fullWidth
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                disabled={!editMode}
            />
            <Typography component="p" variant="caption" color="text.secondary" gutterBottom>
                Note: You will need to confirm your new email address after updating it.
            </Typography>

            {editMode && (
                <>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleUpdate}
                        disabled={loading}
                        fullWidth
                        sx={{ mt: 2 }}
                    >
                        {loading ? "Saving..." : "Save Changes"}
                    </Button>
                </>
            )}
            <Button
                variant="outlined"
                color="inherit"
                onClick={handleChangePassword}
                disabled={editMode}
                fullWidth
                sx={{ mt: 2 }}
            >
                Change Password
            </Button>
            {profile?.role === "customer" ? (
                <Button
                    variant="outlined"
                    fullWidth
                    sx={{ mt: 2 }}
                    onClick={() => navigate("/")}
                >
                    Go Back
                </Button>
            ) : (
                <Button
                    variant="outlined"
                    fullWidth
                    sx={{ mt: 2 }}
                    onClick={() => navigate("/tech")}
                >
                    Go Back
                </Button>
            )}
        </Box>
    );
}