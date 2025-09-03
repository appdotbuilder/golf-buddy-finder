import { db } from '../db';
import { coursesTable } from '../db/schema';
import { type CreateCourseInput, type Course } from '../schema';
import { and, eq } from 'drizzle-orm';

export const createCourse = async (input: CreateCourseInput): Promise<Course> => {
  try {
    // Check for duplicate course (same name and location)
    const existingCourse = await db.select()
      .from(coursesTable)
      .where(and(
        eq(coursesTable.name, input.name),
        eq(coursesTable.location, input.location)
      ))
      .limit(1)
      .execute();

    if (existingCourse.length > 0) {
      throw new Error('A course with this name already exists at this location');
    }

    // Insert new course
    const result = await db.insert(coursesTable)
      .values({
        name: input.name,
        location: input.location,
        description: input.description,
        par: input.par
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Course creation failed:', error);
    throw error;
  }
};