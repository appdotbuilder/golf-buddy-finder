import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, userFavoriteCoursesTable } from '../db/schema';
import { type AddFavoriteCourseInput } from '../schema';
import { addFavoriteCourse } from '../handlers/add_favorite_course';
import { eq, and } from 'drizzle-orm';

describe('addFavoriteCourse', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test helper to create a test user
  const createTestUser = async () => {
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testgolfer',
        full_name: 'Test Golfer',
        skill_level: 'intermediate',
        handicap: 15,
        location: 'San Francisco'
      })
      .returning()
      .execute();
    return userResult[0];
  };

  // Test helper to create a test course
  const createTestCourse = async () => {
    const courseResult = await db.insert(coursesTable)
      .values({
        name: 'Pebble Beach Golf Links',
        location: 'Pebble Beach, CA',
        description: 'Famous oceanfront golf course',
        par: 72
      })
      .returning()
      .execute();
    return courseResult[0];
  };

  it('should add a course to user\'s favorites successfully', async () => {
    // Create test data
    const user = await createTestUser();
    const course = await createTestCourse();

    const input: AddFavoriteCourseInput = {
      user_id: user.id,
      course_id: course.id
    };

    // Add favorite course
    const result = await addFavoriteCourse(input);

    // Validate the result
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(user.id);
    expect(result.course_id).toEqual(course.id);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save favorite course to database', async () => {
    // Create test data
    const user = await createTestUser();
    const course = await createTestCourse();

    const input: AddFavoriteCourseInput = {
      user_id: user.id,
      course_id: course.id
    };

    // Add favorite course
    const result = await addFavoriteCourse(input);

    // Query database to verify the record was saved
    const savedFavorites = await db.select()
      .from(userFavoriteCoursesTable)
      .where(eq(userFavoriteCoursesTable.id, result.id))
      .execute();

    expect(savedFavorites).toHaveLength(1);
    expect(savedFavorites[0].user_id).toEqual(user.id);
    expect(savedFavorites[0].course_id).toEqual(course.id);
    expect(savedFavorites[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    // Create test course but no user
    const course = await createTestCourse();

    const input: AddFavoriteCourseInput = {
      user_id: 999, // Non-existent user ID
      course_id: course.id
    };

    // Should throw error for non-existent user
    await expect(addFavoriteCourse(input)).rejects.toThrow(/user not found/i);
  });

  it('should throw error when course does not exist', async () => {
    // Create test user but no course
    const user = await createTestUser();

    const input: AddFavoriteCourseInput = {
      user_id: user.id,
      course_id: 999 // Non-existent course ID
    };

    // Should throw error for non-existent course
    await expect(addFavoriteCourse(input)).rejects.toThrow(/course not found/i);
  });

  it('should prevent duplicate favorites', async () => {
    // Create test data
    const user = await createTestUser();
    const course = await createTestCourse();

    const input: AddFavoriteCourseInput = {
      user_id: user.id,
      course_id: course.id
    };

    // Add favorite course first time - should succeed
    await addFavoriteCourse(input);

    // Try to add the same favorite again - should fail
    await expect(addFavoriteCourse(input)).rejects.toThrow(/already in user's favorites/i);
  });

  it('should allow same course to be favorited by different users', async () => {
    // Create test course
    const course = await createTestCourse();

    // Create two different users
    const user1 = await createTestUser();
    
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'test2@example.com',
        username: 'testgolfer2',
        full_name: 'Test Golfer 2',
        skill_level: 'beginner',
        handicap: null,
        location: 'Los Angeles'
      })
      .returning()
      .execute();
    const user2 = user2Result[0];

    // Both users should be able to favorite the same course
    const input1: AddFavoriteCourseInput = {
      user_id: user1.id,
      course_id: course.id
    };

    const input2: AddFavoriteCourseInput = {
      user_id: user2.id,
      course_id: course.id
    };

    const result1 = await addFavoriteCourse(input1);
    const result2 = await addFavoriteCourse(input2);

    // Both should succeed
    expect(result1.user_id).toEqual(user1.id);
    expect(result1.course_id).toEqual(course.id);
    expect(result2.user_id).toEqual(user2.id);
    expect(result2.course_id).toEqual(course.id);

    // Verify both records exist in database
    const allFavorites = await db.select()
      .from(userFavoriteCoursesTable)
      .where(eq(userFavoriteCoursesTable.course_id, course.id))
      .execute();

    expect(allFavorites).toHaveLength(2);
  });

  it('should allow same user to favorite different courses', async () => {
    // Create test user
    const user = await createTestUser();

    // Create two different courses
    const course1 = await createTestCourse();
    
    const course2Result = await db.insert(coursesTable)
      .values({
        name: 'Augusta National Golf Club',
        location: 'Augusta, GA',
        description: 'Home of The Masters Tournament',
        par: 72
      })
      .returning()
      .execute();
    const course2 = course2Result[0];

    // User should be able to favorite both courses
    const input1: AddFavoriteCourseInput = {
      user_id: user.id,
      course_id: course1.id
    };

    const input2: AddFavoriteCourseInput = {
      user_id: user.id,
      course_id: course2.id
    };

    const result1 = await addFavoriteCourse(input1);
    const result2 = await addFavoriteCourse(input2);

    // Both should succeed
    expect(result1.user_id).toEqual(user.id);
    expect(result1.course_id).toEqual(course1.id);
    expect(result2.user_id).toEqual(user.id);
    expect(result2.course_id).toEqual(course2.id);

    // Verify both records exist in database
    const userFavorites = await db.select()
      .from(userFavoriteCoursesTable)
      .where(eq(userFavoriteCoursesTable.user_id, user.id))
      .execute();

    expect(userFavorites).toHaveLength(2);
  });
});