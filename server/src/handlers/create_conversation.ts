import { db } from '../db';
import { conversationsTable, usersTable } from '../db/schema';
import { type CreateConversationInput, type Conversation } from '../schema';
import { eq, and, or } from 'drizzle-orm';

export const createConversation = async (input: CreateConversationInput): Promise<Conversation> => {
  try {
    // Prevent users from creating conversations with themselves
    if (input.user1_id === input.user2_id) {
      throw new Error('Cannot create conversation with yourself');
    }

    // Normalize user IDs (smaller ID always as user1_id for consistency)
    const user1_id = Math.min(input.user1_id, input.user2_id);
    const user2_id = Math.max(input.user1_id, input.user2_id);

    // Validate that both users exist
    const users = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(or(eq(usersTable.id, user1_id), eq(usersTable.id, user2_id)))
      .execute();

    if (users.length !== 2) {
      throw new Error('One or both users do not exist');
    }

    // Check if conversation already exists
    const existingConversation = await db.select()
      .from(conversationsTable)
      .where(and(
        eq(conversationsTable.user1_id, user1_id),
        eq(conversationsTable.user2_id, user2_id)
      ))
      .execute();

    if (existingConversation.length > 0) {
      // Return existing conversation instead of creating duplicate
      return existingConversation[0];
    }

    // Create new conversation
    const result = await db.insert(conversationsTable)
      .values({
        user1_id,
        user2_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Conversation creation failed:', error);
    throw error;
  }
};