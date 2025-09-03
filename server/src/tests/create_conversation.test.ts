import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { conversationsTable, usersTable } from '../db/schema';
import { type CreateConversationInput } from '../schema';
import { createConversation } from '../handlers/create_conversation';
import { eq, and } from 'drizzle-orm';

describe('createConversation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let user1Id: number;
  let user2Id: number;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'user1@test.com',
          username: 'user1',
          full_name: 'User One',
          skill_level: 'intermediate',
          handicap: 10,
          location: 'Test City'
        },
        {
          email: 'user2@test.com',
          username: 'user2',
          full_name: 'User Two',
          skill_level: 'beginner',
          handicap: null,
          location: 'Test City'
        }
      ])
      .returning()
      .execute();

    user1Id = users[0].id;
    user2Id = users[1].id;
  });

  it('should create a conversation between two users', async () => {
    const input: CreateConversationInput = {
      user1_id: user1Id,
      user2_id: user2Id
    };

    const result = await createConversation(input);

    // Basic field validation
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.user1_id).toBe(Math.min(user1Id, user2Id));
    expect(result.user2_id).toBe(Math.max(user1Id, user2Id));
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should normalize user IDs (smaller ID as user1_id)', async () => {
    // Test with user2_id as first parameter (higher ID)
    const input: CreateConversationInput = {
      user1_id: user2Id, // Higher ID
      user2_id: user1Id  // Lower ID
    };

    const result = await createConversation(input);

    // Should normalize so smaller ID is user1_id
    expect(result.user1_id).toBe(Math.min(user1Id, user2Id));
    expect(result.user2_id).toBe(Math.max(user1Id, user2Id));
  });

  it('should save conversation to database', async () => {
    const input: CreateConversationInput = {
      user1_id: user1Id,
      user2_id: user2Id
    };

    const result = await createConversation(input);

    // Verify conversation was saved to database
    const conversations = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, result.id))
      .execute();

    expect(conversations).toHaveLength(1);
    expect(conversations[0].user1_id).toBe(Math.min(user1Id, user2Id));
    expect(conversations[0].user2_id).toBe(Math.max(user1Id, user2Id));
    expect(conversations[0].created_at).toBeInstanceOf(Date);
    expect(conversations[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return existing conversation if one already exists', async () => {
    // Create initial conversation
    const input: CreateConversationInput = {
      user1_id: user1Id,
      user2_id: user2Id
    };

    const firstResult = await createConversation(input);

    // Try to create the same conversation again (with reversed user IDs)
    const secondInput: CreateConversationInput = {
      user1_id: user2Id,
      user2_id: user1Id
    };

    const secondResult = await createConversation(secondInput);

    // Should return the same conversation
    expect(secondResult.id).toBe(firstResult.id);
    expect(secondResult.user1_id).toBe(firstResult.user1_id);
    expect(secondResult.user2_id).toBe(firstResult.user2_id);

    // Verify only one conversation exists in database
    const allConversations = await db.select()
      .from(conversationsTable)
      .where(and(
        eq(conversationsTable.user1_id, Math.min(user1Id, user2Id)),
        eq(conversationsTable.user2_id, Math.max(user1Id, user2Id))
      ))
      .execute();

    expect(allConversations).toHaveLength(1);
  });

  it('should throw error when user1_id does not exist', async () => {
    const input: CreateConversationInput = {
      user1_id: 99999, // Non-existent user
      user2_id: user2Id
    };

    await expect(createConversation(input)).rejects.toThrow(/one or both users do not exist/i);
  });

  it('should throw error when user2_id does not exist', async () => {
    const input: CreateConversationInput = {
      user1_id: user1Id,
      user2_id: 99999 // Non-existent user
    };

    await expect(createConversation(input)).rejects.toThrow(/one or both users do not exist/i);
  });

  it('should throw error when both users do not exist', async () => {
    const input: CreateConversationInput = {
      user1_id: 99998,
      user2_id: 99999
    };

    await expect(createConversation(input)).rejects.toThrow(/one or both users do not exist/i);
  });

  it('should throw error when trying to create conversation with same user', async () => {
    const input: CreateConversationInput = {
      user1_id: user1Id,
      user2_id: user1Id
    };

    await expect(createConversation(input)).rejects.toThrow(/cannot create conversation with yourself/i);
  });

  it('should handle database constraints properly', async () => {
    const input: CreateConversationInput = {
      user1_id: user1Id,
      user2_id: user2Id
    };

    const result = await createConversation(input);

    // Verify the conversation has proper foreign key relationships
    const conversationWithUsers = await db.select({
      id: conversationsTable.id,
      user1_id: conversationsTable.user1_id,
      user2_id: conversationsTable.user2_id
    })
      .from(conversationsTable)
      .where(eq(conversationsTable.id, result.id))
      .execute();

    expect(conversationWithUsers).toHaveLength(1);
    expect(conversationWithUsers[0].user1_id).toBe(Math.min(user1Id, user2Id));
    expect(conversationWithUsers[0].user2_id).toBe(Math.max(user1Id, user2Id));
  });
});