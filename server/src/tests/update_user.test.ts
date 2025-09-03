import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type CreateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Helper function to create a test user
const createTestUser = async (): Promise<number> => {
  const testUser: CreateUserInput = {
    email: 'test@example.com',
    username: 'testuser',
    full_name: 'Test User',
    skill_level: 'beginner',
    handicap: null,
    location: 'Test City',
    bio: 'Test bio',
    home_course: 'Test Course'
  };

  const result = await db.insert(usersTable)
    .values(testUser)
    .returning()
    .execute();

  return result[0].id;
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update all user fields', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      email: 'updated@example.com',
      username: 'updateduser',
      full_name: 'Updated User',
      skill_level: 'intermediate',
      handicap: 15,
      location: 'Updated City',
      bio: 'Updated bio',
      home_course: 'Updated Course'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.email).toEqual('updated@example.com');
    expect(result.username).toEqual('updateduser');
    expect(result.full_name).toEqual('Updated User');
    expect(result.skill_level).toEqual('intermediate');
    expect(result.handicap).toEqual(15);
    expect(result.location).toEqual('Updated City');
    expect(result.bio).toEqual('Updated bio');
    expect(result.home_course).toEqual('Updated Course');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields', async () => {
    const userId = await createTestUser();

    const partialUpdate: UpdateUserInput = {
      id: userId,
      email: 'newemail@example.com',
      skill_level: 'advanced'
    };

    const result = await updateUser(partialUpdate);

    expect(result.id).toEqual(userId);
    expect(result.email).toEqual('newemail@example.com');
    expect(result.skill_level).toEqual('advanced');
    // Other fields should remain unchanged
    expect(result.username).toEqual('testuser');
    expect(result.full_name).toEqual('Test User');
    expect(result.location).toEqual('Test City');
    expect(result.bio).toEqual('Test bio');
    expect(result.home_course).toEqual('Test Course');
  });

  it('should handle nullable fields correctly', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      handicap: 20,
      bio: null,
      home_course: null
    };

    const result = await updateUser(updateInput);

    expect(result.handicap).toEqual(20);
    expect(result.bio).toBeNull();
    expect(result.home_course).toBeNull();
  });

  it('should update the updated_at timestamp', async () => {
    const userId = await createTestUser();

    // Get original timestamp
    const originalUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    const originalTimestamp = originalUser[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateUserInput = {
      id: userId,
      username: 'newtestuser'
    };

    const result = await updateUser(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalTimestamp.getTime());
  });

  it('should persist changes to database', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      email: 'persistent@example.com',
      skill_level: 'pro'
    };

    await updateUser(updateInput);

    // Verify changes in database
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(updatedUser).toHaveLength(1);
    expect(updatedUser[0].email).toEqual('persistent@example.com');
    expect(updatedUser[0].skill_level).toEqual('pro');
  });

  it('should throw error for non-existent user', async () => {
    const updateInput: UpdateUserInput = {
      id: 99999,
      username: 'nonexistent'
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/User with id 99999 not found/i);
  });

  it('should handle empty update gracefully', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    // All original values should remain
    expect(result.email).toEqual('test@example.com');
    expect(result.username).toEqual('testuser');
    expect(result.full_name).toEqual('Test User');
    // But updated_at should be changed
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});