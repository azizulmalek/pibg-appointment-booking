-- Redefine Student uniqueness per academic session (allows same child each new year).
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentNo" TEXT NOT NULL,
    "birthCertLookup" TEXT NOT NULL,
    "birthCertEncrypted" TEXT,
    "name" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Student_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Student" ("id", "studentNo", "birthCertLookup", "birthCertEncrypted", "name", "classId", "sessionId", "createdAt", "updatedAt")
SELECT "id", "studentNo", "birthCertLookup", "birthCertEncrypted", "name", "classId", "sessionId", "createdAt", "updatedAt" FROM "Student";

DROP TABLE "Student";
ALTER TABLE "new_Student" RENAME TO "Student";

CREATE UNIQUE INDEX "Student_sessionId_studentNo_key" ON "Student"("sessionId", "studentNo");
CREATE UNIQUE INDEX "Student_sessionId_birthCertLookup_key" ON "Student"("sessionId", "birthCertLookup");

PRAGMA foreign_keys=ON;
