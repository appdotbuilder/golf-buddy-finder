import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, userTimePreferencesTable } from '../db/schema';
import { type AddTimePreferenceInput } from '../schema';
import { addTimePreference } from '../handlers/add_time_preference';
import { eq, and } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'golfer@example.com',
  username: 'testgolfer',
  full_name: 'Test Golfer',
  skill_level: 'intermediate' as const,
  handicap: 12,
  location: 'San Francisco, CA',
  bio: 'Love playing golf on weekends',
  home_course: 'Pebble Beach'
};

describe('addTimePreference', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should add a time preference for an existing user', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    const input: AddTimePreferenceInput = {
      user_id: userId,
      time_preference: 'morning'
    };

    const result = await addTimePreference(input);

    // Verify the returned data
    expect(result.user_id).toBe(userId);
    expect(result.time_preference).toBe('morning');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save time preference to database', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    const input: AddTimePreferenceInput = {
      user_id: userId,
      time_preference: 'evening'
    };

    const result = await addTimePreference(input);

    // Query the database to verify it was saved
    const preferences = await db.select()
      .from(userTimePreferencesTable)
      .where(eq(userTimePreferencesTable.id, result.id))
      .execute();

    expect(preferences).toHaveLength(1);
    expect(preferences[0].user_id).toBe(userId);
    expect(preferences[0].time_preference).toBe('evening');
    expect(preferences[0].created_at).toBeInstanceOf(Date);
  });

  it('should allow multiple different time preferences for the same user', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Add first time preference
    const input1: AddTimePreferenceInput = {
      user_id: userId,
      time_preference: 'morning'
    };

    const result1 = await addTimePreference(input1);

    // Add second time preference
    const input2: AddTimePreferenceInput = {
      user_id: userId,
      time_preference: 'weekend'
    };

    const result2 = await addTimePreference(input2);

    // Verify both preferences were created
    expect(result1.time_preference).toBe('morning');
    expect(result2.time_preference).toBe('weekend');
    expect(result1.id).not.toBe(result2.id);

    // Query database to confirm both exist
    const allPreferences = await db.select()
      .from(userTimePreferencesTable)
      .where(eq(userTimePreferencesTable.user_id, userId))
      .execute();

    expect(allPreferences).toHaveLength(2);
    expect(allPreferences.map(p => p.time_preference).sort()).toEqual(['morning', 'weekend']);
  });

  it('should throw error for non-existent user', async () => {
    const input: AddTimePreferenceInput = {
      user_id: 99999, // Non-existent user ID
      time_preference: 'morning'
    };

    await expect(addTimePreference(input)).rejects.toThrow(/User with id 99999 not found/i);
  });

  it('should prevent duplicate time preferences for the same user', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    const input: AddTimePreferenceInput = {
      user_id: userId,
      time_preference: 'afternoon'
    };

    // Add time preference first time
    await addTimePreference(input);

    // Try to add the same time preference again
    await expect(addTimePreference(input)).rejects.toThrow(/Time preference 'afternoon' already exists for user/i);
  });

  it('should handle all valid time preference values', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    const timePreferences = ['morning', 'afternoon', 'evening', 'weekend'] as const;

    for (const timePreference of timePreferences) {
      const input: AddTimePreferenceInput = {
        user_id: userId,
        time_preference: timePreference
      };

      const result = await addTimePreference(input);
      expect(result.time_preference).toBe(timePreference);
      expect(result.user_id).toBe(userId);
    }

    // Verify all preferences were saved
    const allPreferences = await db.select()
      .from(userTimePreferencesTable)
      .where(eq(userTimePreferencesTable.user_id, userId))
      .execute();

    expect(allPreferences).toHaveLength(4);
    expect(allPreferences.map(p => p.time_preference).sort()).toEqual(['afternoon', 'evening', 'morning', 'weekend']);
  });
});