import { db } from '../db';
import { usersTable, buddyMatchesTable } from '../db/schema';
import { type CreateBuddyMatchInput, type BuddyMatch } from '../schema';
import { eq, and, or } from 'drizzle-orm';

export const createBuddyMatch = async (input: CreateBuddyMatchInput): Promise<BuddyMatch> => {
  try {
    // Prevent users from sending requests to themselves
    if (input.requester_id === input.recipient_id) {
      throw new Error('Cannot create buddy match with yourself');
    }

    // Verify both users exist
    const users = await db.select()
      .from(usersTable)
      .where(or(
        eq(usersTable.id, input.requester_id),
        eq(usersTable.id, input.recipient_id)
      ))
      .execute();

    if (users.length !== 2) {
      throw new Error('One or both users not found');
    }

    // Check for existing buddy match between these users (in either direction)
    const existingMatch = await db.select()
      .from(buddyMatchesTable)
      .where(or(
        and(
          eq(buddyMatchesTable.requester_id, input.requester_id),
          eq(buddyMatchesTable.recipient_id, input.recipient_id)
        ),
        and(
          eq(buddyMatchesTable.requester_id, input.recipient_id),
          eq(buddyMatchesTable.recipient_id, input.requester_id)
        )
      ))
      .execute();

    if (existingMatch.length > 0) {
      throw new Error('Buddy match already exists between these users');
    }

    // Create the buddy match request
    const result = await db.insert(buddyMatchesTable)
      .values({
        requester_id: input.requester_id,
        recipient_id: input.recipient_id,
        status: 'pending'
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Buddy match creation failed:', error);
    throw error;
  }
};