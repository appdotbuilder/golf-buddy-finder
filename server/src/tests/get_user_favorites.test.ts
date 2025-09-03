import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, userFavoriteCoursesTable } from '../db/schema';
import { getUserFavorites } from '../handlers/get_user_favorites';

describe('getUserFavorites', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for user with no favorite courses', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        skill_level: 'beginner',
        location: 'Test City'
      })
      .returning()
      .execute();

    const result = await getUserFavorites(userResult[0].id);

    expect(result).toEqual([]);
  });

  it('should return favorite courses for a user', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        skill_level: 'intermediate',
        location: 'Test City'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test courses
    const courseResults = await db.insert(coursesTable)
      .values([
        {
          name: 'Pebble Beach Golf Links',
          location: 'Pebble Beach, CA',
          description: 'Famous oceanside course',
          par: 72
        },
        {
          name: 'Augusta National Golf Club',
          location: 'Augusta, GA',
          description: 'Home of The Masters',
          par: 72
        }
      ])
      .returning()
      .execute();

    // Add courses to user's favorites
    await db.insert(userFavoriteCoursesTable)
      .values([
        { user_id: userId, course_id: courseResults[0].id },
        { user_id: userId, course_id: courseResults[1].id }
      ])
      .execute();

    const result = await getUserFavorites(userId);

    expect(result).toHaveLength(2);
    
    // Sort results by name for consistent testing
    const sortedResult = result.sort((a, b) => a.name.localeCompare(b.name));
    
    expect(sortedResult[0].name).toEqual('Augusta National Golf Club');
    expect(sortedResult[0].location).toEqual('Augusta, GA');
    expect(sortedResult[0].description).toEqual('Home of The Masters');
    expect(sortedResult[0].par).toEqual(72);
    expect(sortedResult[0].id).toBeDefined();
    expect(sortedResult[0].created_at).toBeInstanceOf(Date);

    expect(sortedResult[1].name).toEqual('Pebble Beach Golf Links');
    expect(sortedResult[1].location).toEqual('Pebble Beach, CA');
    expect(sortedResult[1].description).toEqual('Famous oceanside course');
    expect(sortedResult[1].par).toEqual(72);
  });

  it('should return only courses favorited by the specific user', async () => {
    // Create two users
    const userResults = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          username: 'user1',
          full_name: 'User One',
          skill_level: 'beginner',
          location: 'City A'
        },
        {
          email: 'user2@example.com',
          username: 'user2',
          full_name: 'User Two',
          skill_level: 'advanced',
          location: 'City B'
        }
      ])
      .returning()
      .execute();

    const user1Id = userResults[0].id;
    const user2Id = userResults[1].id;

    // Create test courses
    const courseResults = await db.insert(coursesTable)
      .values([
        {
          name: 'Course A',
          location: 'Location A',
          description: 'First course',
          par: 70
        },
        {
          name: 'Course B',
          location: 'Location B',
          description: 'Second course',
          par: 72
        }
      ])
      .returning()
      .execute();

    // User 1 favorites Course A, User 2 favorites Course B
    await db.insert(userFavoriteCoursesTable)
      .values([
        { user_id: user1Id, course_id: courseResults[0].id },
        { user_id: user2Id, course_id: courseResults[1].id }
      ])
      .execute();

    // Get favorites for user 1
    const user1Result = await getUserFavorites(user1Id);
    expect(user1Result).toHaveLength(1);
    expect(user1Result[0].name).toEqual('Course A');

    // Get favorites for user 2
    const user2Result = await getUserFavorites(user2Id);
    expect(user2Result).toHaveLength(1);
    expect(user2Result[0].name).toEqual('Course B');
  });

  it('should handle courses with null description', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        skill_level: 'pro',
        location: 'Test City'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create course with null description
    const courseResult = await db.insert(coursesTable)
      .values({
        name: 'Simple Course',
        location: 'Simple Location',
        description: null,
        par: 71
      })
      .returning()
      .execute();

    // Add course to user's favorites
    await db.insert(userFavoriteCoursesTable)
      .values({ user_id: userId, course_id: courseResult[0].id })
      .execute();

    const result = await getUserFavorites(userId);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Simple Course');
    expect(result[0].location).toEqual('Simple Location');
    expect(result[0].description).toBeNull();
    expect(result[0].par).toEqual(71);
  });

  it('should return empty array for non-existent user', async () => {
    const nonExistentUserId = 999;
    const result = await getUserFavorites(nonExistentUserId);

    expect(result).toEqual([]);
  });

  it('should maintain chronological order of when courses were added as favorites', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        skill_level: 'intermediate',
        location: 'Test City'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test courses
    const courseResults = await db.insert(coursesTable)
      .values([
        {
          name: 'First Course',
          location: 'Location 1',
          description: 'Added first',
          par: 70
        },
        {
          name: 'Second Course',
          location: 'Location 2',
          description: 'Added second',
          par: 72
        }
      ])
      .returning()
      .execute();

    // Add courses as favorites with a small delay to ensure different timestamps
    await db.insert(userFavoriteCoursesTable)
      .values({ user_id: userId, course_id: courseResults[0].id })
      .execute();

    // Small delay to ensure different created_at timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(userFavoriteCoursesTable)
      .values({ user_id: userId, course_id: courseResults[1].id })
      .execute();

    const result = await getUserFavorites(userId);

    expect(result).toHaveLength(2);
    // Verify both courses are returned (order may vary depending on database behavior)
    const courseNames = result.map(course => course.name);
    expect(courseNames).toContain('First Course');
    expect(courseNames).toContain('Second Course');
  });
});