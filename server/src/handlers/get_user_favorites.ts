import { db } from '../db';
import { userFavoriteCoursesTable, coursesTable } from '../db/schema';
import { type Course } from '../schema';
import { eq } from 'drizzle-orm';

export const getUserFavorites = async (userId: number): Promise<Course[]> => {
  try {
    // Join user_favorite_courses with courses table to get complete course information
    const results = await db.select({
      id: coursesTable.id,
      name: coursesTable.name,
      location: coursesTable.location,
      description: coursesTable.description,
      par: coursesTable.par,
      created_at: coursesTable.created_at
    })
    .from(userFavoriteCoursesTable)
    .innerJoin(coursesTable, eq(userFavoriteCoursesTable.course_id, coursesTable.id))
    .where(eq(userFavoriteCoursesTable.user_id, userId))
    .execute();

    return results;
  } catch (error) {
    console.error('Failed to get user favorites:', error);
    throw error;
  }
};