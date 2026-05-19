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

## 2. IAM access key cho API (bắt buộc)

1. AWS Console → **IAM** → **Users** → `apms-backend-service-user`
2. Tab **Security credentials** → **Create access key**
3. Use case: **Application running outside AWS**
4. Copy **Access key ID** và **Secret access key** (chỉ hiện một lần)
5. Dán vào `api/.env`:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

---

## 3. MongoDB Atlas (bắt buộc cho API)

1. Tạo cluster + database user trên [MongoDB Atlas](https://www.mongodb.com/atlas)
2. **Network Access**: cho phép IP máy dev (hoặc `0.0.0.0/0` tạm cho dev)
3. Copy connection string → `MONGODB_URI` trong `api/.env`

---

## 4. Amazon Bedrock (khi dùng upload / AI)

Region deploy: **ap-southeast-1**

1. AWS Console → **Amazon Bedrock** → region **Asia Pacific (Singapore)**
2. **Model access** → bật Claude 3 Haiku và Titan Embeddings v2
3. Nếu model không khả dụng ở region này, đổi `BEDROCK_*` trong `api/.env` theo model ID hỗ trợ

Auth flow không cần Bedrock.

---

## 5. File env runtime

Đã tạo sẵn (gitignored):

- `api/.env` — điền `MONGODB_URI`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `web/.env.local` — Cognito + API URL
- `mobile/.env` — Cognito + API URL

Sau khi sửa env, restart `pnpm dev`.

---

## 6. Chạy và test

```powershell
cd api && pnpm dev
cd web && pnpm dev
```

1. Mở http://localhost:3000 → **Sign in with Google**
2. Sau callback, URL phải có `?code=...` — Amplify (`enable-oauth-listener`) đổi code lấy token
3. Trang chủ hiển thị tên user; DevTools → `GET /api/auth/me` → 200

Nếu kẹt ở "Completing sign-in...": kiểm tra Google redirect URI (mục 1) và restart `pnpm dev` sau khi đổi `.env.local`.
