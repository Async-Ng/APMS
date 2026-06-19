# Post-deploy setup (InfrastructureStack)

Sau `cdk deploy` thành công, hoàn tất các bước sau trước khi chạy `api` / `web` / `mobile`.

## CDK outputs (deploy hiện tại)

| Output | Giá trị |
|--------|---------|
| Region | `ap-southeast-1` |
| Cognito User Pool ID | `ap-southeast-1_CbRaouP4R` |
| Cognito Client ID | `7ck8qjr6seonk9r38pd43ukhv6` |
| Cognito Hosted UI domain | `apms-dev.auth.ap-southeast-1.amazoncognito.com` |
| Google IdP redirect URI | `https://apms-dev.auth.ap-southeast-1.amazoncognito.com/oauth2/idpresponse` |
| S3 bucket | `apms-documents-400715295558-ap-southeast-1` |
| IAM backend user | `apms-backend-service-user` |
| Cognito admin group | `admin` (output `CognitoAdminGroupNameOutput` sau deploy mới) |

> Sau khi thêm group `admin` vào CDK, chạy lại `cdk deploy` rồi gán user vào group theo mục 8.

---

## 1. Google Cloud Console (bắt buộc)

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → **Credentials**
2. Mở OAuth 2.0 Client ID đã dùng trong `infrastructure/.env`
3. **Authorized redirect URIs** → **Add URI**:

   ```
   https://apms-dev.auth.ap-southeast-1.amazoncognito.com/oauth2/idpresponse
   ```

4. Save

Không thêm `localhost` vào mục này — callback web/mobile được cấu hình trong Cognito App Client, không phải Google trực tiếp.

---

## 2. Cognito OAuth callback / logout (CDK — tránh `redirect_mismatch`)

Nếu trên prod (Vercel) Cognito trả `error=redirect_mismatch`, nghĩa là **`redirect_uri`** mà app gửi (từ `NEXT_PUBLIC_APP_URL` + `/auth/callback` trong [`web/lib/amplify.ts`](../web/lib/amplify.ts)) **không nằm** trong danh sách **Allowed callback URLs** của App Client.

### Cách sửa bằng CDK

1. Trong `infrastructure/.env` (gitignored), đặt biến **comma-separated** (không khoảng trắng thừa sau dấu phẩy):

   - `OAUTH_CALLBACK_URLS` — mỗi URL phải khớp tuyệt đối với URL app dùng, ví dụ:
     - `http://localhost:3000/auth/callback`
     - `https://<ten-project>.vercel.app/auth/callback`
     - `apms://auth/callback` (Expo deep link nếu dùng)
   - `OAUTH_LOGOUT_URLS` — khớp [`web/lib/amplify.ts`](../web/lib/amplify.ts): ``{NEXT_PUBLIC_APP_URL}/login`` (ví dụ `http://localhost:3000/login`, `https://<ten-project>.vercel.app/login`)

2. Chạy `cd infrastructure && cdk deploy` để CloudFormation cập nhật App Client.

### Vercel (bắt buộc)

Trong Vercel → Project → **Settings → Environment Variables** (Production):

- `NEXT_PUBLIC_APP_URL` = `https://<domain-thật-của-bạn>` (không slash cuối, đúng `https`)

Sau đó **Redeploy** — biến `NEXT_PUBLIC_*` được embed lúc build.

### Kiểm tra nhanh

DevTools → Network khi bấm Google → request `oauth2/authorize` → xem query `redirect_uri` (decode) có **trùng một dòng** trong `OAUTH_CALLBACK_URLS` đã deploy không.

---

## 3. IAM access key cho API (bắt buộc)

1. AWS Console → **IAM** → **Users** → `apms-backend-service-user`
2. Tab **Security credentials** → **Create access key**
3. Use case: **Application running outside AWS**
4. Copy **Access key ID** và **Secret access key** (chỉ hiện một lần)
5. Dán vào `api/.env`:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

---

## 4. MongoDB Atlas (bắt buộc cho API)

1. Tạo cluster + database user trên [MongoDB Atlas](https://www.mongodb.com/atlas)
2. **Network Access**: cho phép IP máy dev (hoặc `0.0.0.0/0` tạm cho dev)
3. Copy connection string → `MONGODB_URI` trong `api/.env`

---

## 5. Vertex AI Gemini (upload / semantic search / RAG chat)

Org policy GCP có thể **cấm API keys** ("API keys are disallowed") — dùng **Application Default Credentials**, không dùng Google AI Studio API key.

**Bước 1 — GCP project**

1. [Google Cloud Console](https://console.cloud.google.com/) → tạo project
2. Bật **Vertex AI API** (`aiplatform.googleapis.com`) + **billing**
3. IAM → Service Account → role **Vertex AI User** (`roles/aiplatform.user`)
4. Tạo JSON key → lưu ngoài repo

**Bước 2 — ADC local**

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="D:\path\to\vertex-sa-key.json"
```

Hoặc: `gcloud auth application-default login` + `gcloud config set project <project-id>` (chỉ dev).

**Bước 3 — `api/.env`**

```
GOOGLE_CLOUD_PROJECT=<gcp-project-id>
GOOGLE_CLOUD_LOCATION=asia-southeast1
GOOGLE_APPLICATION_CREDENTIALS=D:\path\to\vertex-sa-key.json
GEMINI_CHAT_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
GEMINI_EMBEDDING_OUTPUT_DIMENSION=1024
GEMINI_EMBED_DELAY_MS=200
```

**Bước 4 — Render / PaaS (production API)**

Render không có `gcloud login` và không đọc được path Windows. API tự bootstrap ADC từ biến `GOOGLE_APPLICATION_CREDENTIALS_JSON` lúc khởi động ([`api/src/config/gcp-credentials.ts`](../api/src/config/gcp-credentials.ts)).

1. Render → Web Service API → **Environment**
2. Đặt (hoặc xác nhận):

   | Biến | Giá trị |
   |------|---------|
   | `NODE_ENV` | `production` |
   | `GOOGLE_CLOUD_PROJECT` | GCP project ID |
   | `GOOGLE_CLOUD_LOCATION` | `asia-southeast1` |
   | `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Toàn bộ nội dung file JSON service account (một dòng, Render Secret) |

3. **Xóa** `GOOGLE_APPLICATION_CREDENTIALS` nếu đang trỏ path Windows (`D:\...`)
4. **Manual Deploy** sau khi đổi env
5. Log boot phải có: `[gcp] ADC configured from GOOGLE_APPLICATION_CREDENTIALS_JSON → ...`

**Bước 5 — Smoke test + re-index**

```powershell
cd api
npx tsx --env-file=.env scripts/test-embed.ts
npx tsx --env-file=.env scripts/reindex-gemini.ts
```

Restart API — worker re-embed documents ở `processing`.

| Biến | Mô tả |
|------|--------|
| `GOOGLE_CLOUD_PROJECT` | Bắt buộc |
| `GOOGLE_CLOUD_LOCATION` | Mặc định `asia-southeast1` (hoặc `global`) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path tới service account JSON (ADC) — **local dev** |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Toàn bộ JSON service account — **Render / PaaS** |
| `GEMINI_EMBEDDING_MODEL` | Mặc định `gemini-embedding-001` (1024 dims) |
| `GEMINI_EMBED_DELAY_MS` | Delay giữa chunk embed (mặc định `200`) |
| `EMBED_CONCURRENCY` | Số batch embed chạy song song khi xử lý tài liệu (mặc định `5`) |
| `SENTENCE_EMBED_CONCURRENCY` | Số batch embed câu chạy song song cho semantic chunking (mặc định `4`) |
| `DOCUMENT_WORKER_POLL_MS` | Worker poll tài liệu `processing`/`failed` (mặc định `5000`). `completeUpload` còn kích hoạt xử lý ngay, không chờ poll. |

**Cảnh báo credit GCP (Budget 90%)**

GCP gửi email tới **Billing Account Administrator / Billing Account User** khi chi tiêu (trước credit) đạt 50% / **90%** / 100% ngân sách.

```powershell
# Chỉnh số credit thực tế (VND) — mặc định 7,900,051 VND (theo GCP Console)
$env:GCP_CREDIT_BUDGET_VND = "7900051"
cd api
.\scripts\setup-gcp-credit-budget.ps1
```

Console: [Billing → Budgets](https://console.cloud.google.com/billing/budgets) → budget `APMS GCP Credits 90pct` (filter project APMS, `exclude-all-credits` = theo dõi tiêu hao credit).

**Quota Vertex AI (50 users/ngày — chat + upload)**

Ước lượng peak: 50 chat đồng thời (~50 embed + 50 generate/phút) + worker embed tài liệu (~300 RPM với `GEMINI_EMBED_DELAY_MS=200`).

| Hạng mục | Quota hiện tại (project) | Đủ 50 users? |
|----------|--------------------------|--------------|
| `gemini-embedding` TPM (`asia-southeast1`) | ~1M/min | Đủ; đã request tăng lên 2M |
| Online prediction RPM (`asia-southeast1`) | ~30,000/min | Đủ |
| `gemini-2.5-flash` chat | Dynamic Shared Quota | Không request RPM cố định; code có retry embed |

```powershell
cd api
.\scripts\check-vertex-quota-limits.ps1      # xem limit hiện tại
.\scripts\request-vertex-quotas-50users.ps1  # gửi request tăng quota (nếu cần)
```

Theo dõi request: [Quotas → Increase requests](https://console.cloud.google.com/iam-admin/quotas/increase-requests). Bật **Quota adjuster** cho Vertex AI API để GCP tự đề xuất tăng khi usage tăng.

Auth flow (Cognito) không cần AI provider.

---

## 6. File env runtime

Đã tạo sẵn (gitignored):

- `api/.env` — điền `MONGODB_URI`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `web/.env.local` — Cognito + API URL; local: `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `mobile/.env` — Cognito + API URL

**Vercel (web prod):** đặt `NEXT_PUBLIC_APP_URL` = URL production (ví dụ `https://apms-one.vercel.app`) và khớp với một callback trong `OAUTH_CALLBACK_URLS` sau `cdk deploy` (mục 2). Chi tiết: [`vercel_oauth_checklist.md`](./vercel_oauth_checklist.md).

Sau khi sửa env, restart `pnpm dev`.

---

## 7. Chạy và test

```powershell
cd api && pnpm dev
cd web && pnpm dev
```

1. Mở http://localhost:3000 → **Sign in with Google**
2. Sau callback, URL phải có `?code=...` — Amplify (`enable-oauth-listener`) đổi code lấy token
3. Trang chủ hiển thị tên user; DevTools → `GET /api/auth/me` → 200, `data.role` là `"user"` hoặc `"admin"`

Nếu kẹt ở "Completing sign-in...": kiểm tra Google redirect URI (mục 1) và restart `pnpm dev` sau khi đổi `.env.local`.

### Smoke test API nền tảng (Bearer token từ bước 3)

| Bước | Request | Kỳ vọng |
|------|---------|---------|
| 1 | `GET /api/health` | 200 |
| 2 | `POST /api/folders` body `{ "name": "Test" }` | 201 |
| 3 | `GET /api/drive` | 200, thấy folder |
| 4 | `POST /api/documents/upload-intents` (PDF metadata) | 201 + `uploadUrl` |
| 5 | PUT file lên S3 → `POST /api/documents/:id/complete` | 200, `status: processing` |

Chi tiết endpoint: [`api_reference.md`](./api_reference.md).

---

## 8. Gán quyền Admin (Cognito group)

Sau `cdk deploy`, stack tạo User Pool group **`admin`** (output `CognitoAdminGroupNameOutput`).

1. User phải **đăng nhập Google ít nhất một lần** để xuất hiện trong Cognito User Pool.
2. AWS Console → **Amazon Cognito** → User pools → pool APMS → **Users** → chọn user → **Add user to group** → `admin`.
3. User **đăng xuất và đăng nhập lại** để ID token có `cognito:groups`.
4. Kiểm tra:
   - `GET /api/auth/me` → `data.role` = `"admin"`
   - `GET /api/admin/stats` → 200 (Bearer token admin)
   - User thường gọi `/api/admin/*` → 403

**Admin API:**

| Method | Path |
|--------|------|
| `GET` | `/api/admin/stats` |
| `GET` | `/api/admin/users?page=1&limit=20&search=` |
| `GET` | `/api/admin/users/:id` |
| `PATCH` | `/api/admin/users/:id` — body `{ "storageQuotaBytes"?, "isDisabled"? }` |

### Smoke test Admin (sau khi gán group)

| Bước | Request | Kỳ vọng |
|------|---------|---------|
| 1 | User thường: `GET /api/admin/stats` | 403 |
| 2 | Admin: `GET /api/auth/me` | `data.role` = `"admin"` |
| 3 | Admin: `GET /api/admin/stats` | 200 |
| 4 | Admin: `PATCH /api/admin/users/:userId` `{ "isDisabled": true }` | User đó `POST /api/folders` → 403 |

---

## 9. Trash purge cron (bắt buộc production)

Item trong Trash được **xóa vĩnh viễn** sau `TRASH_RETENTION_DAYS` ngày (mặc định **30**). Cấu hình trong `api/.env`:

```env
TRASH_RETENTION_DAYS=30
```

Chạy script purge **mỗi ngày** trên server (cron, systemd timer, hoặc CI scheduled job):

```bash
cd api && pnpm purge:trash
```

Script: [`api/scripts/purge-trash.ts`](../api/scripts/purge-trash.ts) — xóa documents/folders có `deletedAt` cũ hơn retention, gồm S3 object, `document_chunks`, shares, và giảm `storageUsedBytes`.
