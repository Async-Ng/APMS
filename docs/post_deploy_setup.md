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
2. **Model access** → bật Claude 3 Haiku và Titan Embeddings v2
3. Nếu model không khả dụng ở region này, đổi `BEDROCK_*` trong `api/.env` theo model ID hỗ trợ

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
3. Trang chủ hiển thị tên user; DevTools → `GET /api/auth/me` → 200

Nếu kẹt ở "Completing sign-in...": kiểm tra Google redirect URI (mục 1) và restart `pnpm dev` sau khi đổi `.env.local`.
