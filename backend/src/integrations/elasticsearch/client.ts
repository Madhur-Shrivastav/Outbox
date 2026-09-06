import { Client } from "@elastic/elasticsearch";

export const elasticsearchClient = new Client({
  node: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
});

export const EMAIL_INDEX = "emails";
