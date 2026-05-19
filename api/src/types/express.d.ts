declare global {
  namespace Express {
    interface Request {
      authUser?: {
        cognitoSub: string;
        email: string;
        displayName: string;
        avatarUrl?: string;
      };
    }
  }
}

export {};
