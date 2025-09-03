import { z } from 'zod';

// Enums for various skill levels and time preferences
export const skillLevelEnum = z.enum(['beginner', 'intermediate', 'advanced', 'pro']);
export const timePreferenceEnum = z.enum(['morning', 'afternoon', 'evening', 'weekend']);
export const messageStatusEnum = z.enum(['sent', 'delivered', 'read']);

// User/Golfer profile schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  username: z.string(),
  full_name: z.string(),
  skill_level: skillLevelEnum,
  handicap: z.number().nullable(), // Can be null for beginners who don't have handicap yet
  location: z.string(), // City/area where they usually play
  bio: z.string().nullable(),
  home_course: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Golf course schema
export const courseSchema = z.object({
  id: z.number(),
  name: z.string(),
  location: z.string(),
  description: z.string().nullable(),
  par: z.number().int(),
  created_at: z.coerce.date()
});

export type Course = z.infer<typeof courseSchema>;

// User's favorite courses (many-to-many relationship)
export const userFavoriteCourseSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  course_id: z.number(),
  created_at: z.coerce.date()
});

export type UserFavoriteCourse = z.infer<typeof userFavoriteCourseSchema>;

// User's time preferences (many-to-many relationship)
export const userTimePreferenceSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  time_preference: timePreferenceEnum,
  created_at: z.coerce.date()
});

export type UserTimePreference = z.infer<typeof userTimePreferenceSchema>;

// Chat conversations between users
export const conversationSchema = z.object({
  id: z.number(),
  user1_id: z.number(),
  user2_id: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Conversation = z.infer<typeof conversationSchema>;

// Messages within conversations
export const messageSchema = z.object({
  id: z.number(),
  conversation_id: z.number(),
  sender_id: z.number(),
  content: z.string(),
  status: messageStatusEnum,
  created_at: z.coerce.date()
});

export type Message = z.infer<typeof messageSchema>;

// Buddy matches/connections between users
export const buddyMatchSchema = z.object({
  id: z.number(),
  requester_id: z.number(),
  recipient_id: z.number(),
  status: z.enum(['pending', 'accepted', 'declined']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type BuddyMatch = z.infer<typeof buddyMatchSchema>;

// Input schemas for creating/updating data

// Create user input
export const createUserInputSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  full_name: z.string().min(1),
  skill_level: skillLevelEnum,
  handicap: z.number().nullable(),
  location: z.string().min(1),
  bio: z.string().nullable(),
  home_course: z.string().nullable()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Update user input
export const updateUserInputSchema = z.object({
  id: z.number(),
  email: z.string().email().optional(),
  username: z.string().min(3).optional(),
  full_name: z.string().min(1).optional(),
  skill_level: skillLevelEnum.optional(),
  handicap: z.number().nullable().optional(),
  location: z.string().min(1).optional(),
  bio: z.string().nullable().optional(),
  home_course: z.string().nullable().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Create course input
export const createCourseInputSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  description: z.string().nullable(),
  par: z.number().int().positive()
});

export type CreateCourseInput = z.infer<typeof createCourseInputSchema>;

// Search buddies input
export const searchBuddiesInputSchema = z.object({
  location: z.string().optional(),
  skill_level: skillLevelEnum.optional(),
  course_id: z.number().optional(),
  time_preference: timePreferenceEnum.optional(),
  max_handicap_diff: z.number().optional() // For matching similar skill levels
});

export type SearchBuddiesInput = z.infer<typeof searchBuddiesInputSchema>;

// Add favorite course input
export const addFavoriteCourseInputSchema = z.object({
  user_id: z.number(),
  course_id: z.number()
});

export type AddFavoriteCourseInput = z.infer<typeof addFavoriteCourseInputSchema>;

// Add time preference input
export const addTimePreferenceInputSchema = z.object({
  user_id: z.number(),
  time_preference: timePreferenceEnum
});

export type AddTimePreferenceInput = z.infer<typeof addTimePreferenceInputSchema>;

// Send message input
export const sendMessageInputSchema = z.object({
  conversation_id: z.number(),
  sender_id: z.number(),
  content: z.string().min(1)
});

export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

// Create conversation input
export const createConversationInputSchema = z.object({
  user1_id: z.number(),
  user2_id: z.number()
});

export type CreateConversationInput = z.infer<typeof createConversationInputSchema>;

// Create buddy match input
export const createBuddyMatchInputSchema = z.object({
  requester_id: z.number(),
  recipient_id: z.number()
});

export type CreateBuddyMatchInput = z.infer<typeof createBuddyMatchInputSchema>;

// Update buddy match status input
export const updateBuddyMatchStatusInputSchema = z.object({
  id: z.number(),
  status: z.enum(['accepted', 'declined'])
});

export type UpdateBuddyMatchStatusInput = z.infer<typeof updateBuddyMatchStatusInputSchema>;

// Get conversations input
export const getConversationsInputSchema = z.object({
  user_id: z.number()
});

export type GetConversationsInput = z.infer<typeof getConversationsInputSchema>;

// Get messages input
export const getMessagesInputSchema = z.object({
  conversation_id: z.number(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});

export type GetMessagesInput = z.infer<typeof getMessagesInputSchema>;