import { db } from '../db';
import { coursesTable } from '../db/schema';
import { type Course } from '../schema';

export const getCourses = async (): Promise<Course[]> => {
  try {
    // Fetch all courses from the database
    const results = await db.select()
      .from(coursesTable)
      .execute();

    // Return courses as-is (no numeric conversions needed for this table)
    return results;
  } catch (error) {
    console.error('Get courses failed:', error);
    throw error;
  }
};