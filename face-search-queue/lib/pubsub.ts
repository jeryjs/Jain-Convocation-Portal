import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Create a separate Redis client for pub/sub
export const redisPubClient = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
});

export const redisSubClient = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
});

redisPubClient.on('connect', () => {
    console.log('✅ Redis Pub client connected');
});

redisSubClient.on('connect', () => {
    console.log('✅ Redis Sub client connected');
});

redisPubClient.on('error', (err) => {
    console.error('❌ Redis Pub error:', err);
});

redisSubClient.on('error', (err) => {
    console.error('❌ Redis Sub error:', err);
});

// Publish events
export async function publishQueueUpdate() {
    await redisPubClient.publish('queue:updates', JSON.stringify({ type: 'queue' }));
}

export async function publishWorkerUpdate() {
    await redisPubClient.publish('queue:updates', JSON.stringify({ type: 'workers' }));
}

export async function publishPauseUpdate(isPaused: boolean) {
    await redisPubClient.publish('queue:updates', JSON.stringify({ type: 'pause', isPaused }));
}

// Channel names
export const QUEUE_UPDATES_CHANNEL = 'queue:updates';
