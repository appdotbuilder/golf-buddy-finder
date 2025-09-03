import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, buddyMatchesTable, conversationsTable } from '../db/schema';
import { type UpdateBuddyMatchStatusInput } from '../schema';
import { updateBuddyMatchStatus } from '../handlers/update_buddy_match_status';
import { eq, and } from 'drizzle-orm';

describe('updateBuddyMatchStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update buddy match status to accepted', async () => {
    // Create test users first
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'requester@test.com',
          username: 'requester',
          full_name: 'Test Requester',
          skill_level: 'intermediate',
          location: 'Test City',
          handicap: 15
        },
        {
          email: 'recipient@test.com',
          username: 'recipient',
          full_name: 'Test Recipient',
          skill_level: 'intermediate',
          location: 'Test City',
          handicap: 12
        }
      ])
      .returning()
      .execute();

    // Create a pending buddy match
    const buddyMatch = await db.insert(buddyMatchesTable)
      .values({
        requester_id: users[0].id,
        recipient_id: users[1].id,
        status: 'pending'
      })
      .returning()
      .execute();

    const input: UpdateBuddyMatchStatusInput = {
      id: buddyMatch[0].id,
      status: 'accepted'
    };

    const result = await updateBuddyMatchStatus(input);

    expect(result.id).toEqual(buddyMatch[0].id);
    expect(result.status).toEqual('accepted');
    expect(result.requester_id).toEqual(users[0].id);
    expect(result.recipient_id).toEqual(users[1].id);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > result.created_at).toBe(true);
  });

  it('should update buddy match status to declined', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'requester2@test.com',
          username: 'requester2',
          full_name: 'Test Requester 2',
          skill_level: 'beginner',
          location: 'Test City',
          handicap: null
        },
        {
          email: 'recipient2@test.com',
          username: 'recipient2',
          full_name: 'Test Recipient 2',
          skill_level: 'advanced',
          location: 'Test City',
          handicap: 8
        }
      ])
      .returning()
      .execute();

    // Create a pending buddy match
    const buddyMatch = await db.insert(buddyMatchesTable)
      .values({
        requester_id: users[0].id,
        recipient_id: users[1].id,
        status: 'pending'
      })
      .returning()
      .execute();

    const input: UpdateBuddyMatchStatusInput = {
      id: buddyMatch[0].id,
      status: 'declined'
    };

    const result = await updateBuddyMatchStatus(input);

    expect(result.status).toEqual('declined');
    expect(result.id).toEqual(buddyMatch[0].id);
  });

  it('should create conversation when status is accepted', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'user1@test.com',
          username: 'user1',
          full_name: 'User One',
          skill_level: 'pro',
          location: 'Golf City',
          handicap: 5
        },
        {
          email: 'user2@test.com',
          username: 'user2',
          full_name: 'User Two',
          skill_level: 'pro',
          location: 'Golf City',
          handicap: 4
        }
      ])
      .returning()
      .execute();

    // Create a pending buddy match
    const buddyMatch = await db.insert(buddyMatchesTable)
      .values({
        requester_id: users[0].id,
        recipient_id: users[1].id,
        status: 'pending'
      })
      .returning()
      .execute();

    const input: UpdateBuddyMatchStatusInput = {
      id: buddyMatch[0].id,
      status: 'accepted'
    };

    await updateBuddyMatchStatus(input);

    // Verify conversation was created
    const conversations = await db.select()
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.user1_id, users[0].id),
          eq(conversationsTable.user2_id, users[1].id)
        )
      )
      .execute();

    expect(conversations).toHaveLength(1);
    expect(conversations[0].user1_id).toEqual(users[0].id);
    expect(conversations[0].user2_id).toEqual(users[1].id);
  });

  it('should not create duplicate conversation when one already exists', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'existing1@test.com',
          username: 'existing1',
          full_name: 'Existing User 1',
          skill_level: 'intermediate',
          location: 'Test Location',
          handicap: 10
        },
        {
          email: 'existing2@test.com',
          username: 'existing2',
          full_name: 'Existing User 2',
          skill_level: 'intermediate',
          location: 'Test Location',
          handicap: 11
        }
      ])
      .returning()
      .execute();

    // Create an existing conversation
    await db.insert(conversationsTable)
      .values({
        user1_id: users[0].id,
        user2_id: users[1].id
      })
      .execute();

    // Create a pending buddy match
    const buddyMatch = await db.insert(buddyMatchesTable)
      .values({
        requester_id: users[0].id,
        recipient_id: users[1].id,
        status: 'pending'
      })
      .returning()
      .execute();

    const input: UpdateBuddyMatchStatusInput = {
      id: buddyMatch[0].id,
      status: 'accepted'
    };

    await updateBuddyMatchStatus(input);

    // Verify only one conversation exists
    const conversations = await db.select()
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.user1_id, users[0].id),
          eq(conversationsTable.user2_id, users[1].id)
        )
      )
      .execute();

    expect(conversations).toHaveLength(1);
  });

  it('should not create duplicate conversation when reverse conversation exists', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'reverse1@test.com',
          username: 'reverse1',
          full_name: 'Reverse User 1',
          skill_level: 'advanced',
          location: 'Reverse City',
          handicap: 7
        },
        {
          email: 'reverse2@test.com',
          username: 'reverse2',
          full_name: 'Reverse User 2',
          skill_level: 'advanced',
          location: 'Reverse City',
          handicap: 9
        }
      ])
      .returning()
      .execute();

    // Create an existing conversation in reverse order
    await db.insert(conversationsTable)
      .values({
        user1_id: users[1].id, // Note: reversed
        user2_id: users[0].id  // Note: reversed
      })
      .execute();

    // Create a pending buddy match
    const buddyMatch = await db.insert(buddyMatchesTable)
      .values({
        requester_id: users[0].id,
        recipient_id: users[1].id,
        status: 'pending'
      })
      .returning()
      .execute();

    const input: UpdateBuddyMatchStatusInput = {
      id: buddyMatch[0].id,
      status: 'accepted'
    };

    await updateBuddyMatchStatus(input);

    // Verify no new conversation was created
    const allConversations = await db.select()
      .from(conversationsTable)
      .execute();

    expect(allConversations).toHaveLength(1);
  });

  it('should not create conversation when status is declined', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'decline1@test.com',
          username: 'decline1',
          full_name: 'Decline User 1',
          skill_level: 'beginner',
          location: 'Decline City',
          handicap: null
        },
        {
          email: 'decline2@test.com',
          username: 'decline2',
          full_name: 'Decline User 2',
          skill_level: 'intermediate',
          location: 'Decline City',
          handicap: 18
        }
      ])
      .returning()
      .execute();

    // Create a pending buddy match
    const buddyMatch = await db.insert(buddyMatchesTable)
      .values({
        requester_id: users[0].id,
        recipient_id: users[1].id,
        status: 'pending'
      })
      .returning()
      .execute();

    const input: UpdateBuddyMatchStatusInput = {
      id: buddyMatch[0].id,
      status: 'declined'
    };

    await updateBuddyMatchStatus(input);

    // Verify no conversation was created
    const conversations = await db.select()
      .from(conversationsTable)
      .execute();

    expect(conversations).toHaveLength(0);
  });

  it('should throw error when buddy match does not exist', async () => {
    const input: UpdateBuddyMatchStatusInput = {
      id: 999999, // Non-existent ID
      status: 'accepted'
    };

    await expect(updateBuddyMatchStatus(input))
      .rejects.toThrow(/not found or not in pending status/i);
  });

  it('should throw error when buddy match is not in pending status', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'nonpending1@test.com',
          username: 'nonpending1',
          full_name: 'Non Pending 1',
          skill_level: 'intermediate',
          location: 'Test City',
          handicap: 12
        },
        {
          email: 'nonpending2@test.com',
          username: 'nonpending2',
          full_name: 'Non Pending 2',
          skill_level: 'intermediate',
          location: 'Test City',
          handicap: 14
        }
      ])
      .returning()
      .execute();

    // Create an already accepted buddy match
    const buddyMatch = await db.insert(buddyMatchesTable)
      .values({
        requester_id: users[0].id,
        recipient_id: users[1].id,
        status: 'accepted' // Already accepted
      })
      .returning()
      .execute();

    const input: UpdateBuddyMatchStatusInput = {
      id: buddyMatch[0].id,
      status: 'declined'
    };

    await expect(updateBuddyMatchStatus(input))
      .rejects.toThrow(/not found or not in pending status/i);
  });

  it('should persist changes in database', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'persist1@test.com',
          username: 'persist1',
          full_name: 'Persist User 1',
          skill_level: 'pro',
          location: 'Persist City',
          handicap: 2
        },
        {
          email: 'persist2@test.com',
          username: 'persist2',
          full_name: 'Persist User 2',
          skill_level: 'pro',
          location: 'Persist City',
          handicap: 3
        }
      ])
      .returning()
      .execute();

    // Create a pending buddy match
    const buddyMatch = await db.insert(buddyMatchesTable)
      .values({
        requester_id: users[0].id,
        recipient_id: users[1].id,
        status: 'pending'
      })
      .returning()
      .execute();

    const input: UpdateBuddyMatchStatusInput = {
      id: buddyMatch[0].id,
      status: 'accepted'
    };

    await updateBuddyMatchStatus(input);

    // Verify the change was persisted in the database
    const updatedMatch = await db.select()
      .from(buddyMatchesTable)
      .where(eq(buddyMatchesTable.id, buddyMatch[0].id))
      .execute();

    expect(updatedMatch).toHaveLength(1);
    expect(updatedMatch[0].status).toEqual('accepted');
    expect(updatedMatch[0].updated_at > updatedMatch[0].created_at).toBe(true);
  });
});