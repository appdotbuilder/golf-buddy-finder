import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, buddyMatchesTable } from '../db/schema';
import { getBuddyMatches } from '../handlers/get_buddy_matches';

describe('getBuddyMatches', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no buddy matches', async () => {
    // Create a user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        skill_level: 'beginner',
        location: 'Test City'
      })
      .returning()
      .execute();

    const result = await getBuddyMatches(users[0].id);

    expect(result).toEqual([]);
  });

  it('should return buddy matches where user is requester', async () => {
    // Create two users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          username: 'user1',
          full_name: 'User One',
          skill_level: 'intermediate',
          location: 'City One'
        },
        {
          email: 'user2@example.com',
          username: 'user2',
          full_name: 'User Two',
          skill_level: 'advanced',
          location: 'City Two'
        }
      ])
      .returning()
      .execute();

    // Create buddy match where user1 is requester
    const buddyMatches = await db.insert(buddyMatchesTable)
      .values({
        requester_id: users[0].id,
        recipient_id: users[1].id,
        status: 'pending'
      })
      .returning()
      .execute();

    const result = await getBuddyMatches(users[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(buddyMatches[0].id);
    expect(result[0].requester_id).toEqual(users[0].id);
    expect(result[0].recipient_id).toEqual(users[1].id);
    expect(result[0].status).toEqual('pending');
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return buddy matches where user is recipient', async () => {
    // Create two users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          username: 'user1',
          full_name: 'User One',
          skill_level: 'intermediate',
          location: 'City One'
        },
        {
          email: 'user2@example.com',
          username: 'user2',
          full_name: 'User Two',
          skill_level: 'advanced',
          location: 'City Two'
        }
      ])
      .returning()
      .execute();

    // Create buddy match where user2 is requester (user1 is recipient)
    const buddyMatches = await db.insert(buddyMatchesTable)
      .values({
        requester_id: users[1].id,
        recipient_id: users[0].id,
        status: 'accepted'
      })
      .returning()
      .execute();

    const result = await getBuddyMatches(users[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(buddyMatches[0].id);
    expect(result[0].requester_id).toEqual(users[1].id);
    expect(result[0].recipient_id).toEqual(users[0].id);
    expect(result[0].status).toEqual('accepted');
  });

  it('should return both sent and received buddy matches', async () => {
    // Create three users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          username: 'user1',
          full_name: 'User One',
          skill_level: 'intermediate',
          location: 'City One'
        },
        {
          email: 'user2@example.com',
          username: 'user2',
          full_name: 'User Two',
          skill_level: 'advanced',
          location: 'City Two'
        },
        {
          email: 'user3@example.com',
          username: 'user3',
          full_name: 'User Three',
          skill_level: 'pro',
          location: 'City Three'
        }
      ])
      .returning()
      .execute();

    // Create buddy matches - user1 sends to user2, user3 sends to user1
    await db.insert(buddyMatchesTable)
      .values([
        {
          requester_id: users[0].id, // user1 sends to user2
          recipient_id: users[1].id,
          status: 'pending'
        },
        {
          requester_id: users[2].id, // user3 sends to user1
          recipient_id: users[0].id,
          status: 'declined'
        }
      ])
      .execute();

    const result = await getBuddyMatches(users[0].id);

    expect(result).toHaveLength(2);
    
    // Should contain both matches where user1 is involved
    const requesterMatch = result.find(match => match.requester_id === users[0].id);
    const recipientMatch = result.find(match => match.recipient_id === users[0].id);
    
    expect(requesterMatch).toBeDefined();
    expect(requesterMatch!.recipient_id).toEqual(users[1].id);
    expect(requesterMatch!.status).toEqual('pending');
    
    expect(recipientMatch).toBeDefined();
    expect(recipientMatch!.requester_id).toEqual(users[2].id);
    expect(recipientMatch!.status).toEqual('declined');
  });

  it('should return matches with different statuses', async () => {
    // Create users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          username: 'user1',
          full_name: 'User One',
          skill_level: 'intermediate',
          location: 'City One'
        },
        {
          email: 'user2@example.com',
          username: 'user2',
          full_name: 'User Two',
          skill_level: 'advanced',
          location: 'City Two'
        },
        {
          email: 'user3@example.com',
          username: 'user3',
          full_name: 'User Three',
          skill_level: 'pro',
          location: 'City Three'
        }
      ])
      .returning()
      .execute();

    // Create buddy matches with different statuses
    await db.insert(buddyMatchesTable)
      .values([
        {
          requester_id: users[0].id,
          recipient_id: users[1].id,
          status: 'pending'
        },
        {
          requester_id: users[0].id,
          recipient_id: users[2].id,
          status: 'accepted'
        }
      ])
      .execute();

    const result = await getBuddyMatches(users[0].id);

    expect(result).toHaveLength(2);
    
    const statuses = result.map(match => match.status);
    expect(statuses).toContain('pending');
    expect(statuses).toContain('accepted');
  });

  it('should not return matches for other users', async () => {
    // Create three users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          username: 'user1',
          full_name: 'User One',
          skill_level: 'intermediate',
          location: 'City One'
        },
        {
          email: 'user2@example.com',
          username: 'user2',
          full_name: 'User Two',
          skill_level: 'advanced',
          location: 'City Two'
        },
        {
          email: 'user3@example.com',
          username: 'user3',
          full_name: 'User Three',
          skill_level: 'pro',
          location: 'City Three'
        }
      ])
      .returning()
      .execute();

    // Create buddy match between user2 and user3 (user1 not involved)
    await db.insert(buddyMatchesTable)
      .values({
        requester_id: users[1].id,
        recipient_id: users[2].id,
        status: 'pending'
      })
      .execute();

    const result = await getBuddyMatches(users[0].id);

    expect(result).toHaveLength(0);
  });
});