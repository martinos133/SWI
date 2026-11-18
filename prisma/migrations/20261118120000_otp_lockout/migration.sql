-- Pokusy o druhý faktor sa počítajú na konto, nie na session, aby ich
-- nové prihlásenie cez SSO nevynulovalo.
ALTER TABLE "User" ADD COLUMN "otpFailures" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "otpLockedUntil" DATETIME;
ALTER TABLE "Session" DROP COLUMN "otpAttempts";
