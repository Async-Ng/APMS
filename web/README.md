# APMS Web

Next.js web client for APMS.

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- TanStack Query
- Zustand
- AWS Amplify for Cognito client integration

## Development

```bash
cd web
pnpm install
pnpm dev
```

The app runs on `http://localhost:3000` by default.

## Environment

Configure the web package with the API base URL and Cognito/Amplify values expected by the current client code. Do not commit local `.env` files.

The backend document API has moved to unified `/api/documents`. If a web screen still calls removed document surfaces, that screen needs a client migration phase before it can work against the current API.

## Verification

```bash
cd web
pnpm lint
pnpm build
```
