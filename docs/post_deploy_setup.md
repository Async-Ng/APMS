# Post-Deploy Setup

Checklist sau khi deploy APMS API/infrastructure.

## 1. AWS Infrastructure

Provision bằng CDK trong `infrastructure/`:

```bash
cd infrastructure
pnpm install
pnpm build
pnpm cdk diff
pnpm cdk deploy
```

Các tài nguyên chính:

- Cognito User Pool và App Client.
- S3 bucket lưu tài liệu.
- SES identity/sender phục vụ email.

Vertex AI không dùng IAM của AWS. API dùng Google Application Default Credentials hoặc `GOOGLE_APPLICATION_CREDENTIALS`.

## 2. API Environment

Các biến bắt buộc/quan trọng:

```env
MONGODB_URI=
COGNITO_USER_POOL_ID=
COGNITO_CLIENT_ID=
COGNITO_REGION=
ALLOWED_EMAIL_DOMAINS=fpt.edu.vn,fe.edu.vn
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=
SES_FROM_EMAIL=
APP_URL=
GOOGLE_CLOUD_PROJECT=
GOOGLE_CLOUD_LOCATION=asia-southeast1
GEMINI_CHAT_MODEL=gemini-2.5-flash
GEMINI_VISION_MODEL=gemini-2.5-flash
GEMINI_RERANK_MODEL=gemini-2.5-flash-lite
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
GEMINI_EMBEDDING_OUTPUT_DIMENSION=1024
```

## 3. Vertex AI Gemini

1. Tạo hoặc chọn Google Cloud project.
2. Bật Vertex AI API.
3. Tạo service account có role `Vertex AI User`.
4. Cấu hình ADC cho runtime hoặc set `GOOGLE_APPLICATION_CREDENTIALS`.
5. Kiểm tra region khớp `GOOGLE_CLOUD_LOCATION`.

API hiện dùng Gemini cho chat, embeddings, rerank/query rewrite nhẹ, và vision extraction khi `DOC_VISION_ENABLED=true`.

## 4. MongoDB Atlas Vector Search

Vector index phải dùng dimension `1024` cho `gemini-embedding-001`. Xem script hướng dẫn:

```bash
api/scripts/rebuild-vector-index.md
```

Nếu đổi dimension bằng env, phải rebuild Atlas Vector Search index và reprocess chunks.

## 5. Migrations

Sau khi deploy refactor Documents:

```bash
cd api
pnpm migrate:document-visibility
```

Migration này idempotent:

- Legacy `personal` -> `private`.
- Legacy `internal` -> `public`.
- Không đụng S3, chunks, shares, folders.
- Không tự gán `curriculumCourseId` cho document cũ.

## 6. Smoke Tests

| Step | Request | Expected |
| --- | --- | --- |
| 1 | `GET /api/health` | `200` |
| 2 | Login through client/Cognito | JWT valid, local user synced |
| 3 | `GET /api/documents?view=my` | `200`, `{ folders, documents }` |
| 4 | `POST /api/documents/upload-intents` with `curriculumCourseId` | `201`, includes `uploadUrl` |
| 5 | PUT file to S3, then `POST /api/documents/:id/complete` | Document moves to `processing` |
| 6 | Worker completes processing | Document becomes `ready`, chunks created |
| 7 | `GET /api/documents?view=public&match=auto` | Public documents prioritized by academic profile |
| 8 | `GET /api/search?q=...` | Results only from readable documents |
| 9 | Chat request | Answer includes grounded citations when context exists |

Removed routes such as `/api/drive`, `/api/library`, and `/api/forum` should not be mounted.

## 7. Trash Maintenance

Run purge manually or schedule it:

```bash
cd api
pnpm purge:trash
```

The purge removes expired trashed documents/folders, related chunks, shares, S3 objects, and adjusts storage usage where applicable.
