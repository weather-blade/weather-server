import redis from 'redis';

export const redisClient = redis.createClient();

redisClient.on('error', (err) => {
	console.error('Redis Client Error', err);
});

await redisClient.connect();
