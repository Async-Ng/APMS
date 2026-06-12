import type { NextFunction, Request, Response } from "express";

import { getCognitoVerifier } from "../config/cognito";
import { ErrorCode, ERROR_MESSAGES } from "../errors/error-codes";

export interface AuthUser {
  cognitoSub: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  groups: string[];
  isAdmin: boolean;
}

function parseCognitoGroups(payload: Record<string, unknown>): string[] {
  const raw = payload["cognito:groups"];

  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === "string");
  }

  if (typeof raw === "string") {
    return [raw];
  }

  return [];
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      status: "error",
      code: ErrorCode.AUTH_UNAUTHORIZED,
      message: ERROR_MESSAGES.AUTH_UNAUTHORIZED,
    });
    return;
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const payload = await getCognitoVerifier().verify(token);
    const email = typeof payload.email === "string" ? payload.email : undefined;

    if (!email) {
      res.status(401).json({
        status: "error",
        code: ErrorCode.AUTH_TOKEN_INVALID,
        message: ERROR_MESSAGES.AUTH_TOKEN_INVALID,
      });
      return;
    }

    const displayName =
      typeof payload.name === "string" && payload.name.length > 0
        ? payload.name
        : email;

    const groups = parseCognitoGroups(payload as Record<string, unknown>);

    const authUser: AuthUser = {
      cognitoSub: payload.sub,
      email,
      displayName,
      groups,
      isAdmin: groups.includes("admin"),
    };

    if (typeof payload.picture === "string" && payload.picture.length > 0) {
      authUser.avatarUrl = payload.picture;
    }

    req.authUser = authUser;
    next();
  } catch {
    res.status(401).json({
      status: "error",
      code: ErrorCode.AUTH_TOKEN_INVALID,
      message: ERROR_MESSAGES.AUTH_TOKEN_INVALID,
    });
  }
}
