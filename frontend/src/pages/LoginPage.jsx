import { Card, CardContent, TextField, Button, Typography, CircularProgress, Snackbar, Alert, Stack, Box } from "@mui/material";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import JGILogo from "../assets/JGI.webp";
import ConvocationBanner from "../assets/banner.webp";
import config from "../config";
import { useAuth } from '../config/AuthContext';

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${config.API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username, password }),
      });

      if (response.ok) {
        const { userdata, token } = await response.json();
        login(userdata, token);
        if (userdata.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/sessions");
        }
      } else {
        setSnackbarMessage("Login failed: Incorrect username or password.\nPlease visit the help desk near the entrance for assistance with logging in.");
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error("Error logging in:", error);
      setSnackbarMessage("An error occurred. Please try again.");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (password) => {
    // Regex for Indian and Nepal phone numbers with optional country codes:
    // - Must be exactly 10 or 12 digits
    // - Must start with 6, 7, 8, or 9 for India
    // - Must start with 9 for Nepal
    // - Optional country codes: 91 for India, 977 for Nepal
    const regex = /^(91|977)?[6-9]\d{9}(\d{3})?$/;
    return regex.test(password);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  return (
    <div className='login-container'>
      <Card variant='outlined' sx={{ borderRadius: '12px', p: { xs: 0, md: 3 }, maxWidth: '600px' }}>
        <CardContent>
          <div style={{ backgroundColor: '#001b54', borderRadius: '8px', marginBottom: '40px', position: 'relative' }}>
            <img src={ConvocationBanner} alt="Profile" style={{ height: 'auto', mixBlendMode: 'lighten' }} />
            <div style={{ height: '60px', width: '60px', position: 'absolute', bottom: '-30px', left: '40px',transform: 'translateX(-50%)', borderRadius: '50%', background: '#fff',display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={JGILogo} alt="JGI Logo" style={{ width: '80%', height: 'auto' }} />
            </div>
          </div>

          <form onSubmit={handleLogin}>
            <TextField
              label='Username'
              variant='outlined'
              fullWidth
              value={username}
              onChange={(e) => setUsername(e.target.value.toUpperCase())}
              required
              margin='normal'
              placeholder="Enter your USN in caps"
            />
            <TextField
              label='Password'
              type='password'
              variant='outlined'
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              margin='normal'
              placeholder="Enter your registered phone number"
              error={!validatePassword(password) && password.length > 0}
              helperText={"For any assistance with logging in, please visit the help desk near the entrance."}
            />
            <Button type='submit' variant='contained' color='primary' fullWidth disabled={loading} sx={{ mt: 2, borderRadius: '25px', fontSize: '1.2rem' }}>
              {loading ? <CircularProgress size={24} /> : "Login"}
            </Button>
          </form>
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Link to="/faq" state={{ hideHeader: true }} style={{ textDecoration: 'none' }}>
              <Typography variant="caption" color="primary" sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
                Need help? Check our FAQ
              </Typography>
            </Link>
          </Box>
        </CardContent>
      </Card>
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default LoginPage;
