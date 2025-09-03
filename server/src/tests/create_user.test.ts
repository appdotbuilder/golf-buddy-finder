import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input data
const testUserInput: CreateUserInput = {
  email: 'test@example.com',
  username: 'testgolfer',
  full_name: 'Test Golfer',
  skill_level: 'intermediate',
  handicap: 15,
  location: 'San Francisco, CA',
  bio: 'Love playing golf on weekends',
  home_course: 'Pebble Beach Golf Links'
};

const beginnerUserInput: CreateUserInput = {
  email: 'beginner@example.com',
  username: 'newgolfer',
  full_name: 'New Golfer',
  skill_level: 'beginner',
  handicap: null, // Beginners may not have handicap
  location: 'Los Angeles, CA',
  bio: null,
  home_course: null
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with all fields', async () => {
    const result = await createUser(testUserInput);

    // Verify basic fields
    expect(result.email).toEqual('test@example.com');
    expect(result.username).toEqual('testgolfer');
    expect(result.full_name).toEqual('Test Golfer');
    expect(result.skill_level).toEqual('intermediate');
    expect(result.handicap).toEqual(15);
    expect(result.location).toEqual('San Francisco, CA');
    expect(result.bio).toEqual('Love playing golf on weekends');
    expect(result.home_course).toEqual('Pebble Beach Golf Links');
    
    // Verify auto-generated fields
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a beginner user with nullable fields', async () => {
    const result = await createUser(beginnerUserInput);

    // Verify basic fields
    expect(result.email).toEqual('beginner@example.com');
    expect(result.username).toEqual('newgolfer');
    expect(result.full_name).toEqual('New Golfer');
    expect(result.skill_level).toEqual('beginner');
    expect(result.handicap).toBeNull();
    expect(result.location).toEqual('Los Angeles, CA');
    expect(result.bio).toBeNull();
    expect(result.home_course).toBeNull();
    
    // Verify auto-generated fields
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testUserInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].username).toEqual('testgolfer');
    expect(users[0].full_name).toEqual('Test Golfer');
    expect(users[0].skill_level).toEqual('intermediate');
    expect(users[0].handicap).toEqual(15);
    expect(users[0].location).toEqual('San Francisco, CA');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for duplicate email', async () => {
    // Create first user
    await createUser(testUserInput);

    // Try to create another user with same email
    const duplicateEmailInput: CreateUserInput = {
      ...testUserInput,
      username: 'different_username' // Different username
    };

    await expect(createUser(duplicateEmailInput)).rejects.toThrow(/email already exists/i);
  });

  it('should throw error for duplicate username', async () => {
    // Create first user
    await createUser(testUserInput);

    // Try to create another user with same username
    const duplicateUsernameInput: CreateUserInput = {
      ...testUserInput,
      email: 'different@example.com' // Different email
    };

    await expect(createUser(duplicateUsernameInput)).rejects.toThrow(/username already exists/i);
  });

  it('should throw error for duplicate email and username', async () => {
    // Create first user
    await createUser(testUserInput);

    // Try to create another user with same email and username
    await expect(createUser(testUserInput)).rejects.toThrow(/email and username already exist/i);
  });

  it('should create multiple users with unique credentials', async () => {
    // Create first user
    const user1 = await createUser(testUserInput);

    // Create second user with different credentials
    const user2Input: CreateUserInput = {
      email: 'user2@example.com',
      username: 'user2golfer',
      full_name: 'Second Golfer',
      skill_level: 'advanced',
      handicap: 8,
      location: 'Phoenix, AZ',
      bio: 'Competitive golfer',
      home_course: 'TPC Scottsdale'
    };

    const user2 = await createUser(user2Input);

    // Verify both users exist with different IDs
    expect(user1.id).not.toEqual(user2.id);
    expect(user1.email).toEqual('test@example.com');
    expect(user2.email).toEqual('user2@example.com');

    // Verify both users are in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(2);
  });

  it('should handle all skill levels correctly', async () => {
    const skillLevels = ['beginner', 'intermediate', 'advanced', 'pro'] as const;
    
    for (const skillLevel of skillLevels) {
      const userInput: CreateUserInput = {
        email: `${skillLevel}@example.com`,
        username: `${skillLevel}golfer`,
        full_name: `${skillLevel} Golfer`,
        skill_level: skillLevel,
        handicap: skillLevel === 'beginner' ? null : 10,
        location: 'Test Location',
        bio: null,
        home_course: null
      };

      const result = await createUser(userInput);
      expect(result.skill_level).toEqual(skillLevel);
    }

    // Verify all users were created
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(4);
  });
});