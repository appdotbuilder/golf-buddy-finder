import { db } from '../db';
import { buddyMatchesTable, usersTable } from '../db/schema';
import { type BuddyMatch } from '../schema';
import { eq, or } from 'drizzle-orm';

export const getBuddyMatches = async (userId: number): Promise<BuddyMatch[]> => {
  try {
    // Fetch all buddy matches where the user is either requester or recipient
    const results = await db.select()
      .from(buddyMatchesTable)
      .where(
        or(
          eq(buddyMatchesTable.requester_id, userId),
          eq(buddyMatchesTable.recipient_id, userId)
        )
      )
      .execute();

    return results;
  } catch (error) {
    console.error('Get buddy matches failed:', error);
    throw error;
  }
};