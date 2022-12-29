import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const qualities: Prisma.QualityCreateInput[] = [
  { status: "dev" },
  { status: "normal" },
  { status: "error" },
];

const readings: Prisma.ReadingsCreateInput[] = [
  {
    createdAt: new Date("2022-11-17T16:30:39"),

    temperature_BMP: 21.89999962,
    temperature_DHT: 21.70000076,
    pressure_BMP: 97493.75,
    humidity_DHT: 60.09999847,

    quality: {
      connect: { status: "dev" },
    },
  },
  {
    temperature_BMP: 20.90999985,
    temperature_DHT: 20.79999924,
    pressure_BMP: 97587.90625,
    humidity_DHT: 63.70000076,

    quality: {
      connect: { status: "dev" },
    },
  },
];

async function main() {
  console.log("Start seeding ...");

  for (const q of qualities) {
    const quality = await prisma.quality.create({ data: q });
    console.log(`Created quality with id: ${quality.id}`);
  }

  for (const r of readings) {
    const reading = await prisma.readings.create({ data: r });
    console.log(`Created reading with id: ${reading.id}`);
  }

  console.log("Seeding finished");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
