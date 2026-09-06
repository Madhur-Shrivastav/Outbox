import { elasticsearchClient, EMAIL_INDEX } from "./client.js";

export async function ensureEmailIndex() {
  const exists = await elasticsearchClient.indices.exists({
    index: EMAIL_INDEX,
  });

  if (!exists) {
    await elasticsearchClient.indices.create({
      index: EMAIL_INDEX,
      mappings: {
        properties: {
          emailId: { type: "keyword" },
          userId: { type: "keyword" },
          senderEmail: { type: "keyword" },
          recipient: { type: "keyword" },
          subject: { type: "text" },
          body: { type: "text" },
          status: { type: "keyword" },
          scheduledAt: { type: "date" },
          sentAt: { type: "date" },
          createdAt: { type: "date" },
        },
      },
    });

    console.log(`Elasticsearch index "${EMAIL_INDEX}" created.`);
  }
}
