import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const updateUser = async (input: UpdateUserInput): Promise<User> => {
  try {
    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.email !== undefined) updateData.email = input.email;
    if (input.username !== undefined) updateData.username = input.username;
    if (input.full_name !== undefined) updateData.full_name = input.full_name;
    if (input.skill_level !== undefined) updateData.skill_level = input.skill_level;
    if (input.handicap !== undefined) updateData.handicap = input.handicap;
    if (input.location !== undefined) updateData.location = input.location;
    if (input.bio !== undefined) updateData.bio = input.bio;
    if (input.home_course !== undefined) updateData.home_course = input.home_course;

    // Update user record
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`User with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
};