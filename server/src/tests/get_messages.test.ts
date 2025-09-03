import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, conversationsTable, messagesTable } from '../db/schema';
import { type GetMessagesInput } from '../schema';
import { getMessages } from '../handlers/get_messages';
import { eq } from 'drizzle-orm';

// Test data setup
const createTestUser = async (email: string, username: string) => {
  const result = await db.insert(usersTable)
    .values({
      email,
      username,
      full_name: `Test User ${username}`,
      skill_level: 'intermediate',
      location: 'Test City',
      handicap: 10
    })
    .returning()
    .execute();
  return result[0];
};

const createTestConversation = async (user1_id: number, user2_id: number) => {
  const result = await db.insert(conversationsTable)
    .values({
      user1_id,
      user2_id
    })
    .returning()
    .execute();
  return result[0];
};

const createTestMessage = async (conversation_id: number, sender_id: number, content: string, delay_ms = 0) => {
  // Add a small delay to ensure different timestamps for ordering tests
  if (delay_ms > 0) {
    await new Promise(resolve => setTimeout(resolve, delay_ms));
  }
  
  const result = await db.insert(messagesTable)
    .values({
      conversation_id,
      sender_id,
      content,
      status: 'sent'
    })
    .returning()
    .execute();
  return result[0];
};

describe('getMessages', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get messages from a conversation', async () => {
    // Create test users
    const user1 = await createTestUser('user1@test.com', 'user1');
    const user2 = await createTestUser('user2@test.com', 'user2');
    
    // Create conversation
    const conversation = await createTestConversation(user1.id, user2.id);
    
    // Create messages
    const message1 = await createTestMessage(conversation.id, user1.id, 'Hello there!');
    const message2 = await createTestMessage(conversation.id, user2.id, 'Hi back!', 10);
    
    const input: GetMessagesInput = {
      conversation_id: conversation.id
    };

    const result = await getMessages(input);

    expect(result).toHaveLength(2);
    
    // Verify message content
    expect(result[0].id).toEqual(message1.id);
    expect(result[0].content).toEqual('Hello there!');
    expect(result[0].sender_id).toEqual(user1.id);
    expect(result[0].conversation_id).toEqual(conversation.id);
    expect(result[0].status).toEqual('sent');
    expect(result[0].created_at).toBeInstanceOf(Date);
    
    expect(result[1].id).toEqual(message2.id);
    expect(result[1].content).toEqual('Hi back!');
    expect(result[1].sender_id).toEqual(user2.id);
  });

  it('should return messages in chronological order (oldest first)', async () => {
    // Create test users
    const user1 = await createTestUser('user1@test.com', 'user1');
    const user2 = await createTestUser('user2@test.com', 'user2');
    
    // Create conversation
    const conversation = await createTestConversation(user1.id, user2.id);
    
    // Create messages with delays to ensure different timestamps
    const message1 = await createTestMessage(conversation.id, user1.id, 'First message');
    const message2 = await createTestMessage(conversation.id, user2.id, 'Second message', 10);
    const message3 = await createTestMessage(conversation.id, user1.id, 'Third message', 10);
    
    const input: GetMessagesInput = {
      conversation_id: conversation.id
    };

    const result = await getMessages(input);

    expect(result).toHaveLength(3);
    
    // Verify chronological order (oldest first)
    expect(result[0].content).toEqual('First message');
    expect(result[1].content).toEqual('Second message');
    expect(result[2].content).toEqual('Third message');
    
    // Verify timestamps are in ascending order
    expect(result[0].created_at <= result[1].created_at).toBe(true);
    expect(result[1].created_at <= result[2].created_at).toBe(true);
  });

  it('should support pagination with limit', async () => {
    // Create test users
    const user1 = await createTestUser('user1@test.com', 'user1');
    const user2 = await createTestUser('user2@test.com', 'user2');
    
    // Create conversation
    const conversation = await createTestConversation(user1.id, user2.id);
    
    // Create multiple messages
    await createTestMessage(conversation.id, user1.id, 'Message 1');
    await createTestMessage(conversation.id, user2.id, 'Message 2', 5);
    await createTestMessage(conversation.id, user1.id, 'Message 3', 5);
    await createTestMessage(conversation.id, user2.id, 'Message 4', 5);
    
    const input: GetMessagesInput = {
      conversation_id: conversation.id,
      limit: 2
    };

    const result = await getMessages(input);

    expect(result).toHaveLength(2);
    expect(result[0].content).toEqual('Message 1');
    expect(result[1].content).toEqual('Message 2');
  });

  it('should support pagination with offset', async () => {
    // Create test users
    const user1 = await createTestUser('user1@test.com', 'user1');
    const user2 = await createTestUser('user2@test.com', 'user2');
    
    // Create conversation
    const conversation = await createTestConversation(user1.id, user2.id);
    
    // Create multiple messages
    await createTestMessage(conversation.id, user1.id, 'Message 1');
    await createTestMessage(conversation.id, user2.id, 'Message 2', 5);
    await createTestMessage(conversation.id, user1.id, 'Message 3', 5);
    await createTestMessage(conversation.id, user2.id, 'Message 4', 5);
    
    const input: GetMessagesInput = {
      conversation_id: conversation.id,
      offset: 2
    };

    const result = await getMessages(input);

    expect(result).toHaveLength(2);
    expect(result[0].content).toEqual('Message 3');
    expect(result[1].content).toEqual('Message 4');
  });

  it('should support pagination with both limit and offset', async () => {
    // Create test users
    const user1 = await createTestUser('user1@test.com', 'user1');
    const user2 = await createTestUser('user2@test.com', 'user2');
    
    // Create conversation
    const conversation = await createTestConversation(user1.id, user2.id);
    
    // Create multiple messages
    await createTestMessage(conversation.id, user1.id, 'Message 1');
    await createTestMessage(conversation.id, user2.id, 'Message 2', 5);
    await createTestMessage(conversation.id, user1.id, 'Message 3', 5);
    await createTestMessage(conversation.id, user2.id, 'Message 4', 5);
    await createTestMessage(conversation.id, user1.id, 'Message 5', 5);
    
    const input: GetMessagesInput = {
      conversation_id: conversation.id,
      limit: 2,
      offset: 1
    };

    const result = await getMessages(input);

    expect(result).toHaveLength(2);
    expect(result[0].content).toEqual('Message 2');
    expect(result[1].content).toEqual('Message 3');
  });

  it('should return empty array when conversation has no messages', async () => {
    // Create test users
    const user1 = await createTestUser('user1@test.com', 'user1');
    const user2 = await createTestUser('user2@test.com', 'user2');
    
    // Create conversation but no messages
    const conversation = await createTestConversation(user1.id, user2.id);
    
    const input: GetMessagesInput = {
      conversation_id: conversation.id
    };

    const result = await getMessages(input);

    expect(result).toHaveLength(0);
  });

  it('should throw error when conversation does not exist', async () => {
    const input: GetMessagesInput = {
      conversation_id: 99999 // Non-existent conversation
    };

    await expect(getMessages(input)).rejects.toThrow(/conversation not found/i);
  });

  it('should handle different message statuses correctly', async () => {
    // Create test users
    const user1 = await createTestUser('user1@test.com', 'user1');
    const user2 = await createTestUser('user2@test.com', 'user2');
    
    // Create conversation
    const conversation = await createTestConversation(user1.id, user2.id);
    
    // Create messages with different statuses
    await db.insert(messagesTable)
      .values([
        {
          conversation_id: conversation.id,
          sender_id: user1.id,
          content: 'Sent message',
          status: 'sent'
        },
        {
          conversation_id: conversation.id,
          sender_id: user2.id,
          content: 'Delivered message',
          status: 'delivered'
        },
        {
          conversation_id: conversation.id,
          sender_id: user1.id,
          content: 'Read message',
          status: 'read'
        }
      ])
      .execute();
    
    const input: GetMessagesInput = {
      conversation_id: conversation.id
    };

    const result = await getMessages(input);

    expect(result).toHaveLength(3);
    expect(result[0].status).toEqual('sent');
    expect(result[1].status).toEqual('delivered');
    expect(result[2].status).toEqual('read');
  });

  it('should verify messages exist in database after retrieval', async () => {
    // Create test users
    const user1 = await createTestUser('user1@test.com', 'user1');
    const user2 = await createTestUser('user2@test.com', 'user2');
    
    // Create conversation
    const conversation = await createTestConversation(user1.id, user2.id);
    
    // Create a message
    const message = await createTestMessage(conversation.id, user1.id, 'Test message');
    
    const input: GetMessagesInput = {
      conversation_id: conversation.id
    };

    const result = await getMessages(input);

    // Verify the message exists in database
    const dbMessage = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, result[0].id))
      .execute();

    expect(dbMessage).toHaveLength(1);
    expect(dbMessage[0].id).toEqual(message.id);
    expect(dbMessage[0].content).toEqual('Test message');
    expect(dbMessage[0].conversation_id).toEqual(conversation.id);
    expect(dbMessage[0].sender_id).toEqual(user1.id);
  });
});