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
    const maxAttachmentSize = 25 * 1024 * 1024; // 25 MB
    let totalAttachmentSize = 0;
    const processedAttachments = [];
    const extraAttachmentLinks = [];

    for (const attachment of attachments) {
      try {
        // Download the file
        const response = await axios.get(attachment.url, {
          responseType: 'arraybuffer'
        });

        const attachmentSize = response.data.length;

        // Check if adding this attachment exceeds the max size
        if (totalAttachmentSize + attachmentSize <= maxAttachmentSize) {
          // Include the attachment
          processedAttachments.push({
            filename: attachment.name,
            content: Buffer.from(response.data, 'binary'),
            contentType: response.headers['content-type']
          });
          totalAttachmentSize += attachmentSize;
        } else {
          // Add the attachment link to the email body
          extraAttachmentLinks.push(attachment.url);
        }
      } catch (error) {
        console.error(`Failed to download attachment ${attachment.name}:`, error);
        throw error;
      }
    }

    // Append extra attachment links to the email text
    if (extraAttachmentLinks.length > 0) {
      text += '\n\nThe following attachments exceeded the maximum size and can be accessed via these links:\n';
      extraAttachmentLinks.forEach((link, index) => {
        text += `${index + 1}. ${link}\n`;
      });
    }

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to,
      subject,
      text,
      attachments: processedAttachments
    };

    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully to: ' + to);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = { sendEmail };
