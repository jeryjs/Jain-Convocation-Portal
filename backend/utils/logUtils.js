
const log = (type, event, data = {}) => {
  const timestamp = new Date().toISOString();
  const logData = { timestamp, event, ...data };
  
  switch (type) {
    case 'info':
      console.log(`ℹ️ [${timestamp}] ${event}:`, data);
      break;
    case 'error':
      console.error(`❌ [${timestamp}] ${event}:`, data);
      break;
    case 'success':
      console.log(`✅ [${timestamp}] ${event}:`, data);
      break;
  }
};

module.exports = { log };