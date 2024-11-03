import { Card, CardContent, TextField, Button, Typography, CircularProgress, Snackbar, Alert } from "@mui/material";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import JGILogo from "../assets/JGI.png";
import ProfileImg from "../assets/ProfileImg.png";
import config from "../config";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const navigate = useNavigate();

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
        const data = await response.json();
        localStorage.setItem('userdata', JSON.stringify(data.userdata));
        if (data.userdata.role === "admin") {
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
    const regex = /^\d{8}$/;
    return regex.test(password);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // if (loading) return <CircularProgress style={{ </div>margin: 'auto', display: 'block' }} />;

  return (
    <div className='login-container'>
      <Card variant='outlined' elevation={4} style={{ borderRadius: '12px', padding: '20px', maxWidth: '600px' }}>
        <CardContent>
          <div style={{ backgroundColor: '#556ee640', padding: '20px', borderRadius: '8px', marginBottom: '40px' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="col">
                <Typography variant="h6" color="primary" fontWeight="bold">Welcome Back !</Typography>
                <Typography variant="body2" color="primary">Sign in to continue..</Typography>
              </div>
              <img src={ProfileImg} alt="Profile" style={{ height: '100px' }} />
            </div>
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
              placeholder="DDMMYYYY"
              error={!validatePassword(password) && password.length > 0}
              helperText={!validatePassword(password) && password.length > 0 ? "Your date of birth in DDMMYYYY format is your password" : ""}
            />
            <Button type='submit' variant='contained' color='primary' fullWidth disabled={loading} style={{ marginTop: '20px', borderRadius: '25px', fontSize: '1.2rem' }}>
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
