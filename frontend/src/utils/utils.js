
export const downloadFile = (url, filename, delay=1000) => {
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

export const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  try {
    const date = new Date(timestamp);
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

export const generateUPILink = (baseLink, amount) => {
  if (!baseLink) return '';
  const basePart = baseLink.split('am=')[0];
  return `${basePart}am=${amount}`;
};