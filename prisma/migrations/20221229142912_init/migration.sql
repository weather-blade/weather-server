-- CreateTable
CREATE TABLE "Readings" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "temperature_BMP" DOUBLE PRECISION NOT NULL,
    "temperature_DHT" DOUBLE PRECISION NOT NULL,
    "pressure_BMP" DOUBLE PRECISION NOT NULL,
    "humidity_DHT" DOUBLE PRECISION NOT NULL,
    "qualityId" INTEGER NOT NULL,

    CONSTRAINT "Readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quality" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "Quality_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quality_status_key" ON "Quality"("status");

-- AddForeignKey
ALTER TABLE "Readings" ADD CONSTRAINT "Readings_qualityId_fkey" FOREIGN KEY ("qualityId") REFERENCES "Quality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
