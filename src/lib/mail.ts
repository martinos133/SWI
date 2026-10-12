import "server-only";
import nodemailer from "nodemailer";
import { db } from "./db";

/**
 * E-mailové upozornenia študentovi (S.10, API.03).
 * Bez SMTP_HOST sa správa iba vypíše do konzoly; každá sa zapíše do EmailLog.
 */
export async function sendMail(to: string, subject: string, text: string) {
  let status = "LOG";
  if (process.env.SMTP_HOST) {
    try {
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 1025),
        secure: false,
      });
      await transport.sendMail({
        from: process.env.MAIL_FROM ?? "Ubytovanie <ubytovanie@uniba.example>",
        to,
        subject,
        text,
      });
      status = "ODOSLANY";
    } catch (error) {
      console.error("[mail] odoslanie zlyhalo", error);
      status = "CHYBA";
    }
  } else {
    console.info(`[mail] → ${to}: ${subject}`);
  }
  await db.emailLog.create({ data: { to, subject, body: text, status } });
}

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

const footer = `\n\nStav žiadosti nájdete na ${APP_URL}/student\n\nUbytovacie oddelenie`;

export const mails = {
  statusChanged: (name: string, statusLabel: string, explanation: string) => ({
    subject: `Stav vašej žiadosti o ubytovanie: ${statusLabel}`,
    text: `Dobrý deň, ${name},\n\nstav vašej žiadosti o ubytovanie sa zmenil na „${statusLabel}“.\n${explanation}${footer}`,
  }),
  documentRequested: (name: string, docLabel: string, note: string) => ({
    subject: `Doplňte doklad: ${docLabel}`,
    text: `Dobrý deň, ${name},\n\nk vašej žiadosti o ubytovanie potrebujeme doplniť doklad „${docLabel}“.\n\nPoznámka referenta: ${note}${footer}`,
  }),
  documentRejected: (name: string, docLabel: string, note: string) => ({
    subject: `Doklad zamietnutý: ${docLabel}`,
    text: `Dobrý deň, ${name},\n\ndoklad „${docLabel}“ sme zamietli.\n\nDôvod: ${note}${footer}`,
  }),
  appealDecided: (name: string, upheld: boolean, note: string) => ({
    subject: upheld ? "Odvolaniu sa vyhovelo" : "Odvolanie bolo zamietnuté",
    text: `Dobrý deň, ${name},\n\nubytovacia komisia rozhodla o vašom odvolaní: ${upheld ? "vyhovela mu" : "zamietla ho"}.\n\nOdôvodnenie: ${note}${footer}`,
  }),
};
