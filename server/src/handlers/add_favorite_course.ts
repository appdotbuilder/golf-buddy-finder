import { db } from '../db';
import { userFavoriteCoursesTable, usersTable, coursesTable } from '../db/schema';
import { type AddFavoriteCourseInput, type UserFavoriteCourse } from '../schema';
import { eq, and } from 'drizzle-orm';

export const addFavoriteCourse = async (input: AddFavoriteCourseInput): Promise<UserFavoriteCourse> => {
  try {
    // Validate that user exists
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (userExists.length === 0) {
      throw new Error('User not found');
    }

    // Validate that course exists
    const courseExists = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, input.course_id))
      .execute();

    if (courseExists.length === 0) {
      throw new Error('Course not found');
    }

    // Check if the favorite already exists to prevent duplicates
    const existingFavorite = await db.select()
      .from(userFavoriteCoursesTable)
      .where(and(
        eq(userFavoriteCoursesTable.user_id, input.user_id),
        eq(userFavoriteCoursesTable.course_id, input.course_id)
      ))
      .execute();

    if (existingFavorite.length > 0) {
      throw new Error('Course is already in user\'s favorites');
    }

    // Insert the favorite course record
    const result = await db.insert(userFavoriteCoursesTable)
      .values({
        user_id: input.user_id,
        course_id: input.course_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Add favorite course failed:', error);
    throw error;
  }
};