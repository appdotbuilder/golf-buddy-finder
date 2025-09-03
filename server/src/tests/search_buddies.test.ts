import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, userFavoriteCoursesTable, userTimePreferencesTable } from '../db/schema';
import { type SearchBuddiesInput, type CreateUserInput, type CreateCourseInput } from '../schema';
import { searchBuddies } from '../handlers/search_buddies';

// Test data setup
const testUser1: CreateUserInput = {
  email: 'john@test.com',
  username: 'johngolfer',
  full_name: 'John Doe',
  skill_level: 'intermediate',
  handicap: 15,
  location: 'San Francisco',
  bio: 'Love playing golf on weekends',
  home_course: 'Pebble Beach'
};

const testUser2: CreateUserInput = {
  email: 'jane@test.com',
  username: 'janegolfer',
  full_name: 'Jane Smith',
  skill_level: 'intermediate',
  handicap: 12,
  location: 'San Francisco',
  bio: 'Morning golfer',
  home_course: 'Augusta National'
};

const testUser3: CreateUserInput = {
  email: 'bob@test.com',
  username: 'bobgolfer',
  full_name: 'Bob Wilson',
  skill_level: 'advanced',
  handicap: 8,
  location: 'Los Angeles',
  bio: 'Professional golfer',
  home_course: 'Riviera Country Club'
};

const testUser4: CreateUserInput = {
  email: 'alice@test.com',
  username: 'alicegolfer',
  full_name: 'Alice Johnson',
  skill_level: 'beginner',
  handicap: null,
  location: 'San Francisco',
  bio: 'New to golf',
  home_course: null
};

const testCourse1: CreateCourseInput = {
  name: 'Pebble Beach Golf Links',
  location: 'Pebble Beach, CA',
  description: 'Famous oceanside golf course',
  par: 72
};

const testCourse2: CreateCourseInput = {
  name: 'Golden Gate Park Golf Course',
  location: 'San Francisco, CA',
  description: 'City golf course',
  par: 68
};

describe('searchBuddies', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all users when no filters are applied', async () => {
    // Create test users
    const user1Result = await db.insert(usersTable).values(testUser1).returning().execute();
    const user2Result = await db.insert(usersTable).values(testUser2).returning().execute();
    const user3Result = await db.insert(usersTable).values(testUser3).returning().execute();
    const user4Result = await db.insert(usersTable).values(testUser4).returning().execute();

    const searchInput: SearchBuddiesInput = {};
    const results = await searchBuddies(searchInput);

    expect(results).toHaveLength(4);
    expect(results.map(u => u.username)).toEqual(
      expect.arrayContaining(['johngolfer', 'janegolfer', 'bobgolfer', 'alicegolfer'])
    );
  });

  it('should filter users by location', async () => {
    // Create test users
    await db.insert(usersTable).values(testUser1).returning().execute();
    await db.insert(usersTable).values(testUser2).returning().execute();
    await db.insert(usersTable).values(testUser3).returning().execute();
    await db.insert(usersTable).values(testUser4).returning().execute();

    const searchInput: SearchBuddiesInput = {
      location: 'San Francisco'
    };
    const results = await searchBuddies(searchInput);

    expect(results).toHaveLength(3);
    expect(results.map(u => u.username)).toEqual(
      expect.arrayContaining(['johngolfer', 'janegolfer', 'alicegolfer'])
    );
    expect(results.every(u => u.location === 'San Francisco')).toBe(true);
  });

  it('should filter users by skill level', async () => {
    // Create test users
    await db.insert(usersTable).values(testUser1).returning().execute();
    await db.insert(usersTable).values(testUser2).returning().execute();
    await db.insert(usersTable).values(testUser3).returning().execute();
    await db.insert(usersTable).values(testUser4).returning().execute();

    const searchInput: SearchBuddiesInput = {
      skill_level: 'intermediate'
    };
    const results = await searchBuddies(searchInput);

    expect(results).toHaveLength(2);
    expect(results.map(u => u.username)).toEqual(
      expect.arrayContaining(['johngolfer', 'janegolfer'])
    );
    expect(results.every(u => u.skill_level === 'intermediate')).toBe(true);
  });

  it('should filter users by handicap difference', async () => {
    // Create test users
    await db.insert(usersTable).values(testUser1).returning().execute();
    await db.insert(usersTable).values(testUser2).returning().execute();
    await db.insert(usersTable).values(testUser3).returning().execute();
    await db.insert(usersTable).values(testUser4).returning().execute();

    const searchInput: SearchBuddiesInput = {
      max_handicap_diff: 10
    };
    const results = await searchBuddies(searchInput);

    // Should include Bob (handicap 8) and Alice (null handicap)
    expect(results).toHaveLength(2);
    expect(results.map(u => u.username)).toEqual(
      expect.arrayContaining(['bobgolfer', 'alicegolfer'])
    );
  });

  it('should filter users by favorite course', async () => {
    // Create test users
    const user1Result = await db.insert(usersTable).values(testUser1).returning().execute();
    const user2Result = await db.insert(usersTable).values(testUser2).returning().execute();
    const user3Result = await db.insert(usersTable).values(testUser3).returning().execute();

    // Create test course
    const courseResult = await db.insert(coursesTable).values(testCourse1).returning().execute();
    const courseId = courseResult[0].id;

    // Add favorite course for user1 and user3
    await db.insert(userFavoriteCoursesTable).values({
      user_id: user1Result[0].id,
      course_id: courseId
    }).execute();

    await db.insert(userFavoriteCoursesTable).values({
      user_id: user3Result[0].id,
      course_id: courseId
    }).execute();

    const searchInput: SearchBuddiesInput = {
      course_id: courseId
    };
    const results = await searchBuddies(searchInput);

    expect(results).toHaveLength(2);
    expect(results.map(u => u.username)).toEqual(
      expect.arrayContaining(['johngolfer', 'bobgolfer'])
    );
  });

  it('should filter users by time preference', async () => {
    // Create test users
    const user1Result = await db.insert(usersTable).values(testUser1).returning().execute();
    const user2Result = await db.insert(usersTable).values(testUser2).returning().execute();
    const user3Result = await db.insert(usersTable).values(testUser3).returning().execute();

    // Add time preferences
    await db.insert(userTimePreferencesTable).values({
      user_id: user1Result[0].id,
      time_preference: 'morning'
    }).execute();

    await db.insert(userTimePreferencesTable).values({
      user_id: user2Result[0].id,
      time_preference: 'morning'
    }).execute();

    await db.insert(userTimePreferencesTable).values({
      user_id: user3Result[0].id,
      time_preference: 'evening'
    }).execute();

    const searchInput: SearchBuddiesInput = {
      time_preference: 'morning'
    };
    const results = await searchBuddies(searchInput);

    expect(results).toHaveLength(2);
    expect(results.map(u => u.username)).toEqual(
      expect.arrayContaining(['johngolfer', 'janegolfer'])
    );
  });

  it('should combine multiple filters correctly', async () => {
    // Create test users
    const user1Result = await db.insert(usersTable).values(testUser1).returning().execute();
    const user2Result = await db.insert(usersTable).values(testUser2).returning().execute();
    const user3Result = await db.insert(usersTable).values(testUser3).returning().execute();
    const user4Result = await db.insert(usersTable).values(testUser4).returning().execute();

    // Create test course
    const courseResult = await db.insert(coursesTable).values(testCourse1).returning().execute();
    const courseId = courseResult[0].id;

    // Add favorite course for user1 and user2
    await db.insert(userFavoriteCoursesTable).values({
      user_id: user1Result[0].id,
      course_id: courseId
    }).execute();

    await db.insert(userFavoriteCoursesTable).values({
      user_id: user2Result[0].id,
      course_id: courseId
    }).execute();

    // Add time preferences
    await db.insert(userTimePreferencesTable).values({
      user_id: user1Result[0].id,
      time_preference: 'morning'
    }).execute();

    await db.insert(userTimePreferencesTable).values({
      user_id: user2Result[0].id,
      time_preference: 'morning'
    }).execute();

    // Search for intermediate golfers in San Francisco with specific course and time preference
    const searchInput: SearchBuddiesInput = {
      location: 'San Francisco',
      skill_level: 'intermediate',
      course_id: courseId,
      time_preference: 'morning'
    };
    const results = await searchBuddies(searchInput);

    // Should only return user1 and user2 (both match all criteria)
    expect(results).toHaveLength(2);
    expect(results.map(u => u.username)).toEqual(
      expect.arrayContaining(['johngolfer', 'janegolfer'])
    );
    expect(results.every(u => u.location === 'San Francisco')).toBe(true);
    expect(results.every(u => u.skill_level === 'intermediate')).toBe(true);
  });

  it('should return empty array when no users match criteria', async () => {
    // Create test users
    await db.insert(usersTable).values(testUser1).returning().execute();
    await db.insert(usersTable).values(testUser2).returning().execute();

    const searchInput: SearchBuddiesInput = {
      location: 'New York', // No users in New York
      skill_level: 'pro'     // No pro users
    };
    const results = await searchBuddies(searchInput);

    expect(results).toHaveLength(0);
  });

  it('should handle search with non-existent course', async () => {
    // Create test users
    await db.insert(usersTable).values(testUser1).returning().execute();
    await db.insert(usersTable).values(testUser2).returning().execute();

    const searchInput: SearchBuddiesInput = {
      course_id: 999 // Non-existent course ID
    };
    const results = await searchBuddies(searchInput);

    expect(results).toHaveLength(0);
  });

  it('should handle users with null handicap correctly', async () => {
    // Create test users including one with null handicap
    await db.insert(usersTable).values(testUser4).returning().execute(); // Alice has null handicap

    const searchInput: SearchBuddiesInput = {
      max_handicap_diff: 5
    };
    const results = await searchBuddies(searchInput);

    // Should include Alice (null handicap users are included)
    expect(results).toHaveLength(1);
    expect(results[0].username).toBe('alicegolfer');
    expect(results[0].handicap).toBeNull();
  });
});