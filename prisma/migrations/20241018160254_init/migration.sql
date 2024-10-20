-- CreateTable
CREATE TABLE "readings"
(
    "id"              INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
    "created_at"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "temperature_bmp" REAL     NOT NULL,
    "temperature_dht" REAL     NOT NULL,
    "pressure_bmp"    REAL     NOT NULL,
    "humidity_dht"    REAL     NOT NULL
);

-- CreateTable
CREATE TABLE "push_subscriptions"
(
    "id"                INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
    "created_at"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "push_subscription" TEXT     NOT NULL
);
