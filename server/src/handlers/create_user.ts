import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import { eq, or } from 'drizzle-orm';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Check for duplicate email or username
    const existingUsers = await db.select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.email, input.email),
          eq(usersTable.username, input.username)
        )
      )
      .execute();

    if (existingUsers.length > 0) {
      const duplicateFields = [];
      if (existingUsers.some(user => user.email === input.email)) {
        duplicateFields.push('email');
      }
      if (existingUsers.some(user => user.username === input.username)) {
        duplicateFields.push('username');
      }
      throw new Error(`User with this ${duplicateFields.join(' and ')} already exists`);
    }

    // Insert the new user
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        username: input.username,
        full_name: input.full_name,
        skill_level: input.skill_level,
        handicap: input.handicap,
        location: input.location,
        bio: input.bio,
        home_course: input.home_course
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};