import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUser } from '../handlers/get_user';

// Test user data
const testUserInput: CreateUserInput = {
  email: 'test@example.com',
  username: 'testgolfer',
  full_name: 'Test Golfer',
  skill_level: 'intermediate',
  handicap: 15,
  location: 'San Francisco',
  bio: 'Love playing golf on weekends',
  home_course: 'Pebble Beach'
};

const testUserInput2: CreateUserInput = {
  email: 'jane@example.com',
  username: 'janegolfer',
  full_name: 'Jane Smith',
  skill_level: 'beginner',
  handicap: null,
  location: 'Los Angeles',
  bio: null,
  home_course: null
};

describe('getUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when found', async () => {
    // Create test user
    const insertResult = await db.insert(usersTable)
      .values(testUserInput)
      .returning()
      .execute();
    
    const createdUser = insertResult[0];
    
    // Get user by ID
    const result = await getUser(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.email).toEqual('test@example.com');
    expect(result!.username).toEqual('testgolfer');
    expect(result!.full_name).toEqual('Test Golfer');
    expect(result!.skill_level).toEqual('intermediate');
    expect(result!.handicap).toEqual(15);
    expect(result!.location).toEqual('San Francisco');
    expect(result!.bio).toEqual('Love playing golf on weekends');
    expect(result!.home_course).toEqual('Pebble Beach');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when user not found', async () => {
    const result = await getUser(999);

    expect(result).toBeNull();
  });

  it('should handle user with null values correctly', async () => {
    // Create user with null values
    const insertResult = await db.insert(usersTable)
      .values(testUserInput2)
      .returning()
      .execute();
    
    const createdUser = insertResult[0];
    
    // Get user by ID
    const result = await getUser(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.email).toEqual('jane@example.com');
    expect(result!.username).toEqual('janegolfer');
    expect(result!.full_name).toEqual('Jane Smith');
    expect(result!.skill_level).toEqual('beginner');
    expect(result!.handicap).toBeNull();
    expect(result!.location).toEqual('Los Angeles');
    expect(result!.bio).toBeNull();
    expect(result!.home_course).toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return correct user among multiple users', async () => {
    // Create multiple users
    const user1Result = await db.insert(usersTable)
      .values(testUserInput)
      .returning()
      .execute();
    
    const user2Result = await db.insert(usersTable)
      .values({
        ...testUserInput2,
        email: 'different@example.com',
        username: 'differentuser'
      })
      .returning()
      .execute();

    const user1 = user1Result[0];
    const user2 = user2Result[0];

    // Get first user
    const result1 = await getUser(user1.id);
    expect(result1).not.toBeNull();
    expect(result1!.email).toEqual('test@example.com');
    expect(result1!.username).toEqual('testgolfer');

    // Get second user
    const result2 = await getUser(user2.id);
    expect(result2).not.toBeNull();
    expect(result2!.email).toEqual('different@example.com');
    expect(result2!.username).toEqual('differentuser');
  });

  it('should verify user data is saved correctly in database', async () => {
    // Create test user
    const insertResult = await db.insert(usersTable)
      .values(testUserInput)
      .returning()
      .execute();
    
    const createdUser = insertResult[0];
    
    // Verify data exists in database by querying directly
    const dbUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(dbUsers).toHaveLength(1);
    expect(dbUsers[0].id).toEqual(createdUser.id);
    expect(dbUsers[0].email).toEqual('test@example.com');
    expect(dbUsers[0].skill_level).toEqual('intermediate');
    expect(dbUsers[0].handicap).toEqual(15);

    // Verify handler returns same data
    const handlerResult = await getUser(createdUser.id);
    expect(handlerResult).toEqual(dbUsers[0]);
  });
});