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

### Android dev build on Windows

Native Android builds on Windows need **npm** (not pnpm) to avoid CMake `OBJECT_PATH_MAX` errors from pnpm's long nested paths:

```bash
cd mobile
npm install
pnpm run:android
```

`app.json` limits ABIs to `arm64-v8a` and `x86_64` (skips `armeabi-v7a`, which fails with NDK 27).

If a previous pnpm install left stale caches, remove `node_modules/.pnpm` and any `node_modules/**/.cxx` folders, then run `npm install` again.

Other useful commands:

```bash
pnpm android
pnpm ios
pnpm lint
```

The current scripts use Expo offline mode. Ensure the required Expo/Metro dependencies are already installed locally.

## Environment

Copy `.env.example` to `.env` and fill in Cognito values (must match web and the Render API):

```env
EXPO_PUBLIC_API_URL=https://apms-bscq.onrender.com/api
EXPO_PUBLIC_COGNITO_USER_POOL_ID=...
EXPO_PUBLIC_COGNITO_CLIENT_ID=...
EXPO_PUBLIC_COGNITO_DOMAIN=....auth.ap-southeast-1.amazoncognito.com
```

Do not commit `.env`.

## Google sign-in (dev)

Google OAuth uses Cognito Hosted UI with deep link `apms://auth/callback`. **Expo Go does not support the custom `apms://` scheme** — use a development build:

```bash
npm install   # required on Windows before first native build
pnpm run:android
# or
pnpm run:ios
```

Cognito App Client must include callback URL `apms://auth/callback` and logout URL `apms://` (see `infrastructure/.env.example`).

The backend document API is unified under `/api/documents`.
