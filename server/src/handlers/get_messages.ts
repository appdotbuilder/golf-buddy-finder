import { db } from '../db';
import { messagesTable, conversationsTable } from '../db/schema';
import { type GetMessagesInput, type Message } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getMessages = async (input: GetMessagesInput): Promise<Message[]> => {
  try {
    // First verify the conversation exists
    const conversation = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, input.conversation_id))
      .limit(1)
      .execute();

    if (conversation.length === 0) {
      throw new Error('Conversation not found');
    }

    // Build query with default pagination values
    const limit = input.limit ?? 100; // Default limit to prevent unbounded queries
    const offset = input.offset ?? 0;

    // Execute the query with pagination and ordering
    const results = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.conversation_id, input.conversation_id))
      .orderBy(asc(messagesTable.created_at)) // Oldest first (chronological order)
      .limit(limit)
      .offset(offset)
      .execute();

    // Convert the results to match the Message schema
    return results.map(message => ({
      id: message.id,
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      content: message.content,
      status: message.status,
      created_at: message.created_at
    }));
  } catch (error) {
    console.error('Get messages failed:', error);
    throw error;
  }
};