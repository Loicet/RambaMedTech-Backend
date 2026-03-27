-- Add unique index on Community.name (was missing from init migration)
CREATE UNIQUE INDEX IF NOT EXISTS "Community_name_key" ON "Community"("name");

-- CreateTable OtpRequest
CREATE TABLE "OtpRequest" (
    "id"        TEXT NOT NULL,
    "email"     TEXT NOT NULL,
    "otp"       TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "password"  TEXT NOT NULL,
    "role"      "Role" NOT NULL DEFAULT 'USER',
    "condition" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OtpRequest_email_key" ON "OtpRequest"("email");

-- CreateTable CareInvite
CREATE TABLE "CareInvite" (
    "id"             TEXT NOT NULL,
    "code"           TEXT NOT NULL,
    "patientId"      TEXT NOT NULL,
    "caregiverEmail" TEXT NOT NULL,
    "status"         TEXT NOT NULL DEFAULT 'pending',
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CareInvite_code_key" ON "CareInvite"("code");

ALTER TABLE "CareInvite" ADD CONSTRAINT "CareInvite_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable PatientConsent
CREATE TABLE "PatientConsent" (
    "patientId" TEXT NOT NULL,
    "vitals"    BOOLEAN NOT NULL DEFAULT true,
    "mood"      BOOLEAN NOT NULL DEFAULT true,
    "symptoms"  BOOLEAN NOT NULL DEFAULT true,
    "insights"  BOOLEAN NOT NULL DEFAULT true,
    "reminders" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PatientConsent_pkey" PRIMARY KEY ("patientId")
);

ALTER TABLE "PatientConsent" ADD CONSTRAINT "PatientConsent_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
