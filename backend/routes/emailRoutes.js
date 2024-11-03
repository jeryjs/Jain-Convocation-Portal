const express = require('express');
const router = express.Router();
const { sendEmail } = require('../services/email');

// Route to send email
router.post('/send-email', async (req, res) => {
  const { to, subject, text } = req.body;
  
  try {
    await sendEmail(to, subject, text);
    res.status(200).send('Email sent successfully');
  } catch (error) {
    res.status(500).send('Failed to send email');
  }
});

module.exports = router;
