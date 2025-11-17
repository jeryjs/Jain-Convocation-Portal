// Worker heartbeat monitor - listens for worker updates and publishes via pub/sub
// This should be imported and initialized in your Next.js app

import redis from './redis';
import { redisSubClient, publishWorkerUpdate } from './pubsub';

let isListening = false;

export async function startWorkerMonitor() {
    if (isListening) {
        console.log('Worker monitor already running');
        return;
    }

    // Subscribe to worker hash updates using keyspace notifications
    // We'll poll workers periodically and publish updates
    const checkWorkers = async () => {
        try {
            await publishWorkerUpdate();
        } catch (error) {
            console.error('Error checking workers:', error);
        }
    };

    // Check workers every 5 seconds
    const interval = setInterval(checkWorkers, 5000);
    isListening = true;

    console.log('✅ Worker monitor started');

    // Return cleanup function
    return () => {
        clearInterval(interval);
        isListening = false;
        console.log('Worker monitor stopped');
    };
}

// Initialize monitor on module load in server environment
if (typeof window === 'undefined') {
    // Server-side only
    startWorkerMonitor().catch(console.error);
}
