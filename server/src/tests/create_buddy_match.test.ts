import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, buddyMatchesTable } from '../db/schema';
import { type CreateBuddyMatchInput } from '../schema';
import { createBuddyMatch } from '../handlers/create_buddy_match';
import { eq, and, or } from 'drizzle-orm';

describe('createBuddyMatch', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test users
  const createTestUsers = async () => {
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          username: 'user1',
          full_name: 'User One',
          skill_level: 'intermediate',
          handicap: 10,
          location: 'San Francisco'
        },
        {
          email: 'user2@example.com',
          username: 'user2',
          full_name: 'User Two',
          skill_level: 'beginner',
          handicap: null,
          location: 'San Francisco'
        },
        {
          email: 'user3@example.com',
          username: 'user3',
          full_name: 'User Three',
          skill_level: 'advanced',
          handicap: 5,
          location: 'Los Angeles'
        }
      ])
      .returning()
      .execute();

    return users;
  };

  it('should create a buddy match request', async () => {
    const users = await createTestUsers();
    const testInput: CreateBuddyMatchInput = {
      requester_id: users[0].id,
      recipient_id: users[1].id
    };

    const result = await createBuddyMatch(testInput);

    // Verify basic fields
    expect(result.requester_id).toEqual(users[0].id);
    expect(result.recipient_id).toEqual(users[1].id);
    expect(result.status).toEqual('pending');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save buddy match to database', async () => {
    const users = await createTestUsers();
    const testInput: CreateBuddyMatchInput = {
      requester_id: users[0].id,
      recipient_id: users[1].id
    };

    const result = await createBuddyMatch(testInput);

    // Verify it was saved to database
    const savedMatches = await db.select()
      .from(buddyMatchesTable)
      .where(eq(buddyMatchesTable.id, result.id))
      .execute();

    expect(savedMatches).toHaveLength(1);
    expect(savedMatches[0].requester_id).toEqual(users[0].id);
    expect(savedMatches[0].recipient_id).toEqual(users[1].id);
    expect(savedMatches[0].status).toEqual('pending');
    expect(savedMatches[0].created_at).toBeInstanceOf(Date);
    expect(savedMatches[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when user tries to match with themselves', async () => {
    const users = await createTestUsers();
    const testInput: CreateBuddyMatchInput = {
      requester_id: users[0].id,
      recipient_id: users[0].id
    };

    await expect(createBuddyMatch(testInput))
      .rejects.toThrow(/cannot create buddy match with yourself/i);
  });

  it('should throw error when requester does not exist', async () => {
    const users = await createTestUsers();
    const testInput: CreateBuddyMatchInput = {
      requester_id: 999, // Non-existent user ID
      recipient_id: users[0].id
    };

    await expect(createBuddyMatch(testInput))
      .rejects.toThrow(/one or both users not found/i);
  });

  it('should throw error when recipient does not exist', async () => {
    const users = await createTestUsers();
    const testInput: CreateBuddyMatchInput = {
      requester_id: users[0].id,
      recipient_id: 999 // Non-existent user ID
    };

    await expect(createBuddyMatch(testInput))
      .rejects.toThrow(/one or both users not found/i);
  });

  it('should throw error when both users do not exist', async () => {
    const testInput: CreateBuddyMatchInput = {
      requester_id: 998,
      recipient_id: 999
    };

    await expect(createBuddyMatch(testInput))
      .rejects.toThrow(/one or both users not found/i);
  });

  it('should throw error when duplicate request exists (same direction)', async () => {
    const users = await createTestUsers();
    
    // Create initial buddy match
    await db.insert(buddyMatchesTable)
      .values({
        requester_id: users[0].id,
        recipient_id: users[1].id,
        status: 'pending'
      })
      .execute();

    // Try to create duplicate request
    const testInput: CreateBuddyMatchInput = {
      requester_id: users[0].id,
      recipient_id: users[1].id
    };

    await expect(createBuddyMatch(testInput))
      .rejects.toThrow(/buddy match already exists between these users/i);
  });

  it('should throw error when duplicate request exists (reverse direction)', async () => {
    const users = await createTestUsers();
    
    // Create buddy match in one direction
    await db.insert(buddyMatchesTable)
      .values({
        requester_id: users[0].id,
        recipient_id: users[1].id,
        status: 'pending'
      })
      .execute();

    // Try to create request in reverse direction
    const testInput: CreateBuddyMatchInput = {
      requester_id: users[1].id,
      recipient_id: users[0].id
    };

    await expect(createBuddyMatch(testInput))
      .rejects.toThrow(/buddy match already exists between these users/i);
  });

  it('should prevent duplicate requests even with different statuses', async () => {
    const users = await createTestUsers();
    
    // Create accepted buddy match
    await db.insert(buddyMatchesTable)
      .values({
        requester_id: users[0].id,
        recipient_id: users[1].id,
        status: 'accepted'
      })
      .execute();

    // Try to create new request between same users
    const testInput: CreateBuddyMatchInput = {
      requester_id: users[1].id,
      recipient_id: users[0].id
    };

    await expect(createBuddyMatch(testInput))
      .rejects.toThrow(/buddy match already exists between these users/i);
  });

  it('should allow matches between different user pairs', async () => {
    const users = await createTestUsers();

    // Create first buddy match
    const firstMatch = await createBuddyMatch({
      requester_id: users[0].id,
      recipient_id: users[1].id
    });

    // Create second buddy match with different users
    const secondMatch = await createBuddyMatch({
      requester_id: users[0].id,
      recipient_id: users[2].id
    });

    expect(firstMatch.id).not.toEqual(secondMatch.id);
    expect(firstMatch.recipient_id).toEqual(users[1].id);
    expect(secondMatch.recipient_id).toEqual(users[2].id);

    // Verify both exist in database
    const allMatches = await db.select()
      .from(buddyMatchesTable)
      .where(eq(buddyMatchesTable.requester_id, users[0].id))
      .execute();

    expect(allMatches).toHaveLength(2);
  });

  it('should create match with correct default status', async () => {
    const users = await createTestUsers();
    const testInput: CreateBuddyMatchInput = {
      requester_id: users[0].id,
      recipient_id: users[1].id
    };

    const result = await createBuddyMatch(testInput);

    expect(result.status).toEqual('pending');
  });
});