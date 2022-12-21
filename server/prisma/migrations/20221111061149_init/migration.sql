/*
  Warnings:

  - You are about to drop the column `questionId` on the `History` table. All the data in the column will be lost.
  - Added the required column `Category` to the `History` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_History" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "Category" TEXT NOT NULL,
    "user" TEXT NOT NULL
);
INSERT INTO "new_History" ("id", "user") SELECT "id", "user" FROM "History";
DROP TABLE "History";
ALTER TABLE "new_History" RENAME TO "History";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
