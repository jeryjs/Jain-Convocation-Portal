import config from "../config";

// Function to convert a string to a slug
export const downloadFile = (url, filename, delay=100) => {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Delay to ensure browser processes the download
        setTimeout(() => {
          window.URL.revokeObjectURL(link.href);
          resolve();
        }, delay);
      })
      .catch(reject);
  });
};

// Function to format a date string
export const formatDate = (seconds) => {
  if (!seconds) return 'N/A';
  try {
    const date = new Date(seconds * 1000);
    if (!isNaN(date.getTime())) {
      return date.toLocaleString('en-US', {
        dateStyle: 'short',
        timeStyle: 'medium'
      });
    }
    return 'Invalid Date';
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
};

// Image compression utilities
export const compressImage = (file, maxSize) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > 480) {
            height = Math.round((height * 480) / width);
            width = 480;
          }
        } else {
          if (height > 480) {
            width = Math.round((width * 480) / height);
            height = 480;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Try different quality values until file size is under maxSize
        for (let quality = 0.9; quality >= 0.5; quality -= 0.1) {
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          const compressedBlob = dataURLtoBlob(compressedDataUrl);
          if (compressedBlob.size <= maxSize) {
            resolve(new File([compressedBlob], file.name, { type: 'image/jpeg' }));
            return;
          }
        }
        resolve(null); // Could not compress enough
      };
    };
  });
};

// Function to convert a data URL to a Blob
export const dataURLtoBlob = (dataURL) => {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

// Function to generate a UPI payment link
export const generateUPILink = (baseLink, amount) => {
  if (!baseLink) return '';
  return baseLink.replace(/am=\d*/, `am=${amount}`);
};

// Function to validate a phone number
export const validatePhone = (phone) => {
    // Regex for Indian and Nepal phone numbers with optional country codes:
    // - Must be exactly 10 or 12 digits
    // - Must start with 6, 7, 8, or 9 for India
    // - Must start with 9 for Nepal
    // - Optional country codes: 91 for India, 977 for Nepal
    const regex = /^(91|977)?[6-9]\d{9}(\d{3})?$/;
    return regex.test(phone);
  };

export const formatWaitingTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0 
    ? `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes > 0 ? `and ${remainingMinutes} minutes` : ''}`
    : `${minutes} minutes`;
};

export const sendRequestEmail = async (userData, requestType, imageLinks = null, waitingTime) => {
  const emailContent = requestType === 'softcopy' 
    ? `
      <div style="font-family: Arial, sans-serif; margin: 0 auto;">
        <p>Dear Graduate,</p>
        <p>Heartfelt congratulations on your remarkable achievement! We're proud to have played a part in your educational journey. <strong>Please find your convocation photo attached</strong>, a cherished memory of this special day.</p>
        ${imageLinks?.length ? `
        <div style="margin: 20px 0;">
          <p><strong>Your Photos:</strong></p>
          <ul style="list-style: none; padding: 0;">
            ${imageLinks.map(link => `
              <li style="margin: 10px 0;">
                <a href="${link.url}" style="color: #1976d2; text-decoration: none;">
                  ${link.name}
                </a>
              </li>
            `).join('')}
          </ul>
        </div>
        ` : ''}
        <p>Wishing you continued success and a bright future.</p>
        <p>Best regards,<br>JAIN (Deemed-to-be)University</p>
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif; margin: 0 auto;">
        <p>Dear Graduate,</p>
        <p>Heartfelt congratulations on your remarkable achievement! We're proud to have played a part in your educational journey. Your request for hardcopy prints of your convocation photos has been received.</p>
        <p><strong>Our team will process your request within ${waitingTime??90} minutes.</strong> We'll contact you once your prints are ready for collection.</p>
        <p>Wishing you continued success and a bright future.</p>
        <p>Best regards,<br>JAIN (Deemed-to-be)University</p>
      </div>
    `;

  const emailData = {
    to: userData.email,
    subject: requestType === 'softcopy' ? 'Your Convocation Photos' : 'Hardcopy Request Confirmation',
    html: emailContent.trim()
  };

  try {
    const response = await fetch(`${config.API_BASE_URL}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send email');
    }
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};