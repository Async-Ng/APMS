import {
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

import { loadEnv } from "../config/env";
import { createAppError, ErrorCode } from "../errors/error-codes";

const ADMIN_GROUP_NAME = "admin";

let client: CognitoIdentityProviderClient | null = null;

function getClient(): CognitoIdentityProviderClient {
  if (!client) {
    const env = loadEnv();
    client = new CognitoIdentityProviderClient({
      region: env.COGNITO_REGION ?? env.AWS_REGION,
    });
  }
  return client;
}

async function runCognitoCommand<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw createAppError(ErrorCode.COGNITO_GROUP_UPDATE_FAILED, 502, {
      technicalDetail: message,
    });
  }
}

export async function addUserToAdminGroup(cognitoSub: string): Promise<void> {
  const env = loadEnv();
  await runCognitoCommand(() =>
    getClient().send(
      new AdminAddUserToGroupCommand({
        UserPoolId: env.COGNITO_USER_POOL_ID,
        Username: cognitoSub,
        GroupName: ADMIN_GROUP_NAME,
      }),
    ),
  );
}

export async function removeUserFromAdminGroup(cognitoSub: string): Promise<void> {
  const env = loadEnv();
  await runCognitoCommand(() =>
    getClient().send(
      new AdminRemoveUserFromGroupCommand({
        UserPoolId: env.COGNITO_USER_POOL_ID,
        Username: cognitoSub,
        GroupName: ADMIN_GROUP_NAME,
      }),
    ),
  );
}
