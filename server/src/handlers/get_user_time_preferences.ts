import { db } from '../db';
import { userTimePreferencesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UserTimePreference } from '../schema';

export const getUserTimePreferences = async (userId: number): Promise<UserTimePreference[]> => {
  try {
    const results = await db.select()
      .from(userTimePreferencesTable)
      .where(eq(userTimePreferencesTable.user_id, userId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get user time preferences:', error);
    throw error;
  }
};