# APMS Infrastructure (AWS CDK)

Defines AWS resources for APMS: S3, IAM backend user, Amazon Cognito (Google federated auth + **User Pool group `admin`**), Textract IAM permissions for the backend user.

## Setup

```bash
pnpm install
cp .env.example .env
# Edit .env with your Google OAuth credentials
```

## Environment variables

See [`.env.example`](./.env.example). Required for deploy:

| Variable | Description |
| :--- | :--- |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (Cognito Google IdP) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

Optional:

| Variable | Description |
| :--- | :--- |
| `COGNITO_DOMAIN_PREFIX` | Cognito Hosted UI domain prefix |
| `OAUTH_CALLBACK_URLS` | Comma-separated callback URLs for App Client |
| `OAUTH_LOGOUT_URLS` | Comma-separated logout URLs |
| `CDK_DEFAULT_ACCOUNT` | Target AWS account ID |
| `CDK_DEFAULT_REGION` | Target AWS region (e.g. `ap-southeast-1`) |

Values in `.env` are loaded automatically via `dotenv` when running CDK commands. CDK context (`-c googleClientId=...`) still overrides env if set.

### IAM permissions (`apms-backend-service-user`)

| Service | Actions | Purpose |
| :--- | :--- | :--- |
| S3 | `PutObject`, `GetObject`, `DeleteObject`, `ListBucket` | Document storage |
| Textract | `DetectDocumentText`, `StartDocumentAnalysis`, `GetDocumentAnalysis` | Optional OCR (not used by default) |

AI (Vertex AI Gemini) không cần IAM permissions — dùng Google ADC (service account JSON).

## Commands

```bash
pnpm run build
npx cdk synth
npx cdk diff
npx cdk deploy
```

After deploy, copy stack **Outputs** into `api/.env`, `web/.env.local`, and `mobile/.env`. Add `CognitoGoogleIdpRedirectUri` to Google Cloud Console as an authorized redirect URI.

**Admin access:** Assign users to Cognito group `admin` (see `CognitoAdminGroupNameOutput`). They sign in with the same Google OAuth flow; the API reads `cognito:groups` from the ID token. See [`docs/post_deploy_setup.md`](../docs/post_deploy_setup.md) section 8 and [`docs/api_reference.md`](../docs/api_reference.md).
