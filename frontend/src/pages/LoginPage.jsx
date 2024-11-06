import { Card, CardContent, TextField, Button, Typography, CircularProgress, Snackbar, Alert, Stack } from "@mui/material";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import JGILogo from "../assets/JGI.png";
import JainBanner from "../assets/jain.png";
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
          navigate("/courses");
        }
      } else {
        setSnackbarMessage("Login failed: Incorrect username or password");
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
    // Regex for Indian phone numbers: 
    // - Must be exactly 10 digits
    // - Must start with 6, 7, 8, or 9
    const regex = /^[6-9]\d{9}$/;
    return regex.test(password);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  return (
    <div className='login-container'>
      <Card variant='outlined' sx={{ borderRadius: '12px', p: { xs: 0, md: 3 }, maxWidth: '600px' }}>
        <CardContent>
          <div style={{ backgroundColor: '#001b54', padding: '20px', borderRadius: '8px', marginBottom: '40px' }}>
            <Stack spacing={0} alignItems="center">
              <img src={JainBanner} alt="Profile" style={{ height: '75px', mixBlendMode: 'lighten' }} />
              <Typography variant="h6" color="#fff" textAlign="left" fontWeight="bold">14th Annual Convocation</Typography>
            </Stack>
            <div style={{ height: '60px', width: '60px', marginBottom: '-50px', borderRadius: '50%', background: '#fff', justifyItems: 'center', alignContent: "center" }}>
              <img src={JGILogo} width='80%' />
            </div>
          </div>

          <form onSubmit={handleLogin}>
            <TextField
              label='Username'
              variant='outlined'
              fullWidth
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              margin='normal'
              placeholder="Enter your USN"
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
              placeholder="Enter your password"
              error={!validatePassword(password) && password.length > 0}
              helperText={!validatePassword(password) && password.length > 0 ? "The phone number you registered with is your password" : ""}
            />
            <Button type='submit' variant='contained' color='primary' fullWidth disabled={loading} sx={{ mt: 2, borderRadius: '25px', fontSize: '1.2rem' }}>
              {loading ? <CircularProgress size={24} /> : "Login"}
            </Button>
          </form>
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
