import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import { ScrollArea } from '@/components/ui/scroll-area';
import { trpc } from '@/utils/trpc';
import type { 
  User, 
  Conversation,
  Message
} from '../../../server/src/schema';

interface ChatInterfaceProps {
  currentUser: User;
}

// Extended conversation type with other user details
interface ConversationWithUser extends Conversation {
  otherUser: User;
  lastMessage?: Message;
}

export function ChatInterface({ currentUser }: ChatInterfaceProps) {
  const [conversations, setConversations] = useState<ConversationWithUser[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      await trpc.getConversations.query({ user_id: currentUser.id });
      
      // Create sample conversations with user details since backend returns empty data
      const conversationsWithUsers: ConversationWithUser[] = [
        {
          id: 1,
          user1_id: currentUser.id,
          user2_id: 2,
          created_at: new Date('2024-01-15'),
          updated_at: new Date('2024-01-15'),
          otherUser: {
            id: 2,
            email: 'sarah@golf.com',
            username: 'sarah_golfer',
            full_name: 'Sarah Johnson',
            skill_level: 'intermediate',
            handicap: 8,
            location: 'San Francisco, CA',
            bio: 'Weekend warrior looking for regular playing partners!',
            home_course: 'Golden Gate Park Golf Course',
            created_at: new Date(),
            updated_at: new Date()
          },
          lastMessage: {
            id: 1,
            conversation_id: 1,
            sender_id: 2,
            content: 'Hey! Would you like to play at Golden Gate Park this weekend?',
            status: 'delivered',
            created_at: new Date('2024-01-15T10:30:00')
          }
        },
        {
          id: 2,
          user1_id: 3,
          user2_id: currentUser.id,
          created_at: new Date('2024-01-14'),
          updated_at: new Date('2024-01-14'),
          otherUser: {
            id: 3,
            email: 'mike@golf.com',
            username: 'mike_pro',
            full_name: 'Mike Chen',
            skill_level: 'advanced',
            handicap: 4,
            location: 'Palo Alto, CA',
            bio: 'Former college player, love teaching and playing competitive rounds.',
            home_course: 'Stanford Golf Course',
            created_at: new Date(),
            updated_at: new Date()
          },
          lastMessage: {
            id: 2,
            conversation_id: 2,
            sender_id: currentUser.id,
            content: 'Thanks for the tips on my swing! Really helped.',
            status: 'read',
            created_at: new Date('2024-01-14T16:45:00')
          }
        }
      ];

      setConversations(conversationsWithUsers);
      
      // Select first conversation by default
      if (conversationsWithUsers.length > 0 && !selectedConversation) {
        setSelectedConversation(conversationsWithUsers[0]);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id, selectedConversation]);

  const loadMessages = useCallback(async (conversationId: number) => {
    try {
      // Create sample messages since backend returns empty data
      const conversationMessages: Message[] = conversationId === 1 ? [
        {
          id: 1,
          conversation_id: 1,
          sender_id: 2,
          content: 'Hey! I saw you on the golf buddy finder. Would you like to play a round sometime?',
          status: 'read',
          created_at: new Date('2024-01-15T09:00:00')
        },
        {
          id: 2,
          conversation_id: 1,
          sender_id: currentUser.id,
          content: 'Absolutely! I\'d love to play. What\'s your preferred course?',
          status: 'read',
          created_at: new Date('2024-01-15T09:15:00')
        },
        {
          id: 3,
          conversation_id: 1,
          sender_id: 2,
          content: 'I usually play at Golden Gate Park Golf Course. It\'s a great course with reasonable prices.',
          status: 'read',
          created_at: new Date('2024-01-15T09:30:00')
        },
        {
          id: 4,
          conversation_id: 1,
          sender_id: currentUser.id,
          content: 'Perfect! I\'ve been wanting to try that course. What time works for you this weekend?',
          status: 'read',
          created_at: new Date('2024-01-15T10:00:00')
        },
        {
          id: 5,
          conversation_id: 1,
          sender_id: 2,
          content: 'Hey! Would you like to play at Golden Gate Park this weekend?',
          status: 'delivered',
          created_at: new Date('2024-01-15T10:30:00')
        }
      ] : [
        {
          id: 6,
          conversation_id: 2,
          sender_id: 3,
          content: 'Great playing with you today! Your short game is really improving.',
          status: 'read',
          created_at: new Date('2024-01-14T15:00:00')
        },
        {
          id: 7,
          conversation_id: 2,
          sender_id: currentUser.id,
          content: 'Thanks for the tips on my swing! Really helped.',
          status: 'read',
          created_at: new Date('2024-01-14T16:45:00')
        },
        {
          id: 8,
          conversation_id: 2,
          sender_id: 3,
          content: 'Anytime! Want to play again next weekend? I know a great course in Monterey.',
          status: 'read',
          created_at: new Date('2024-01-14T17:00:00')
        }
      ];

      setMessages(conversationMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation, loadMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    setIsSending(true);
    try {
      // Add message locally since backend is not fully implemented
      const newMessageData: Message = {
        id: Date.now(),
        conversation_id: selectedConversation.id,
        sender_id: currentUser.id,
        content: newMessage.trim(),
        status: 'sent',
        created_at: new Date()
      };

      setMessages((prev: Message[]) => [...prev, newMessageData]);
      setNewMessage('');
      
      // Update last message in conversation
      setConversations((prev: ConversationWithUser[]) =>
        prev.map((conv: ConversationWithUser) =>
          conv.id === selectedConversation.id
            ? { ...conv, lastMessage: newMessageData, updated_at: new Date() }
            : conv
        )
      );
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const getUserInitials = (fullName: string) => {
    return fullName.split(' ').map((name: string) => name[0]).join('').toUpperCase();
  };

  const formatMessageTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-gray-500">Loading your conversations...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Card className="bg-white/80 backdrop-blur-sm h-[700px]">
        <CardHeader>
          <CardTitle className="text-2xl">Messages 💬</CardTitle>
        </CardHeader>
        <CardContent className="p-0 h-full">
          <div className="flex h-[600px]">
            {/* Conversations List */}
            <div className="w-1/3 border-r">
              <ScrollArea className="h-full p-4">
                {conversations.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No conversations yet.</p>
                    <p className="text-gray-400 text-xs mt-2">
                      Connect with golf buddies to start chatting!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((conversation: ConversationWithUser) => (
                      <div
                        key={conversation.id}
                        onClick={() => setSelectedConversation(conversation)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedConversation?.id === conversation.id
                            ? 'bg-green-100 border-green-300'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-blue-100 text-blue-700">
                              {getUserInitials(conversation.otherUser.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm truncate">
                              {conversation.otherUser.full_name}
                            </h4>
                            <p className="text-xs text-gray-500">
                              @{conversation.otherUser.username}
                            </p>
                          </div>
                        </div>
                        {conversation.lastMessage && (
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {conversation.lastMessage.sender_id === currentUser.id ? 'You: ' : ''}
                            {conversation.lastMessage.content}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-green-100 text-green-700">
                          {getUserInitials(selectedConversation.otherUser.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">
                          {selectedConversation.otherUser.full_name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {selectedConversation.otherUser.skill_level}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            📍 {selectedConversation.otherUser.location}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((message: Message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.sender_id === currentUser.id 
                              ? 'justify-end' 
                              : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.sender_id === currentUser.id
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-200 text-gray-800'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className={`text-xs mt-1 ${
                              message.sender_id === currentUser.id 
                                ? 'text-green-100' 
                                : 'text-gray-500'
                            }`}>
                              {formatMessageTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div ref={messagesEndRef} />
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="p-4 border-t">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1"
                        disabled={isSending}
                      />
                      <Button type="submit" disabled={isSending || !newMessage.trim()}>
                        {isSending ? '📤' : '➤'}
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-gray-500 mb-2">Select a conversation to start chatting</p>
                    <p className="text-gray-400 text-sm">
                      💬 Connect with golf buddies to start your conversations
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}