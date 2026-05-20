# APMS — Academic Personal Management System

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![AWS](https://img.shields.io/badge/AWS-Bedrock%20%7C%20S3-FF9900?style=flat-square&logo=amazonaws&logoColor=white)](https://aws.amazon.com)
[![pnpm](https://img.shields.io/badge/pnpm-9%2B-F69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

A personal knowledge management system for students, enabling intelligent document organization, semantic search, and AI-powered question answering grounded in personal study materials.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running Each Package](#running-each-package)
- [Environment Variables](#environment-variables)
- [Technical Documentation](#technical-documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

APMS allows students to upload study documents (PDF, DOCX, PPTX), organize them in a nested folder structure similar to Google Drive, and interact with an AI assistant that answers questions using the content of those documents as context — providing transparent, cited responses.

The system is built as a monorepo containing a REST API backend, a Next.js web application, an Expo mobile application, and AWS CDK infrastructure definitions.

---

## Features

### Document Management
Upload and store PDF, DOCX, and PPTX files. Documents are organized within a nested folder hierarchy with no depth limit. Users can create, rename, and move folders freely.

### Semantic Search
Queries are vectorized using Amazon Titan Embeddings and matched against document content stored in MongoDB Atlas Vector Search — returning semantically relevant results rather than simple keyword matches.

### RAG Chatbot
An AI assistant powered by Claude 3 Haiku answers questions using the user's own documents as grounding context. Every response includes citations indicating the source document and page number.

### Document Sharing
Users can share individual files or entire folder trees with other users. Shared folders propagate access permissions to all nested content (permission inheritance). Owners can revoke access at any time. Shared users have read-only access.

### Organization
Documents and folders can be starred for quick access. Deletion is soft — items move to Trash before permanent removal and can be restored.

### Account Management
Authentication is handled via Amazon Cognito with Google as a federated identity provider. Each account has a configurable storage quota (default: 500 MB).

### System Administration
Administrators use the same Google sign-in. Access is granted via the Cognito User Pool group `admin`. Admin APIs (`/api/admin`) support user listing, quota adjustment, account disable/enable, and system-wide statistics. Admin UI is planned for a later phase.

### API (implemented)
The backend exposes REST endpoints for health, auth, folders, documents (presigned S3 upload), drive views (root, starred, trash), and admin. See [API Reference](./docs/api_reference.md) for the full endpoint list.

**Swagger UI (dev):** With `NODE_ENV=development`, open [http://localhost:4000/api/docs](http://localhost:4000/api/docs) for interactive API docs (OpenAPI spec matches Zod validators).

---

## Architecture

```
                        ┌──────────────────────────┐
                        │      Client Layer         │
                        │  Next.js Web   Expo Mobile│
                        └────────────┬─────────────┘
                                     │ HTTPS / Cognito JWT
                        ┌────────────▼─────────────┐
                        │     Node.js / Express     │
                        │          API              │
                        └──┬──────────┬────────────┘
                           │          │
              ┌────────────▼──┐  ┌────▼─────────────────┐
              │  MongoDB Atlas│  │     AWS Services       │
              │  + Vector     │  │  S3 | Bedrock | Textract│
              │    Search     │  └─────────────────────────┘
              └───────────────┘

Upload Pipeline:
  File Upload → S3 → Text Extraction (Textract / pdf-parse) → Chunking
  → Titan Embeddings → MongoDB document_chunks (Vector Index)

Query Pipeline:
  User Prompt → Titan Embeddings → Atlas Vector Search (filtered by ownerId)
  → Top-5 Chunks → Claude 3 Haiku (with context) → Answer + Citations
```

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Web Frontend | Next.js 14, TypeScript, Tailwind CSS, TanStack Query, Zustand |
| Mobile | React Native, Expo (SDK 54), TypeScript, NativeWind, TanStack Query, Zustand |
| Backend | Node.js 20, Express.js 5, TypeScript, Zod |
| Database | MongoDB Atlas with Vector Search enabled |
| AI / LLM | Amazon Bedrock — Claude 3 Haiku (LLM), Titan Embeddings v2 (vectorization) |
| File Storage | Amazon S3 |
| Document Parsing | Amazon Textract (PDF), pdf-parse, mammoth (DOCX) |
| Authentication | Amazon Cognito (Google federated IdP), AWS Amplify Auth |
| Infrastructure | AWS CDK (TypeScript), AWS CloudFormation |
| Package Manager | pnpm 9+ |

---

## Repository Structure

```
APMS/
├── api/                  # Node.js / Express REST API
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   └── middleware/
│   ├── .env.example
│   └── package.json
│
├── web/                  # Next.js web application
│   ├── app/
│   ├── components/
│   ├── .env.example
│   └── package.json
│
├── mobile/               # Expo React Native application
│   ├── app/              # expo-router file-based routing
│   ├── components/
│   └── package.json
│
├── infrastructure/       # AWS CDK infrastructure definitions
│   ├── lib/
│   ├── bin/
│   └── cdk.json
│
├── docs/                 # Technical documentation
│   ├── api_reference.md
│   ├── system_overview.md
│   ├── database_design.md
│   ├── post_deploy_setup.md
│   ├── coding_standards.md
│   └── ui_design_system.md
│
├── .agents/skills/       # AI agent skill configurations
├── .gitignore
├── skills-lock.json
└── README.md
```

---

## Getting Started

### Prerequisites

| Requirement | Minimum Version |
| :--- | :--- |
| Node.js | 20.x |
| pnpm | 9.x |
| MongoDB Atlas | Account with Vector Search enabled |
| AWS Account | Bedrock model access enabled for `us-east-1` |

### Installation

```bash
git clone https://github.com/<your-org>/apms.git
cd apms
```

Each package manages its own dependencies. Navigate into the package directory and run:

```bash
pnpm install
```

### Running Each Package

#### Backend API

```bash
cd api
cp .env.example .env      # populate with your credentials
pnpm install
pnpm dev                  # starts on http://localhost:4000
                          # Swagger UI: http://localhost:4000/api/docs (dev only)
```

#### Web Application

```bash
cd web
cp .env.example .env.local
pnpm install
pnpm dev                  # starts on http://localhost:3000
```

#### Mobile Application

```bash
cd mobile
pnpm install
pnpm start                # opens Expo CLI
                          # press 'a' for Android, 'i' for iOS simulator
```

#### Infrastructure (AWS CDK)

```bash
cd infrastructure
pnpm install
cp .env.example .env   # set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET

# Preview the CloudFormation template without deploying
npx cdk synth

# Deploy to AWS (requires configured AWS credentials)
npx cdk deploy
```

> **Note:** AWS credentials must be configured via `aws configure` or environment variables before running CDK commands. Review `cdk diff` output before deploying to avoid unintended resource changes. After deploy, follow [`docs/post_deploy_setup.md`](./docs/post_deploy_setup.md) (Google redirect URI, IAM access key, env files, test login).

---

## Environment Variables

Copy the `.env.example` file in each package and fill in the required values. **Never commit `.env` files to version control.**

### `infrastructure/.env`

See [`infrastructure/.env.example`](infrastructure/.env.example). Used at `cdk synth` / `cdk deploy` time (not runtime).

| Variable | Description |
| :--- | :--- |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID for Cognito Google IdP |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `COGNITO_DOMAIN_PREFIX` | Optional Hosted UI domain prefix |
| `OAUTH_CALLBACK_URLS` | Optional comma-separated OAuth callback URLs |
| `OAUTH_LOGOUT_URLS` | Optional comma-separated OAuth logout URLs |
| `CDK_DEFAULT_ACCOUNT` | Optional target AWS account |
| `CDK_DEFAULT_REGION` | Optional target AWS region |

### `api/.env`

| Variable | Description |
| :--- | :--- |
| `PORT` | Server port (default: `4000`) |
| `NODE_ENV` | Runtime environment (`development` or `production`) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `COGNITO_USER_POOL_ID` | Cognito User Pool ID (from `cdk deploy` output) |
| `COGNITO_CLIENT_ID` | Cognito App Client ID |
| `COGNITO_REGION` | Cognito region (defaults to `AWS_REGION` if omitted) |
| `AWS_REGION` | AWS region (e.g. `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
| `S3_BUCKET_NAME` | Name of the S3 bucket for file storage |
| `BEDROCK_MODEL_ID` | Bedrock LLM model ID (Claude 3 Haiku) |
| `BEDROCK_EMBEDDING_MODEL_ID` | Bedrock embedding model ID (Titan Embeddings v2) |
| `MAX_UPLOAD_BYTES` | Max single-file upload size in bytes (default: 52428800) |
| `S3_PRESIGN_EXPIRES_SECONDS` | Presigned S3 URL TTL in seconds (default: 900) |

### `web/.env.local`

See [`web/.env.example`](web/.env.example).

| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API |
| `NEXT_PUBLIC_APP_URL` | Canonical URL of the web app (OAuth redirect base) |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | Cognito User Pool ID |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | Cognito App Client ID |
| `NEXT_PUBLIC_COGNITO_DOMAIN` | Cognito Hosted UI domain (hostname only) |

### `mobile/.env`

See [`mobile/.env.example`](mobile/.env.example).

| Variable | Description |
| :--- | :--- |
| `EXPO_PUBLIC_API_URL` | Base URL of the backend API |
| `EXPO_PUBLIC_COGNITO_USER_POOL_ID` | Cognito User Pool ID |
| `EXPO_PUBLIC_COGNITO_CLIENT_ID` | Cognito App Client ID |
| `EXPO_PUBLIC_COGNITO_DOMAIN` | Cognito Hosted UI domain (hostname only) |

---

## Technical Documentation

| Document | Description |
| :--- | :--- |
| [API Reference](./docs/api_reference.md) | REST endpoints (auth, drive, folders, documents, admin), Swagger UI link |
| [Post-deploy Setup](./docs/post_deploy_setup.md) | Steps after `cdk deploy`: Google OAuth, IAM keys, env, admin group, smoke tests |
| [System Overview](./docs/system_overview.md) | Business logic, technology stack, and non-functional requirements |
| [Database Design](./docs/database_design.md) | MongoDB schema for all 7 collections, index strategy, and Vector Search configuration |
| [Coding Standards](./docs/coding_standards.md) | TypeScript rules, project conventions, and best practices |
| [UI Design System](./docs/ui_design_system.md) | Design tokens, color palette, and component styling guidelines |

---

## Contributing

1. Fork the repository and create a branch from `main`.
2. Follow the conventions defined in [`coding_standards.md`](./docs/coding_standards.md).
3. Ensure all TypeScript compiles without errors before opening a pull request.
4. Write a clear pull request description explaining the change and its motivation.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
