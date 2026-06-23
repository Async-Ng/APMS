# APMS Infrastructure

AWS CDK app for APMS cloud resources.

## Scope

This package provisions AWS-side infrastructure such as:

- Amazon Cognito User Pool and App Client.
- Amazon S3 bucket for uploaded documents.
- SES-related identity/configuration where applicable.

AI is not provisioned through this CDK stack. The API uses Vertex AI Gemini through Google Application Default Credentials or `GOOGLE_APPLICATION_CREDENTIALS`.

## Commands

```bash
cd infrastructure
pnpm install
pnpm build
pnpm test
pnpm cdk diff
pnpm cdk deploy
```

Always review `pnpm cdk diff` before deployment.

## Configuration

Use environment variables or CDK context as implemented by the stack source. Never commit credentials or local `.env` files.
