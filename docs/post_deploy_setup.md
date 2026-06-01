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

## 5. Amazon Bedrock (khi dùng upload / AI)

Region deploy: **ap-southeast-1**

1. AWS Console → **Amazon Bedrock** → region **Asia Pacific (Singapore)**
2. **Model catalog** (hoặc Model access) → tìm **Cohere Embed English v3** → **Enable** / chấp nhận **EULA** (bắt buộc; nếu thiếu, lỗi Marketplace / `agreementAvailability: NOT_AVAILABLE`)
3. Bật **Amazon Nova Micro** (`amazon.nova-micro-v1:0`) cho chat/RAG — model AWS, **không** cần Anthropic use case form. `BEDROCK_MODEL_ID` trong `api/.env` phải khớp.
4. Region **ap-southeast-1** không hỗ trợ Titan Embeddings v2 — dùng Cohere trong `BEDROCK_EMBEDDING_MODEL_ID` (xem `api/.env.example`)
5. Chạy lại `pnpm setup:atlas` nếu đổi model embedding (vector index = **1024** chiều)
6. **IAM** — `cd infrastructure && npx cdk deploy` (policy đã có `bedrock:InvokeModel` + `aws-marketplace:Subscribe` cho `apms-backend-service-user`).

   | Lỗi trong log | Nguyên nhân | Cách xử lý |
   |---------------|-------------|------------|
   | `no identity-based policy allows bedrock:InvokeModel` | Thiếu IAM hoặc chưa propagate | `cdk deploy`, đợi ~2 phút |
   | `Marketplace actions (Subscribe, ViewSubscriptions)` | Chưa bật model / chưa EULA ở bước 2 | Bedrock Model catalog → Enable Cohere |
   | Vẫn lỗi sau Enable | Subscription chưa xong | Đợi 2–15 phút, gọi lại API |

   Policy thủ công (nếu không dùng CDK): IAM → `apms-backend-service-user` → inline policy JSON gồm cả Bedrock và Marketplace:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": "bedrock:InvokeModel",
         "Resource": [
           "arn:aws:bedrock:ap-southeast-1::foundation-model/cohere.embed-english-v3",
           "arn:aws:bedrock:ap-southeast-1::foundation-model/amazon.nova-micro-v1:0"
         ]
       },
       {
         "Effect": "Allow",
         "Action": ["aws-marketplace:Subscribe", "aws-marketplace:ViewSubscriptions"],
         "Resource": "*"
       }
     ]
   }
   ```

Auth flow không cần Bedrock.

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
