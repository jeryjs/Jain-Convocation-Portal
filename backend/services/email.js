const nodemailer = require('nodemailer');
const axios = require('axios');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS
  }
});

const sendEmail = async (to, subject, text, attachments = []) => {
  try {
    // Download each attachment
    const processedAttachments = await Promise.all(
      attachments.map(async (attachment) => {
        try {
          // Download the file
          const response = await axios.get(attachment.url, {
            responseType: 'arraybuffer'
          });

          // Return the processed attachment
          return {
            filename: attachment.name,
            content: Buffer.from(response.data, 'binary'),
            contentType: response.headers['content-type']
          };
        } catch (error) {
          console.error(`Failed to download attachment ${attachment.name}:`, error);
          throw error;
        }
      })
    );

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to,
      subject,
      text,
      attachments: processedAttachments
    };

    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully with attachments');
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = { sendEmail };
