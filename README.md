# Outbox — Email Scheduling & Delivery Platform

Outbox is a production-oriented email scheduling platform built with React, TypeScript, Express, PostgreSQL, Redis, BullMQ, Elasticsearch, Firebase Authentication, Slack OAuth, and Ethereal SMTP.

It allows users to upload recipient lists, compose emails, schedule bulk campaigns, and reliably process scheduled emails using a persistent background worker.

---

## Features

### Authentication

- Google OAuth login using Firebase Authentication
- Email/password authentication
- User profile with name, email, and avatar
- Logout support
- Firebase ID token verification on the backend

### Email Scheduling

- Schedule individual or bulk emails
- BullMQ delayed jobs for scheduled delivery
- Persistent jobs backed by Redis
- Multiple sender accounts
- Configurable minimum delay between emails
- Configurable hourly sending limit
- Configurable worker concurrency

### Rate Limiting

- Distributed rate limiting using Redis
- Safe across multiple workers/instances
- Emails are delayed when the hourly limit is reached
- Rate-limited emails are not dropped
- Slack notification when the hourly sender limit is reached

### Lead Management

- Upload recipient lists using CSV
- Automatic email detection
- Display detected recipient count
- Bulk scheduling from uploaded leads

### Email Tracking

- Scheduled Emails dashboard
- Sent Emails dashboard
- Email status tracking
- Send attempts and error tracking
- SMTP Message-ID tracking
- Ethereal preview URL for test emails

### Search

- Elasticsearch integration
- Search emails by:
  - Recipient
  - Sender
  - Subject
  - Body

### Slack Integration

- Slack OAuth 2.0 connection
- Workspace/channel information
- Connect/disconnect Slack
- Notifications when sender rate limits are reached

### Queue Monitoring

- BullMQ queue monitoring
- Live queue dashboard
- Background worker with configurable concurrency

---

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Axios
- Firebase Authentication

### Backend

- Node.js
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- BullMQ
- Redis
- Nodemailer

### Integrations

- Firebase Authentication
- Slack OAuth
- Elasticsearch
- Ethereal SMTP

### Infrastructure

- Docker
- Docker Compose
- Railway

---

## Architecture

```text
                         ┌─────────────────────┐
                         │      React UI       │
                         │  Vite + TypeScript  │
                         └──────────┬──────────┘
                                    │
                                    │ REST API
                                    ▼
                         ┌─────────────────────┐
                         │   Express Backend   │
                         │     TypeScript      │
                         └──────┬──────┬───────┘
                                │      │
                  ┌─────────────┘      └──────────────┐
                  ▼                                    ▼
          ┌───────────────┐                    ┌───────────────┐
          │  PostgreSQL   │                    │     Redis     │
          │               │                    │               │
          │ Users         │                    │ BullMQ Queue  │
          │ Emails        │                    │ Rate Limiting │
          │ Senders       │                    │               │
          │ Slack         │                    └───────┬───────┘
          └───────────────┘                            │
                                                      │
                                                      ▼
                                             ┌────────────────┐
                                             │ Email Worker   │
                                             │                │
                                             │ BullMQ Worker  │
                                             │ SMTP Delivery  │
                                             └───────┬────────┘
                                                     │
                                                     ▼
                                             ┌────────────────┐
                                             │ Ethereal SMTP  │
                                             └────────────────┘

                         ┌─────────────────────┐
                         │   Elasticsearch     │
                         │ Email Index/Search  │
                         └─────────────────────┘

                         ┌─────────────────────┐
                         │       Slack        │
                         │ Rate-limit Alerts  │
                         └─────────────────────┘

                         ┌─────────────────────┐
                         │ Firebase Auth      │
                         │ Google / Password  │
                         └─────────────────────┘

Email Scheduling Flow:
User
  │
  ▼
Compose Email
  │
  ▼
POST /api/emails/schedule-bulk
  │
  ▼
PostgreSQL
  │
  ▼
Redis Rate Limiter
  │
  ├── Within limit ───────► Scheduled time
  │
  └── Limit reached ──────► Future available slot
                                │
                                ▼
                         BullMQ Delayed Job
                                │
                                ▼
                           Email Worker
                                │
                                ▼
                           SMTP Server
                                │
                                ▼
                         SENT / FAILED
                                │
                                ▼
                         Elasticsearch
```

## Demo Credentials

Use the following credentials to test the application:

| Field    | Value            |
| -------- | ---------------- |
| Email    | `test@gmail.com` |
| Password | `Outbox@123`     |
| Name     | `Test User`      |

The demo account is provisioned with the default Ethereal sender:

```text
mozell60@ethereal.email
```
