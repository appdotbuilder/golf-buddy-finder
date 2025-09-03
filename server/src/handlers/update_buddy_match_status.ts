import { db } from '../db';
import { buddyMatchesTable, conversationsTable } from '../db/schema';
import { type UpdateBuddyMatchStatusInput, type BuddyMatch } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateBuddyMatchStatus = async (input: UpdateBuddyMatchStatusInput): Promise<BuddyMatch> => {
  try {
    // First, find and validate the buddy match exists and is in pending status
    const existingMatch = await db.select()
      .from(buddyMatchesTable)
      .where(
        and(
          eq(buddyMatchesTable.id, input.id),
          eq(buddyMatchesTable.status, 'pending')
        )
      )
      .execute();

    if (existingMatch.length === 0) {
      throw new Error('Buddy match not found or not in pending status');
    }

    const match = existingMatch[0];

    // Update the buddy match status
    const updatedMatch = await db.update(buddyMatchesTable)
      .set({
        status: input.status,
        updated_at: new Date()
      })
      .where(eq(buddyMatchesTable.id, input.id))
      .returning()
      .execute();

    // If status is accepted, create a conversation between the users
    if (input.status === 'accepted') {
      // Check if a conversation already exists between these users
      const existingConversation = await db.select()
        .from(conversationsTable)
        .where(
          and(
            eq(conversationsTable.user1_id, match.requester_id),
            eq(conversationsTable.user2_id, match.recipient_id)
          )
        )
        .execute();

      // Also check the reverse order (user2_id -> user1_id)
      const existingConversationReverse = await db.select()
        .from(conversationsTable)
        .where(
          and(
            eq(conversationsTable.user1_id, match.recipient_id),
            eq(conversationsTable.user2_id, match.requester_id)
          )
        )
        .execute();

      // Create conversation only if it doesn't exist in either direction
      if (existingConversation.length === 0 && existingConversationReverse.length === 0) {
        await db.insert(conversationsTable)
          .values({
            user1_id: match.requester_id,
            user2_id: match.recipient_id
          })
          .execute();
      }
    }

    return updatedMatch[0];
  } catch (error) {
    console.error('Buddy match status update failed:', error);
    throw error;
  }
};