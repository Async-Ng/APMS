import "aws-amplify/auth/enable-oauth-listener";
import { Amplify } from "aws-amplify";

const userPoolId = process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID;
const userPoolClientId = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID;
const cognitoDomain = process.env.EXPO_PUBLIC_COGNITO_DOMAIN;

let configured = false;

export function configureAmplify(): void {
  if (configured) {
    return;
  }

  if (!userPoolId || !userPoolClientId || !cognitoDomain) {
    throw new Error(
      "Missing Cognito env: EXPO_PUBLIC_COGNITO_USER_POOL_ID, EXPO_PUBLIC_COGNITO_CLIENT_ID, EXPO_PUBLIC_COGNITO_DOMAIN",
    );
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: {
          oauth: {
            domain: cognitoDomain,
            scopes: ["openid", "email", "profile"],
            redirectSignIn: ["apms://auth/callback"],
            redirectSignOut: ["apms://"],
            responseType: "code",
            providers: ["Google"],
          },
        },
      },
    },
  });

  configured = true;
}

configureAmplify();
