import "aws-amplify/auth/enable-oauth-listener";
import { Amplify } from "aws-amplify";

const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

let configured = false;

export function configureAmplify(): void {
  if (configured) {
    return;
  }

  if (!userPoolId || !userPoolClientId || !cognitoDomain) {
    throw new Error(
      "Missing Cognito env: NEXT_PUBLIC_COGNITO_USER_POOL_ID, NEXT_PUBLIC_COGNITO_CLIENT_ID, NEXT_PUBLIC_COGNITO_DOMAIN",
    );
  }

  Amplify.configure(
    {
      Auth: {
        Cognito: {
          userPoolId,
          userPoolClientId,
          loginWith: {
            oauth: {
              domain: cognitoDomain,
              scopes: ["openid", "email", "profile"],
              redirectSignIn: [`${appUrl}/auth/callback`],
              redirectSignOut: [`${appUrl}/login`],
              responseType: "code",
              providers: ["Google"],
            },
          },
        },
      },
    },
    { ssr: true },
  );

  configured = true;
}

// Configure synchronously on import so OAuth callback can exchange tokens immediately.
configureAmplify();
