import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schema types
import {
  createUserInputSchema,
  updateUserInputSchema,
  createCourseInputSchema,
  searchBuddiesInputSchema,
  addFavoriteCourseInputSchema,
  addTimePreferenceInputSchema,
  createBuddyMatchInputSchema,
  updateBuddyMatchStatusInputSchema,
  createConversationInputSchema,
  sendMessageInputSchema,
  getConversationsInputSchema,
  getMessagesInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUser } from './handlers/get_user';
import { updateUser } from './handlers/update_user';
import { createCourse } from './handlers/create_course';
import { getCourses } from './handlers/get_courses';
import { searchBuddies } from './handlers/search_buddies';
import { addFavoriteCourse } from './handlers/add_favorite_course';
import { addTimePreference } from './handlers/add_time_preference';
import { createBuddyMatch } from './handlers/create_buddy_match';
import { updateBuddyMatchStatus } from './handlers/update_buddy_match_status';
import { getBuddyMatches } from './handlers/get_buddy_matches';
import { createConversation } from './handlers/create_conversation';
import { sendMessage } from './handlers/send_message';
import { getConversations } from './handlers/get_conversations';
import { getMessages } from './handlers/get_messages';
import { getUserFavorites } from './handlers/get_user_favorites';
import { getUserTimePreferences } from './handlers/get_user_time_preferences';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management endpoints
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUser: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getUser(input.id)),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  // Course management endpoints
  createCourse: publicProcedure
    .input(createCourseInputSchema)
    .mutation(({ input }) => createCourse(input)),

  getCourses: publicProcedure
    .query(() => getCourses()),

  // User preferences endpoints
  addFavoriteCourse: publicProcedure
    .input(addFavoriteCourseInputSchema)
    .mutation(({ input }) => addFavoriteCourse(input)),

  getUserFavorites: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserFavorites(input.userId)),

  addTimePreference: publicProcedure
    .input(addTimePreferenceInputSchema)
    .mutation(({ input }) => addTimePreference(input)),

  getUserTimePreferences: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserTimePreferences(input.userId)),

  // Buddy matching endpoints
  searchBuddies: publicProcedure
    .input(searchBuddiesInputSchema)
    .query(({ input }) => searchBuddies(input)),

  createBuddyMatch: publicProcedure
    .input(createBuddyMatchInputSchema)
    .mutation(({ input }) => createBuddyMatch(input)),

  updateBuddyMatchStatus: publicProcedure
    .input(updateBuddyMatchStatusInputSchema)
    .mutation(({ input }) => updateBuddyMatchStatus(input)),

  getBuddyMatches: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getBuddyMatches(input.userId)),

  // Chat/messaging endpoints
  createConversation: publicProcedure
    .input(createConversationInputSchema)
    .mutation(({ input }) => createConversation(input)),

  getConversations: publicProcedure
    .input(getConversationsInputSchema)
    .query(({ input }) => getConversations(input)),

  sendMessage: publicProcedure
    .input(sendMessageInputSchema)
    .mutation(({ input }) => sendMessage(input)),

  getMessages: publicProcedure
    .input(getMessagesInputSchema)
    .query(({ input }) => getMessages(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Golf Buddy TRPC server listening at port: ${port}`);
}

start();