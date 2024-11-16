
const log = (type, event, data = {}) => {
  const timestamp = new Date().toISOString();
  const logData = { timestamp, event, ...data };
  
  switch (type) {
    case 'info':
      console.log(`ℹ️ ${event}:`, data);
      break;
    case 'error':
      console.error(`❌ ${event}:`, data);
      break;
    case 'success':
      console.log(`✅ ${event}:`, data);
      break;
  }
};

module.exports = { log };