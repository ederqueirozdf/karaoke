-- CreateTable
CREATE TABLE "Performer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CatalogSong" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "youtubeUrl" TEXT NOT NULL,
    "bpm" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Performance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "performerId" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "youtubeUrl" TEXT NOT NULL,
    "note" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Performance_performerId_fkey" FOREIGN KEY ("performerId") REFERENCES "Performer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Performance_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "CatalogSong" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Performer_name_type_key" ON "Performer"("name", "type");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogSong_title_artist_key" ON "CatalogSong"("title", "artist");
