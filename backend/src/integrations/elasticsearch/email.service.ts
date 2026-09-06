import { elasticsearchClient, EMAIL_INDEX } from "./client.js";

type EmailDocument = {
  emailId: string;
  userId: string;
  senderEmail: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date;
  sentAt: Date | null;
  createdAt: Date;
};

export async function indexEmail(email: EmailDocument) {
  await elasticsearchClient.index({
    index: EMAIL_INDEX,
    id: email.emailId,
    document: {
      emailId: email.emailId,
      userId: email.userId,
      senderEmail: email.senderEmail,
      recipient: email.recipient,
      subject: email.subject,
      body: email.body,
      status: email.status,
      scheduledAt: email.scheduledAt,
      sentAt: email.sentAt,
      createdAt: email.createdAt,
    },
  });
}
