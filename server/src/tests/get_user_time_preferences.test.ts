import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, userTimePreferencesTable } from '../db/schema';
import { getUserTimePreferences } from '../handlers/get_user_time_preferences';

describe('getUserTimePreferences', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no time preferences', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        skill_level: 'beginner',
        handicap: null,
        location: 'Test City',
        bio: null,
        home_course: null
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const result = await getUserTimePreferences(userId);

    expect(result).toEqual([]);
  });

  it('should return all time preferences for a user', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        skill_level: 'intermediate',
        handicap: 15,
        location: 'Test City',
        bio: 'Test bio',
        home_course: 'Test Course'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Add multiple time preferences for the user
    await db.insert(userTimePreferencesTable)
      .values([
        {
          user_id: userId,
          time_preference: 'morning'
        },
        {
          user_id: userId,
          time_preference: 'evening'
        },
        {
          user_id: userId,
          time_preference: 'weekend'
        }
      ])
      .execute();

    const result = await getUserTimePreferences(userId);

    expect(result).toHaveLength(3);
    
    // Check that all time preferences are returned
    const timePrefs = result.map(pref => pref.time_preference).sort();
    expect(timePrefs).toEqual(['evening', 'morning', 'weekend']);

    // Verify all records have the correct user_id
    result.forEach(pref => {
      expect(pref.user_id).toEqual(userId);
      expect(pref.id).toBeDefined();
      expect(pref.created_at).toBeInstanceOf(Date);
    });
  });

  it('should only return preferences for the specified user', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        username: 'user1',
        full_name: 'User One',
        skill_level: 'beginner',
        handicap: null,
        location: 'City A',
        bio: null,
        home_course: null
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        username: 'user2',
        full_name: 'User Two',
        skill_level: 'advanced',
        handicap: 5,
        location: 'City B',
        bio: 'Advanced golfer',
        home_course: 'Pro Course'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Add time preferences for both users
    await db.insert(userTimePreferencesTable)
      .values([
        {
          user_id: user1Id,
          time_preference: 'morning'
        },
        {
          user_id: user1Id,
          time_preference: 'afternoon'
        },
        {
          user_id: user2Id,
          time_preference: 'evening'
        },
        {
          user_id: user2Id,
          time_preference: 'weekend'
        }
      ])
      .execute();

    // Get preferences for user1 only
    const user1Prefs = await getUserTimePreferences(user1Id);
    
    expect(user1Prefs).toHaveLength(2);
    user1Prefs.forEach(pref => {
      expect(pref.user_id).toEqual(user1Id);
    });

    const user1TimePrefs = user1Prefs.map(pref => pref.time_preference).sort();
    expect(user1TimePrefs).toEqual(['afternoon', 'morning']);

    // Get preferences for user2 only
    const user2Prefs = await getUserTimePreferences(user2Id);
    
    expect(user2Prefs).toHaveLength(2);
    user2Prefs.forEach(pref => {
      expect(pref.user_id).toEqual(user2Id);
    });

    const user2TimePrefs = user2Prefs.map(pref => pref.time_preference).sort();
    expect(user2TimePrefs).toEqual(['evening', 'weekend']);
  });

  it('should return empty array for non-existent user', async () => {
    const nonExistentUserId = 99999;

    const result = await getUserTimePreferences(nonExistentUserId);

    expect(result).toEqual([]);
  });

  it('should handle single time preference correctly', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'single@example.com',
        username: 'singleuser',
        full_name: 'Single User',
        skill_level: 'pro',
        handicap: 2,
        location: 'Pro City',
        bio: 'Professional golfer',
        home_course: 'Championship Course'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Add single time preference
    await db.insert(userTimePreferencesTable)
      .values({
        user_id: userId,
        time_preference: 'afternoon'
      })
      .execute();

    const result = await getUserTimePreferences(userId);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(userId);
    expect(result[0].time_preference).toEqual('afternoon');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
  });
});