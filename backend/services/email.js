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

const sendEmail = async (to, subject, text, attachments = []) => {
  try {
    // Append attachment links to the email text
    if (attachments.length > 0) {
      text += '\n\nAttachments:\n';
      attachments.forEach((attachment, index) => {
        text += `${index + 1}. ${attachment.name} - ${attachment.url}\n`;
      });
    }

    const mailOptions = {
      from: getSettings('general').gmailUser,
      to,
      subject,
      text
    };

    await getTransporter().sendMail(mailOptions);
    console.log('Email sent successfully to: ' + to);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = { sendEmail };
