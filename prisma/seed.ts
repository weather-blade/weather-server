import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const readings: Prisma.ReadingsCreateInput[] = [
	{
		createdAt: new Date('2022-11-17T16:30:39'),

		temperature_BMP: 21.89999962,
		temperature_DHT: 21.70000076,
		pressure_BMP: 97493.75,
		humidity_DHT: 60.09999847,
	},
	{
		temperature_BMP: 20.90999985,
		temperature_DHT: 20.79999924,
		pressure_BMP: 97587.90625,
		humidity_DHT: 63.70000076,
	},
];

async function main() {
	console.log('Start seeding ...');

	for (const reading of readings) {
		const result = await prisma.readings.create({ data: reading });
		console.log(`Created reading with id: ${result.id}`);
	}

	console.log('Seeding finished');
}

main()
	.then(async () => {
		return await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
