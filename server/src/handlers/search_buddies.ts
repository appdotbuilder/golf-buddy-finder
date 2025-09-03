import { db } from '../db';
import { usersTable, userFavoriteCoursesTable, userTimePreferencesTable } from '../db/schema';
import { type SearchBuddiesInput, type User } from '../schema';
import { eq, and, SQL, lte, isNull, or, sql } from 'drizzle-orm';

export const searchBuddies = async (input: SearchBuddiesInput): Promise<User[]> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    // Filter by location (exact match for simplicity)
    if (input.location) {
      conditions.push(eq(usersTable.location, input.location));
    }

    // Filter by skill level
    if (input.skill_level) {
      conditions.push(eq(usersTable.skill_level, input.skill_level));
    }

    // Filter by handicap difference if specified
    if (input.max_handicap_diff !== undefined) {
      // Include users without handicap (beginners) or users within handicap range from 0
      const handicapCondition = or(
        isNull(usersTable.handicap), // Include users without handicap (beginners)
        lte(sql`ABS(${usersTable.handicap})`, input.max_handicap_diff) // Users within handicap range from 0
      );
      if (handicapCondition) {
        conditions.push(handicapCondition);
      }
    }

    // Build and execute the main query
    const whereCondition = conditions.length > 0 
      ? (conditions.length === 1 ? conditions[0] : and(...conditions))
      : undefined;

    const results = whereCondition 
      ? await db.select().from(usersTable).where(whereCondition).execute()
      : await db.select().from(usersTable).execute();

    // Apply additional filtering for many-to-many relationships
    let filteredResults = results;

    // Filter by favorite course if specified
    if (input.course_id && filteredResults.length > 0) {
      const userIds = filteredResults.map(user => user.id);
      
      const usersWithCourse = await db.select({ user_id: userFavoriteCoursesTable.user_id })
        .from(userFavoriteCoursesTable)
        .where(
          and(
            eq(userFavoriteCoursesTable.course_id, input.course_id),
            userIds.length === 1 
              ? eq(userFavoriteCoursesTable.user_id, userIds[0])
              : or(...userIds.map(id => eq(userFavoriteCoursesTable.user_id, id)))
          )
        )
        .execute();

      const courseUserIds = usersWithCourse.map(row => row.user_id);
      filteredResults = filteredResults.filter(user => courseUserIds.includes(user.id));
    }

    // Filter by time preference if specified
    if (input.time_preference && filteredResults.length > 0) {
      const userIds = filteredResults.map(user => user.id);
      
      // Query users who have the specified time preference
      const usersWithTimePreference = await db.select({ user_id: userTimePreferencesTable.user_id })
        .from(userTimePreferencesTable)
        .where(
          and(
            eq(userTimePreferencesTable.time_preference, input.time_preference),
            userIds.length === 1 
              ? eq(userTimePreferencesTable.user_id, userIds[0])
              : or(...userIds.map(id => eq(userTimePreferencesTable.user_id, id)))
          )
        )
        .execute();

      const timePreferenceUserIds = usersWithTimePreference.map(row => row.user_id);
      filteredResults = filteredResults.filter(user => timePreferenceUserIds.includes(user.id));
    }

    return filteredResults;
  } catch (error) {
    console.error('Search buddies failed:', error);
    throw error;
  }
};