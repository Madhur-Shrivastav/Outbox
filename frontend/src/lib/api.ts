import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export async function syncUser(idToken: string) {
  const response = await api.get("/auth/me", {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  return response.data.user;
}

export async function connectSlack(idToken: string) {
  const response = await api.get("/slack/connect", {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  window.location.href = response.data.url;
}

export async function getSlackStatus(idToken: string) {
  const response = await api.get("/slack/status", {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  return response.data;
}

export async function disconnectSlack(idToken: string) {
  const response = await api.delete("/slack/disconnect", {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  return response.data;
}

export async function getScheduledEmails(idToken: string) {
  const response = await api.get("/emails/scheduled", {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  return response.data.emails;
}

export async function getSentEmails(idToken: string) {
  const response = await api.get("/emails/sent", {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  return response.data.emails;
}

export async function getSenders(idToken: string) {
  const response = await api.get("/senders", {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  return response.data.senders;
}

export async function uploadLeads(idToken: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/leads/upload", formData, {
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function scheduleEmail(
  idToken: string,
  data: {
    senderEmail: string;
    recipient: string;
    subject: string;
    body: string;
    scheduledAt: string;
    delayBetweenEmails?: number;
    hourlyLimit?: number;
  },
) {
  const response = await api.post("/emails/schedule", data, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  return response.data;
}

export async function scheduleEmailsBulk(
  idToken: string,
  data: {
    senderEmail: string;
    recipients: string[];
    subject: string;
    body: string;
    scheduledAt: string;
    delayBetweenEmails: number;
    hourlyLimit: number;
  },
) {
  const response = await api.post("/emails/schedule-bulk", data, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  return response.data;
}

export async function searchEmails(idToken: string, query: string) {
  const response = await api.get("/emails/search", {
    params: { q: query },
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  return response.data.emails;
}
