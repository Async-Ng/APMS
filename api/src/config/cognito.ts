import { CognitoJwtVerifier } from "aws-jwt-verify";

import type { Env } from "./env";

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

export function initCognitoVerifier(env: Env): void {
  verifier = CognitoJwtVerifier.create({
    userPoolId: env.COGNITO_USER_POOL_ID,
    tokenUse: "id",
    clientId: env.COGNITO_CLIENT_ID,
  });
}

export function getCognitoVerifier(): ReturnType<typeof CognitoJwtVerifier.create> {
  if (!verifier) {
    throw new Error("Cognito JWT verifier has not been initialized");
  }

  return verifier;
}
