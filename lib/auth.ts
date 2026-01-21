import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { findOrCreateUser } from "@/lib/models/User";

interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  [key: string]: unknown;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const googleProfile = profile as GoogleProfile;
        token.id = googleProfile.sub;
        token.provider = account.provider;
        token.picture = googleProfile.picture;
        
        // Find or create user in database and get their role
        try {
          const user = await findOrCreateUser({
            sub: googleProfile.sub,
            email: googleProfile.email || token.email as string,
            name: googleProfile.name || token.name as string,
            picture: googleProfile.picture,
          });
          token.dbUserId = user.id;
          token.role = user.role;
        } catch (error) {
          console.error('Error syncing user to database:', error);
          token.role = 'user'; // Default to user role on error
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.provider = token.provider as string;
        session.user.image = (token.picture as string) || session.user.image || null;
        session.user.dbUserId = token.dbUserId as number;
        session.user.role = (token.role as 'admin' | 'user') || 'user';
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
