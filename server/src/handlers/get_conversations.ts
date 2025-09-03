import { db } from '../db';
import { conversationsTable } from '../db/schema';
import { type GetConversationsInput, type Conversation } from '../schema';
import { eq, or, desc } from 'drizzle-orm';

export const getConversations = async (input: GetConversationsInput): Promise<Conversation[]> => {
  try {
    // Query conversations where the user is either user1 or user2
    const result = await db.select()
      .from(conversationsTable)
      .where(
        or(
          eq(conversationsTable.user1_id, input.user_id),
          eq(conversationsTable.user2_id, input.user_id)
        )
      )
      .orderBy(desc(conversationsTable.updated_at))
      .execute();

    return result;
  } catch (error) {
    console.error('Get conversations failed:', error);
    throw error;
  }
};