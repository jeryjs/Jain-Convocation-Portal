const express = require('express');
const router = express.Router();
const { sendEmail } = require('../services/email');

// Route to send email
router.post('/send-email', async (req, res) => {
  const { to, subject, html } = req.body;
  
  try {
    await sendEmail(to, subject, html);
    res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
