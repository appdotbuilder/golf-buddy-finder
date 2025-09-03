import { db } from '../db';
import { messagesTable, conversationsTable } from '../db/schema';
import { type SendMessageInput, type Message } from '../schema';
import { eq, or, and } from 'drizzle-orm';

export const sendMessage = async (input: SendMessageInput): Promise<Message> => {
  try {
    // First, verify the conversation exists and the sender is a participant
    const conversation = await db.select()
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.id, input.conversation_id),
          or(
            eq(conversationsTable.user1_id, input.sender_id),
            eq(conversationsTable.user2_id, input.sender_id)
          )
        )
      )
      .execute();

    if (conversation.length === 0) {
      throw new Error('Conversation not found or sender is not a participant');
    }

    // Insert the new message
    const result = await db.insert(messagesTable)
      .values({
        conversation_id: input.conversation_id,
        sender_id: input.sender_id,
        content: input.content,
        status: 'sent' // Default status
      })
      .returning()
      .execute();

    // Update the conversation's updated_at timestamp
    await db.update(conversationsTable)
      .set({ updated_at: new Date() })
      .where(eq(conversationsTable.id, input.conversation_id))
      .execute();

    return result[0];
  } catch (error) {
    console.error('Send message failed:', error);
    throw error;
  }
};