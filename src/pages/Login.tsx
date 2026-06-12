import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Alert,
  Tab,
  Tabs,
  InputAdornment,
  IconButton,

} from '@mui/material';
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { supabase } from '../lib/supabase';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}


function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Login({ role }: { role: "customer" | "technician" }) {

  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const user = data.user; // ✅ declare user first
    if (user) {
      // Fetch profile once
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, role, created_at")
        .eq("id", user.id)
        .single();

      if (profileError) {
        setError("Failed to fetch profile: " + profileError.message);
        setLoading(false);
        return;
      }

      // Redirect based on role
      if (profileData?.role === "customer") {
        navigate("/");
      } else if (profileData?.role === "technician") {
        navigate("/tech/");
      } else {
        navigate("/"); // fallback
      }
    }

    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!username.trim()) {
      setError('Username is required');
      setLoading(false);
      return;
    }

    // ✅ use role directly (already destructured)
    const userRole: "customer" | "technician" = role.toLowerCase() as "customer" | "technician";

    // Check if username is already taken
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username.trim())
      .single();

    if (existingUser) {
      setError('Username is already taken');
      setLoading(false);
      return;
    }

    // Sign up with role in user metadata
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.trim(),
          role: userRole, // 👈 add role here
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Create profile with role
      const { error: profileError } = await supabase
        .from("profiles")
        .insert([
          {
            id: data.user.id,
            username: username.trim(),
            role: userRole, // 👈 ensure lowercase "customer" or "technician"
            created_at: new Date().toISOString(),
          },
        ]);


      if (profileError) {
        setError('Failed to create profile: ' + profileError.message);
        setLoading(false);
        return;
      }

      setSuccess('Account created successfully! You can now log in.');
      setTab(0);
      setPassword('');
    }
    setLoading(false);
  };

  const handleClickShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  const handleMouseDownPassword = (e: React.FormEvent) => {
    e.preventDefault(); // prevents focus loss
  };


  return (

    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Ticket System
          </Typography>

          <Tabs value={tab} onChange={(_, v) => setTab(v)} centered sx={{ mb: 2 }}>
            <Tab label="Login" />
            <Tab label="Sign Up" />
          </Tabs>

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

          <TabPanel value={tab} index={0}>
            <Box component="form" onSubmit={handleLogin}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
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
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              {location.pathname === "/login" ? (
                <Button
                  onClick={() => navigate("/forgot-password")}
                  sx={{ mt: 1 }}
                >
                  Forgot Password?
                </Button>
              ) : location.pathname === "/tech/login" ? (
                <Button
                  onClick={() => navigate("/tech/forgot-password")}
                  sx={{ mt: 1 }}
                >
                  Forgot Password?
                </Button>
              ) : null}



              {location.pathname === "/login" ? (
                <>
                  <Button
                    type="submit"
                    color='primary'
                    fullWidth
                    variant="contained"
                    sx={{ mt: 2, mb: 3 }}
                    disabled={loading}
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>

                  <Button
                    variant="outlined"
                    color='error'
                    fullWidth
                    onClick={() => navigate("/tech/login")}
                  >
                    Are you technician? Go here
                  </Button>
                </>

              ) : location.pathname === "/tech/login" ? (
                <>
                  <Button
                    type="submit"
                    color='error'
                    fullWidth
                    variant="contained"
                    sx={{ mt: 2, mb: 3 }}
                    disabled={loading}
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>

                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => navigate("/login")}
                  >
                    Are you customer? Go here
                  </Button>
                </>

              ) : null}

            </Box>
          </TabPanel>

          <TabPanel value={tab} index={1}>
            <Box component="form" onSubmit={handleSignUp}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="signup-username"
                label="Username"
                name="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="signup-email"
                label="Email Address"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                id="signup-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {location.pathname === "/login" ? (
                <>
                  <Button
                    type="submit"
                    fullWidth
                    color="primary"
                    variant="contained"
                    sx={{ mt: 3, mb: 2 }}
                    disabled={loading}
                  >
                    {loading ? 'Creating account...' : 'Sign Up'}
                  </Button>

                  <Button
                    variant="outlined"
                    fullWidth
                    color='error'
                    onClick={() => navigate("/tech/login")}
                  >
                    Are you technician? Go here
                  </Button>
                </>

              ) : location.pathname === "/tech/login" ? (
                <>
                  <Button
                    type="submit"
                    fullWidth
                    color="error"
                    variant="contained"
                    sx={{ mt: 3, mb: 2 }}
                    disabled={loading}
                  >
                    {loading ? 'Creating account...' : 'Sign Up'}
                  </Button>

                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => navigate("/login")}
                  >
                    Are you customer? Go here
                  </Button>
                </>

              ) : null}
            </Box>
          </TabPanel>
        </Paper>
      </Box>
    </Container>
  );
}
