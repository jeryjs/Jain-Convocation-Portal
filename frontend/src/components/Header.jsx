import React, { useEffect, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import JGIBanner from '../assets/jain.png';
import { Avatar } from '@mui/material';
import { Logout as LogoutIcon } from '@mui/icons-material';

const Header = () => {
    const [profileImage, setProfileImage] = useState('');

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('userdata'));
        if (userData && userData.profileImage) {
            setProfileImage(userData.profileImage);
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('userdata');
        window.location.reload();
    };

    return (
        <AppBar position="fixed" style={{ backgroundColor: '#2a3042', width: '100vw', left: 0, right: 0 }}>
            <Toolbar sx={{ width: '80%', left: '10%', display: 'flex', justifyContent: 'space-between' }}>
                <img src={JGIBanner} alt="JGI Banner" style={{ height: '50px', marginRight: '10px' }} />
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar src={profileImage} alt="Profile Image" style={{ marginRight: '10px' }} />
                    <Button color="error" onClick={handleLogout} startIcon={<LogoutIcon />}>
                        <span style={{ color: 'inherit', padding: '2px 8px', borderRadius: '16px', fontSize: '12px' }}>Logout</span>
                    </Button>
                </div>
            </Toolbar>
        </AppBar>
    );
};

export default Header;