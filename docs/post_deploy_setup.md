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
| Bedrock chat model | `apac.amazon.nova-micro-v1:0` (`BedrockChatModelIdOutput`) |
| Bedrock embedding model | `cohere.embed-english-v3` (`BedrockEmbeddingModelIdOutput`) |

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

## 5. AI provider (upload / semantic search / RAG chat)

Chọn **một** provider nhất quán cho embedding (index + query). Đổi provider → rebuild vector index và re-embed documents.

### 5a. Amazon Bedrock (khuyến nghị khi đã deploy CDK)

IAM user `apms-backend-service-user` nhận quyền `bedrock:InvokeModel` + `bedrock:Converse` sau `cdk deploy`. Copy model IDs từ stack outputs `BedrockChatModelIdOutput` / `BedrockEmbeddingModelIdOutput`.

**Bước 1 — Bật model trên AWS Console (bắt buộc, CDK không làm được)**

1. AWS Console → region **`ap-southeast-1`** → **Amazon Bedrock** → **Model catalog** (hoặc Model access)
2. Bật:
   - **Cohere Embed English v3** (`cohere.embed-english-v3`) — embedding
   - **Amazon Nova Micro** — chat
3. Nếu Cohere yêu cầu Marketplace subscription hoặc use case form → submit và chờ approve

**Bước 2 — `api/.env`**

```
AI_PROVIDER=bedrock
BEDROCK_MODEL_ID=apac.amazon.nova-micro-v1:0
BEDROCK_EMBEDDING_MODEL_ID=cohere.embed-english-v3
```

Không cần `GEMINI_API_KEY` khi `AI_PROVIDER=bedrock`.

**Bước 3 — Rebuild vector index (1024 dims)**

Nếu trước đó dùng local embedding (384 dims) hoặc đổi từ Gemini, làm theo [`api/scripts/rebuild-vector-index-bedrock.md`](../api/scripts/rebuild-vector-index-bedrock.md).

| Biến | Mô tả |
|------|--------|
| `AI_PROVIDER` | `bedrock` |
| `BEDROCK_MODEL_ID` | Mặc định `apac.amazon.nova-micro-v1:0` (dùng inference profile `apac.*`, không gọi `amazon.nova-micro-v1:0` trực tiếp) |
| `BEDROCK_EMBEDDING_MODEL_ID` | Mặc định `cohere.embed-english-v3` (1024 dims) |

Lỗi thường gặp: `AccessDenied` → kiểm tra `cdk deploy` + Model catalog; `inference profile` → sai `BEDROCK_MODEL_ID`; vector search rỗng → chưa rebuild index 1024 dims.

### 5c. Giới hạn sử dụng Bedrock (cost + quota)

**CDK monitoring** (cần `ALERT_EMAIL` trong `infrastructure/.env`):

1. Đặt `ALERT_EMAIL=<email-thật>` → `cd infrastructure && npx cdk deploy`
2. Mở email AWS SNS → **Confirm subscription**
3. Kiểm tra **Billing → Budgets** → budget `apms-bedrock-monthly` ($20, filter Amazon Bedrock)
4. Kiểm tra **CloudWatch → Alarms** → 2 alarm invocations/ngày (embed 500, chat 200)

**Biến API** (`api/.env`):

| Biến | Mặc định | Mô tả |
|------|----------|--------|
| `BEDROCK_EMBED_DELAY_MS` | `200` | Delay giữa mỗi chunk embed khi `AI_PROVIDER=bedrock` |
| `BEDROCK_MAX_RETRIES` | `3` | Retry khi Bedrock throttle |
| `BEDROCK_RETRY_BASE_MS` | `1000` | Base exponential backoff |
| `CHAT_DAILY_LIMIT_PER_USER` | `50` | Max tin chat/user/ngày (`0` = tắt) |

**Service Quotas:** AWS Console → Service Quotas → Amazon Bedrock → ghi RPM/TPM của Cohere + Nova; request tăng quota nếu re-embed nhiều file.

### 5b. Google Gemini (thay thế)

1. Lấy API key tại [Google AI Studio](https://aistudio.google.com/apikey)
2. Trong `api/.env`:
   ```
   AI_PROVIDER=gemini
   GEMINI_API_KEY=<key>
   GEMINI_CHAT_MODEL=gemini-2.5-flash
   GEMINI_EMBEDDING_MODEL=gemini-embedding-001
   ```
3. Re-index khi đổi embedding model:
   ```powershell
   cd api
   npx tsx --env-file=.env scripts/reindex-gemini.ts
   ```

| Biến | Mô tả |
|------|--------|
| `AI_PROVIDER` | `gemini` \| `auto` (Bedrock chat trước, fallback Gemini — cần cả Bedrock + Gemini) |
| `GEMINI_API_KEY` | Bắt buộc khi `gemini` hoặc `auto` |
| `GEMINI_EMBEDDING_MODEL` | Mặc định `gemini-embedding-001` (1024 dims) |

Auth flow không cần AI provider.

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
