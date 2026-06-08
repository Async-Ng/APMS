# APMS Infrastructure (AWS CDK)

Defines AWS resources for APMS: S3, IAM backend user, Amazon Cognito (Google federated auth + **User Pool group `admin`**), Bedrock + Textract IAM permissions for the backend user.

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
| `ALERT_EMAIL` | Email for Bedrock budget + CloudWatch alarm notifications (required for monitoring resources) |

Optional:

| Variable | Description |
| :--- | :--- |
| `COGNITO_DOMAIN_PREFIX` | Cognito Hosted UI domain prefix |
| `OAUTH_CALLBACK_URLS` | Comma-separated callback URLs for App Client |
| `OAUTH_LOGOUT_URLS` | Comma-separated logout URLs |
| `CDK_DEFAULT_ACCOUNT` | Target AWS account ID |
| `CDK_DEFAULT_REGION` | Target AWS region (e.g. `ap-southeast-1`) |
| `BEDROCK_MODEL_ID` | Chat model for IAM scope (default `apac.amazon.nova-micro-v1:0`) |
| `BEDROCK_EMBEDDING_MODEL_ID` | Embedding model for IAM scope (default `cohere.embed-english-v3`) |
| `BEDROCK_BUDGET_LIMIT_USD` | Monthly Bedrock budget threshold (default `20`) |

Values in `.env` are loaded automatically via `dotenv` when running CDK commands. CDK context (`-c googleClientId=...`) still overrides env if set.

### IAM permissions (`apms-backend-service-user`)

| Service | Actions | Purpose |
| :--- | :--- | :--- |
| S3 | `PutObject`, `GetObject`, `DeleteObject`, `ListBucket` | Document storage |
| Textract | `DetectDocumentText`, `StartDocumentAnalysis`, `GetDocumentAnalysis` | Optional OCR (not used by default) |
| Bedrock | `InvokeModel` on Cohere embed model | Document/query embeddings |
| Bedrock | `Converse` on Nova inference profile | RAG chat |

CDK grants IAM only. You must still **enable models** in the Bedrock Model Catalog (AWS Console) and set `AI_PROVIDER=bedrock` in `api/.env`. See [`docs/post_deploy_setup.md`](../docs/post_deploy_setup.md) sections 5a–5c.

### Monitoring (`ALERT_EMAIL` required)

| Resource | Purpose |
| :--- | :--- |
| SNS Topic `APMSAlertTopic` | Email alerts |
| AWS Budget `apms-bedrock-monthly` | $20/month Bedrock cost (80%, 100%, forecast 100%) |
| CloudWatch Alarms | Daily invocations > 500 (embed) / > 200 (chat) |

After `cdk deploy`, confirm the SNS email subscription. Stack outputs: `AlertTopicArnOutput`, `BedrockBudgetNameOutput`.

## Commands

```bash
pnpm run build
npx cdk synth
npx cdk diff
npx cdk deploy
```

After deploy, copy stack **Outputs** into `api/.env`, `web/.env.local`, and `mobile/.env`. Add `CognitoGoogleIdpRedirectUri` to Google Cloud Console as an authorized redirect URI.

**Admin access:** Assign users to Cognito group `admin` (see `CognitoAdminGroupNameOutput`). They sign in with the same Google OAuth flow; the API reads `cognito:groups` from the ID token. See [`docs/post_deploy_setup.md`](../docs/post_deploy_setup.md) section 8 and [`docs/api_reference.md`](../docs/api_reference.md).
