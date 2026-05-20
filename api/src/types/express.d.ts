import type { UserDocument } from "../models/user.model";

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        cognitoSub: string;
        email: string;
        displayName: string;
        avatarUrl?: string;
        groups: string[];
        isAdmin: boolean;
      };
      currentUser?: UserDocument;
    }
  }
}

export {};
