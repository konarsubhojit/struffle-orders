import { getDatabase } from '@/lib/db/connection';
import { users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('UserModel');

export interface User {
  id: number;
  googleId: string;
  email: string;
  name: string;
  picture: string | null;
  role: 'admin' | 'user';
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserStats {
  totalUsers: number;
  adminUsers: number;
  regularUsers: number;
}

/**
 * Find user by Google ID
 */
export async function findByGoogleId(googleId: string): Promise<User | null> {
  try {
    const db = getDatabase();
    const result = await db
      .select()
      .from(users)
      .where(eq(users.googleId, googleId))
      .limit(1);
    
    return result[0] || null;
  } catch (error) {
    logger.error('Error finding user by Google ID', error);
    throw error;
  }
}

/**
 * Find user by email
 */
export async function findByEmail(email: string): Promise<User | null> {
  try {
    const db = getDatabase();
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    return result[0] || null;
  } catch (error) {
    logger.error('Error finding user by email', error);
    throw error;
  }
}

/**
 * Find user by ID
 */
export async function findById(userId: number): Promise<User | null> {
  try {
    const db = getDatabase();
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    return result[0] || null;
  } catch (error) {
    logger.error('Error finding user by ID', error);
    throw error;
  }
}

/**
 * Get all users ordered by creation date
 */
export async function findAll(): Promise<User[]> {
  try {
    const db = getDatabase();
    const result = await db
      .select({
        id: users.id,
        googleId: users.googleId,
        email: users.email,
        name: users.name,
        picture: users.picture,
        role: users.role,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
    
    return result as User[];
  } catch (error) {
    logger.error('Error fetching all users', error);
    throw error;
  }
}

/**
 * Create a new user
 */
export async function createUser(userData: {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  role?: 'admin' | 'user';
}): Promise<User> {
  try {
    const db = getDatabase();
    const result = await db
      .insert(users)
      .values({
        googleId: userData.googleId,
        email: userData.email,
        name: userData.name,
        picture: userData.picture || null,
        role: userData.role || 'user',
        lastLogin: new Date(),
      })
      .returning();
    
    logger.info('User created', { userId: result[0].id, email: userData.email });
    return result[0] as User;
  } catch (error) {
    logger.error('Error creating user', error);
    throw error;
  }
}

/**
 * Update user's last login timestamp
 */
export async function updateLastLogin(userId: number): Promise<User | null> {
  try {
    const db = getDatabase();
    const result = await db
      .update(users)
      .set({
        lastLogin: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    return result[0] || null;
  } catch (error) {
    logger.error('Error updating last login', error);
    throw error;
  }
}

/**
 * Update user role
 */
export async function updateUserRole(userId: number, role: 'admin' | 'user'): Promise<User | null> {
  try {
    const db = getDatabase();
    const result = await db
      .update(users)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (result[0]) {
      logger.info('User role updated', { userId, newRole: role });
    }
    
    return result[0] || null;
  } catch (error) {
    logger.error('Error updating user role', error);
    throw error;
  }
}

/**
 * Find or create user from Google OAuth data
 */
export async function findOrCreateUser(googleData: {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}): Promise<User> {
  try {
    let user = await findByGoogleId(googleData.sub);
    
    if (user) {
      await updateLastLogin(user.id);
      logger.info('User logged in', { userId: user.id, email: user.email });
      return user;
    }
    
    user = await createUser({
      googleId: googleData.sub,
      email: googleData.email,
      name: googleData.name,
      picture: googleData.picture,
      role: 'user',
    });
    
    return user;
  } catch (error) {
    logger.error('Error finding or creating user', error);
    throw error;
  }
}

/**
 * Check if user has admin role
 */
export async function isAdmin(userId: number): Promise<boolean> {
  const user = await findById(userId);
  return user?.role === 'admin';
}

/**
 * Get user statistics
 */
export async function getStats(): Promise<UserStats> {
  try {
    const db = getDatabase();
    const allUsers = await db.select().from(users);
    
    return {
      totalUsers: allUsers.length,
      adminUsers: allUsers.filter((u: { role: string }) => u.role === 'admin').length,
      regularUsers: allUsers.filter((u: { role: string }) => u.role === 'user').length,
    };
  } catch (error) {
    logger.error('Error fetching user stats', error);
    throw error;
  }
}

export default {
  findByGoogleId,
  findByEmail,
  findById,
  findAll,
  createUser,
  updateLastLogin,
  updateUserRole,
  findOrCreateUser,
  isAdmin,
  getStats,
};
