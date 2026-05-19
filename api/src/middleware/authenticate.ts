import type { NextFunction, Request, Response } from "express";

import { getCognitoVerifier } from "../config/cognito";

export interface AuthUser {
  cognitoSub: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ status: "error", message: "Unauthorized" });
    return;
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const payload = await getCognitoVerifier().verify(token);
    const email = typeof payload.email === "string" ? payload.email : undefined;

    if (!email) {
      res.status(401).json({ status: "error", message: "Token missing email claim" });
      return;
    }

    const displayName =
      typeof payload.name === "string" && payload.name.length > 0
        ? payload.name
        : email;

    const authUser: AuthUser = {
      cognitoSub: payload.sub,
      email,
      displayName,
    };

    if (typeof payload.picture === "string" && payload.picture.length > 0) {
      authUser.avatarUrl = payload.picture;
    }

    req.authUser = authUser;
    next();
  } catch {
    res.status(401).json({ status: "error", message: "Invalid or expired token" });
  }
}
