import nodemailer from "nodemailer";

export function createTransporter(sender: {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
}) {
  return nodemailer.createTransport({
    host: sender.smtpHost,
    port: sender.smtpPort,
    secure: sender.smtpPort === 465,
    auth: {
      user: sender.smtpUser,
      pass: sender.smtpPassword,
    },
  });
}
