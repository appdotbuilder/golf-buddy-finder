import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, conversationsTable } from '../db/schema';
import { type GetConversationsInput } from '../schema';
import { getConversations } from '../handlers/get_conversations';

// Test input
const testInput: GetConversationsInput = {
  user_id: 1
};

describe('getConversations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no conversations', async () => {
    // Create a user but no conversations
    await db.insert(usersTable).values({
      email: 'test@example.com',
      username: 'testuser',
      full_name: 'Test User',
      skill_level: 'beginner',
      location: 'Test City'
    }).execute();

    const result = await getConversations(testInput);

    expect(result).toEqual([]);
  });

  it('should return conversations where user is user1', async () => {
    // Create users
    const users = await db.insert(usersTable).values([
      {
        email: 'user1@example.com',
        username: 'user1',
        full_name: 'User One',
        skill_level: 'beginner',
        location: 'City 1'
      },
      {
        email: 'user2@example.com',
        username: 'user2',
        full_name: 'User Two',
        skill_level: 'intermediate',
        location: 'City 2'
      }
    ]).returning().execute();

    // Create conversation where user1 is user1_id
    const conversation = await db.insert(conversationsTable).values({
      user1_id: users[0].id,
      user2_id: users[1].id
    }).returning().execute();

    const result = await getConversations({ user_id: users[0].id });

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(conversation[0].id);
    expect(result[0].user1_id).toEqual(users[0].id);
    expect(result[0].user2_id).toEqual(users[1].id);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return conversations where user is user2', async () => {
    // Create users
    const users = await db.insert(usersTable).values([
      {
        email: 'user1@example.com',
        username: 'user1',
        full_name: 'User One',
        skill_level: 'beginner',
        location: 'City 1'
      },
      {
        email: 'user2@example.com',
        username: 'user2',
        full_name: 'User Two',
        skill_level: 'intermediate',
        location: 'City 2'
      }
    ]).returning().execute();

    // Create conversation where user2 is user2_id
    const conversation = await db.insert(conversationsTable).values({
      user1_id: users[0].id,
      user2_id: users[1].id
    }).returning().execute();

    const result = await getConversations({ user_id: users[1].id });

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(conversation[0].id);
    expect(result[0].user1_id).toEqual(users[0].id);
    expect(result[0].user2_id).toEqual(users[1].id);
  });

  it('should return multiple conversations for a user', async () => {
    // Create users
    const users = await db.insert(usersTable).values([
      {
        email: 'user1@example.com',
        username: 'user1',
        full_name: 'User One',
        skill_level: 'beginner',
        location: 'City 1'
      },
      {
        email: 'user2@example.com',
        username: 'user2',
        full_name: 'User Two',
        skill_level: 'intermediate',
        location: 'City 2'
      },
      {
        email: 'user3@example.com',
        username: 'user3',
        full_name: 'User Three',
        skill_level: 'advanced',
        location: 'City 3'
      }
    ]).returning().execute();

    // Create multiple conversations involving user1
    await db.insert(conversationsTable).values([
      {
        user1_id: users[0].id,
        user2_id: users[1].id
      },
      {
        user1_id: users[2].id,
        user2_id: users[0].id
      }
    ]).execute();

    const result = await getConversations({ user_id: users[0].id });

    expect(result).toHaveLength(2);
    // Check that all returned conversations involve the target user
    result.forEach(conversation => {
      expect(
        conversation.user1_id === users[0].id || conversation.user2_id === users[0].id
      ).toBe(true);
    });
  });

  it('should order conversations by updated_at descending', async () => {
    // Create users
    const users = await db.insert(usersTable).values([
      {
        email: 'user1@example.com',
        username: 'user1',
        full_name: 'User One',
        skill_level: 'beginner',
        location: 'City 1'
      },
      {
        email: 'user2@example.com',
        username: 'user2',
        full_name: 'User Two',
        skill_level: 'intermediate',
        location: 'City 2'
      },
      {
        email: 'user3@example.com',
        username: 'user3',
        full_name: 'User Three',
        skill_level: 'advanced',
        location: 'City 3'
      }
    ]).returning().execute();

    // Create conversations at different times
    const olderTime = new Date('2023-01-01T10:00:00Z');
    const newerTime = new Date('2023-01-02T10:00:00Z');

    const conversations = await db.insert(conversationsTable).values([
      {
        user1_id: users[0].id,
        user2_id: users[1].id,
        updated_at: olderTime
      },
      {
        user1_id: users[0].id,
        user2_id: users[2].id,
        updated_at: newerTime
      }
    ]).returning().execute();

    const result = await getConversations({ user_id: users[0].id });

    expect(result).toHaveLength(2);
    // Verify ordering by updated_at descending
    expect(result[0].updated_at.getTime()).toBeGreaterThan(result[1].updated_at.getTime());
    expect(result[0].id).toEqual(conversations[1].id); // Newer conversation first
    expect(result[1].id).toEqual(conversations[0].id); // Older conversation second
  });

  it('should not return conversations not involving the user', async () => {
    // Create users
    const users = await db.insert(usersTable).values([
      {
        email: 'user1@example.com',
        username: 'user1',
        full_name: 'User One',
        skill_level: 'beginner',
        location: 'City 1'
      },
      {
        email: 'user2@example.com',
        username: 'user2',
        full_name: 'User Two',
        skill_level: 'intermediate',
        location: 'City 2'
      },
      {
        email: 'user3@example.com',
        username: 'user3',
        full_name: 'User Three',
        skill_level: 'advanced',
        location: 'City 3'
      }
    ]).returning().execute();

    // Create conversation between user2 and user3 (not involving user1)
    await db.insert(conversationsTable).values({
      user1_id: users[1].id,
      user2_id: users[2].id
    }).execute();

    const result = await getConversations({ user_id: users[0].id });

    expect(result).toHaveLength(0);
  });
});