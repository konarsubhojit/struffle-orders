import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      provider?: string;
      dbUserId?: number;
      role?: 'admin' | 'user';
    } & DefaultSession["user"];
  }

  interface User {
    provider?: string;
    role?: 'admin' | 'user';
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    provider?: string;
    picture?: string;
    dbUserId?: number;
    role?: 'admin' | 'user';
  }
}
