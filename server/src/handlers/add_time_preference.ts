import { db } from '../db';
import { usersTable, userTimePreferencesTable } from '../db/schema';
import { type AddTimePreferenceInput, type UserTimePreference } from '../schema';
import { eq, and } from 'drizzle-orm';

export const addTimePreference = async (input: AddTimePreferenceInput): Promise<UserTimePreference> => {
  try {
    // Validate that the user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Check if the time preference already exists for this user
    const existingPreference = await db.select()
      .from(userTimePreferencesTable)
      .where(
        and(
          eq(userTimePreferencesTable.user_id, input.user_id),
          eq(userTimePreferencesTable.time_preference, input.time_preference)
        )
      )
      .execute();

    if (existingPreference.length > 0) {
      throw new Error(`Time preference '${input.time_preference}' already exists for user ${input.user_id}`);
    }

    // Insert the new time preference
    const result = await db.insert(userTimePreferencesTable)
      .values({
        user_id: input.user_id,
        time_preference: input.time_preference
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Add time preference failed:', error);
    throw error;
  }
};