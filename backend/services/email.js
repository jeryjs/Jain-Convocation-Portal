const nodemailer = require('nodemailer');
const { getSettings } = require('../config/settings');

const getTransporter = () => {
  const generalSettings = getSettings('general');
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: generalSettings.gmailUser,
      pass: generalSettings.gmailAppPass
    }
  });
};

const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: getSettings('general').gmailUser,
      to,
      subject,
      html: html,  // Only send HTML content
      contentType: 'text/html', // Force HTML content type
    };

    await getTransporter().sendMail(mailOptions);
    console.log('Email sent successfully to: ' + to);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = { sendEmail };
