import { serial, text, pgTable, timestamp, integer, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums for the database
export const skillLevelEnum = pgEnum('skill_level', ['beginner', 'intermediate', 'advanced', 'pro']);
export const timePreferenceEnum = pgEnum('time_preference', ['morning', 'afternoon', 'evening', 'weekend']);
export const messageStatusEnum = pgEnum('message_status', ['sent', 'delivered', 'read']);
export const buddyMatchStatusEnum = pgEnum('buddy_match_status', ['pending', 'accepted', 'declined']);

// Users table - golfer profiles
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  full_name: text('full_name').notNull(),
  skill_level: skillLevelEnum('skill_level').notNull(),
  handicap: integer('handicap'), // Nullable for beginners
  location: text('location').notNull(),
  bio: text('bio'),
  home_course: text('home_course'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  locationIdx: index('users_location_idx').on(table.location),
  skillLevelIdx: index('users_skill_level_idx').on(table.skill_level)
}));

// Golf courses table
export const coursesTable = pgTable('courses', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location').notNull(),
  description: text('description'),
  par: integer('par').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  nameIdx: index('courses_name_idx').on(table.name),
  locationIdx: index('courses_location_idx').on(table.location)
}));

// User favorite courses (many-to-many)
export const userFavoriteCoursesTable = pgTable('user_favorite_courses', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  course_id: integer('course_id').references(() => coursesTable.id).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  userCourseIdx: index('user_favorite_courses_user_course_idx').on(table.user_id, table.course_id)
}));

// User time preferences (many-to-many)
export const userTimePreferencesTable = pgTable('user_time_preferences', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  time_preference: timePreferenceEnum('time_preference').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  userTimeIdx: index('user_time_preferences_user_time_idx').on(table.user_id, table.time_preference)
}));

// Conversations between users
export const conversationsTable = pgTable('conversations', {
  id: serial('id').primaryKey(),
  user1_id: integer('user1_id').references(() => usersTable.id).notNull(),
  user2_id: integer('user2_id').references(() => usersTable.id).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  usersIdx: index('conversations_users_idx').on(table.user1_id, table.user2_id)
}));

// Messages within conversations
export const messagesTable = pgTable('messages', {
  id: serial('id').primaryKey(),
  conversation_id: integer('conversation_id').references(() => conversationsTable.id).notNull(),
  sender_id: integer('sender_id').references(() => usersTable.id).notNull(),
  content: text('content').notNull(),
  status: messageStatusEnum('status').default('sent').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  conversationIdx: index('messages_conversation_idx').on(table.conversation_id),
  createdAtIdx: index('messages_created_at_idx').on(table.created_at)
}));

// Buddy matches/connections
export const buddyMatchesTable = pgTable('buddy_matches', {
  id: serial('id').primaryKey(),
  requester_id: integer('requester_id').references(() => usersTable.id).notNull(),
  recipient_id: integer('recipient_id').references(() => usersTable.id).notNull(),
  status: buddyMatchStatusEnum('status').default('pending').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  requesterIdx: index('buddy_matches_requester_idx').on(table.requester_id),
  recipientIdx: index('buddy_matches_recipient_idx').on(table.recipient_id),
  statusIdx: index('buddy_matches_status_idx').on(table.status)
}));

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  favoriteCoursesTable: many(userFavoriteCoursesTable),
  timePreferences: many(userTimePreferencesTable),
  sentMessages: many(messagesTable, { relationName: 'sender' }),
  conversationsAsUser1: many(conversationsTable, { relationName: 'user1' }),
  conversationsAsUser2: many(conversationsTable, { relationName: 'user2' }),
  sentBuddyRequests: many(buddyMatchesTable, { relationName: 'requester' }),
  receivedBuddyRequests: many(buddyMatchesTable, { relationName: 'recipient' })
}));

export const coursesRelations = relations(coursesTable, ({ many }) => ({
  userFavorites: many(userFavoriteCoursesTable)
}));

export const userFavoriteCoursesRelations = relations(userFavoriteCoursesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [userFavoriteCoursesTable.user_id],
    references: [usersTable.id]
  }),
  course: one(coursesTable, {
    fields: [userFavoriteCoursesTable.course_id],
    references: [coursesTable.id]
  })
}));

export const userTimePreferencesRelations = relations(userTimePreferencesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [userTimePreferencesTable.user_id],
    references: [usersTable.id]
  })
}));

export const conversationsRelations = relations(conversationsTable, ({ one, many }) => ({
  user1: one(usersTable, {
    fields: [conversationsTable.user1_id],
    references: [usersTable.id],
    relationName: 'user1'
  }),
  user2: one(usersTable, {
    fields: [conversationsTable.user2_id],
    references: [usersTable.id],
    relationName: 'user2'
  }),
  messages: many(messagesTable)
}));

export const messagesRelations = relations(messagesTable, ({ one }) => ({
  conversation: one(conversationsTable, {
    fields: [messagesTable.conversation_id],
    references: [conversationsTable.id]
  }),
  sender: one(usersTable, {
    fields: [messagesTable.sender_id],
    references: [usersTable.id],
    relationName: 'sender'
  })
}));

export const buddyMatchesRelations = relations(buddyMatchesTable, ({ one }) => ({
  requester: one(usersTable, {
    fields: [buddyMatchesTable.requester_id],
    references: [usersTable.id],
    relationName: 'requester'
  }),
  recipient: one(usersTable, {
    fields: [buddyMatchesTable.recipient_id],
    references: [usersTable.id],
    relationName: 'recipient'
  })
}));

// TypeScript types for the tables
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Course = typeof coursesTable.$inferSelect;
export type NewCourse = typeof coursesTable.$inferInsert;

export type UserFavoriteCourse = typeof userFavoriteCoursesTable.$inferSelect;
export type NewUserFavoriteCourse = typeof userFavoriteCoursesTable.$inferInsert;

export type UserTimePreference = typeof userTimePreferencesTable.$inferSelect;
export type NewUserTimePreference = typeof userTimePreferencesTable.$inferInsert;

export type Conversation = typeof conversationsTable.$inferSelect;
export type NewConversation = typeof conversationsTable.$inferInsert;

export type Message = typeof messagesTable.$inferSelect;
export type NewMessage = typeof messagesTable.$inferInsert;

export type BuddyMatch = typeof buddyMatchesTable.$inferSelect;
export type NewBuddyMatch = typeof buddyMatchesTable.$inferInsert;

// Export all tables for relations and query building
export const tables = {
  users: usersTable,
  courses: coursesTable,
  userFavoriteCourses: userFavoriteCoursesTable,
  userTimePreferences: userTimePreferencesTable,
  conversations: conversationsTable,
  messages: messagesTable,
  buddyMatches: buddyMatchesTable
};