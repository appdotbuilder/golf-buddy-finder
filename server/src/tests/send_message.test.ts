import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, conversationsTable, messagesTable } from '../db/schema';
import { type SendMessageInput } from '../schema';
import { sendMessage } from '../handlers/send_message';
import { eq } from 'drizzle-orm';

// Test data setup
const testUser1 = {
  email: 'user1@test.com',
  username: 'testuser1',
  full_name: 'Test User 1',
  skill_level: 'intermediate' as const,
  handicap: 15,
  location: 'Test City'
};

const testUser2 = {
  email: 'user2@test.com',
  username: 'testuser2',
  full_name: 'Test User 2',
  skill_level: 'beginner' as const,
  handicap: null,
  location: 'Test City'
};

const testUser3 = {
  email: 'user3@test.com',
  username: 'testuser3',
  full_name: 'Test User 3',
  skill_level: 'advanced' as const,
  handicap: 8,
  location: 'Another City'
};

describe('sendMessage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should send a message in an existing conversation', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2])
      .returning()
      .execute();

    const user1Id = users[0].id;
    const user2Id = users[1].id;

    // Create a conversation
    const conversations = await db.insert(conversationsTable)
      .values({
        user1_id: user1Id,
        user2_id: user2Id
      })
      .returning()
      .execute();

    const conversationId = conversations[0].id;

    const testInput: SendMessageInput = {
      conversation_id: conversationId,
      sender_id: user1Id,
      content: 'Hey! Want to play a round this weekend?'
    };

    const result = await sendMessage(testInput);

    // Verify message fields
    expect(result.id).toBeDefined();
    expect(result.conversation_id).toEqual(conversationId);
    expect(result.sender_id).toEqual(user1Id);
    expect(result.content).toEqual('Hey! Want to play a round this weekend?');
    expect(result.status).toEqual('sent');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save message to database', async () => {
    // Create test users and conversation
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2])
      .returning()
      .execute();

    const conversations = await db.insert(conversationsTable)
      .values({
        user1_id: users[0].id,
        user2_id: users[1].id
      })
      .returning()
      .execute();

    const testInput: SendMessageInput = {
      conversation_id: conversations[0].id,
      sender_id: users[0].id,
      content: 'Test message content'
    };

    const result = await sendMessage(testInput);

    // Verify message was saved to database
    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].conversation_id).toEqual(conversations[0].id);
    expect(messages[0].sender_id).toEqual(users[0].id);
    expect(messages[0].content).toEqual('Test message content');
    expect(messages[0].status).toEqual('sent');
  });

  it('should update conversation updated_at timestamp', async () => {
    // Create test users and conversation
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2])
      .returning()
      .execute();

    const conversations = await db.insert(conversationsTable)
      .values({
        user1_id: users[0].id,
        user2_id: users[1].id
      })
      .returning()
      .execute();

    const originalUpdatedAt = conversations[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const testInput: SendMessageInput = {
      conversation_id: conversations[0].id,
      sender_id: users[0].id,
      content: 'This should update the conversation timestamp'
    };

    await sendMessage(testInput);

    // Check that conversation's updated_at was modified
    const updatedConversations = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, conversations[0].id))
      .execute();

    expect(updatedConversations[0].updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should allow user2 to send messages in conversation', async () => {
    // Create test users and conversation
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2])
      .returning()
      .execute();

    const conversations = await db.insert(conversationsTable)
      .values({
        user1_id: users[0].id,
        user2_id: users[1].id
      })
      .returning()
      .execute();

    const testInput: SendMessageInput = {
      conversation_id: conversations[0].id,
      sender_id: users[1].id, // user2 sending message
      content: 'Sure! What time works for you?'
    };

    const result = await sendMessage(testInput);

    expect(result.sender_id).toEqual(users[1].id);
    expect(result.content).toEqual('Sure! What time works for you?');
    expect(result.status).toEqual('sent');
  });

  it('should reject message from non-participant user', async () => {
    // Create test users and conversation between user1 and user2
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2, testUser3])
      .returning()
      .execute();

    const conversations = await db.insert(conversationsTable)
      .values({
        user1_id: users[0].id,
        user2_id: users[1].id
      })
      .returning()
      .execute();

    const testInput: SendMessageInput = {
      conversation_id: conversations[0].id,
      sender_id: users[2].id, // user3 trying to send message in user1-user2 conversation
      content: 'This should not be allowed'
    };

    await expect(sendMessage(testInput)).rejects.toThrow(/conversation not found or sender is not a participant/i);
  });

  it('should reject message for non-existent conversation', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values([testUser1])
      .returning()
      .execute();

    const testInput: SendMessageInput = {
      conversation_id: 99999, // Non-existent conversation ID
      sender_id: users[0].id,
      content: 'This should fail'
    };

    await expect(sendMessage(testInput)).rejects.toThrow(/conversation not found or sender is not a participant/i);
  });

  it('should handle multiple messages in same conversation', async () => {
    // Create test users and conversation
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2])
      .returning()
      .execute();

    const conversations = await db.insert(conversationsTable)
      .values({
        user1_id: users[0].id,
        user2_id: users[1].id
      })
      .returning()
      .execute();

    // Send multiple messages
    const message1Input: SendMessageInput = {
      conversation_id: conversations[0].id,
      sender_id: users[0].id,
      content: 'First message'
    };

    const message2Input: SendMessageInput = {
      conversation_id: conversations[0].id,
      sender_id: users[1].id,
      content: 'Second message'
    };

    const result1 = await sendMessage(message1Input);
    const result2 = await sendMessage(message2Input);

    // Verify both messages exist and have different IDs
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.content).toEqual('First message');
    expect(result2.content).toEqual('Second message');

    // Verify both messages are in database
    const allMessages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.conversation_id, conversations[0].id))
      .execute();

    expect(allMessages).toHaveLength(2);
  });
});