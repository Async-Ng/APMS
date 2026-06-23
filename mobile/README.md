# APMS Mobile

Expo mobile client for APMS.

## Stack

- Expo 54
- React Native 0.81
- Expo Router
- NativeWind
- TanStack Query
- Zustand
- AWS Amplify for Cognito client integration

## Development

```bash
cd mobile
pnpm install
pnpm start
```

Other useful commands:

```bash
pnpm android
pnpm ios
pnpm lint
```

The current scripts use Expo offline mode. Ensure the required Expo/Metro dependencies are already installed locally.

## Environment

Use the package-local environment file expected by the app. Do not commit `.env`.

The backend document API is now unified under `/api/documents`. If any mobile document screen still calls removed document surfaces, it must be migrated in a client phase.
