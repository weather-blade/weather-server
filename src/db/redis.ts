import redis from 'redis';

export const redisClient = redis.createClient({
	url: 'redis://redis:6379',
});

redisClient.on('error', (err) => {
	console.error('Redis Client Error', err);
});

await redisClient.connect();
