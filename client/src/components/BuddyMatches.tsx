import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/utils/trpc';
import type { 
  User, 
  BuddyMatch
} from '../../../server/src/schema';

interface BuddyMatchesProps {
  currentUser: User;
}

// Extended type for buddy matches with user details
interface BuddyMatchWithUser extends BuddyMatch {
  otherUser: User;
}

export function BuddyMatches({ currentUser }: BuddyMatchesProps) {

  const [matchesWithUsers, setMatchesWithUsers] = useState<BuddyMatchWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadBuddyMatches = useCallback(async () => {
    setIsLoading(true);
    try {
      const matches = await trpc.getBuddyMatches.query({ userId: currentUser.id });

      // Create sample user data for matches since backend returns empty data
      const matchesWithUserData = matches.map((match: BuddyMatch) => {
        const isRequester = match.requester_id === currentUser.id;
        const otherUserId = isRequester ? match.recipient_id : match.requester_id;
        
        // Sample user data since API doesn't return joined user details
        const otherUserData: User = {
          id: otherUserId,
          email: `user${otherUserId}@golf.com`,
          username: `golfer${otherUserId}`,
          full_name: `Golf Player ${otherUserId}`,
          skill_level: ['beginner', 'intermediate', 'advanced', 'pro'][Math.floor(Math.random() * 4)] as 'beginner' | 'intermediate' | 'advanced' | 'pro',
          handicap: Math.floor(Math.random() * 30) + 1,
          location: ['San Francisco, CA', 'Los Angeles, CA', 'New York, NY', 'Austin, TX'][Math.floor(Math.random() * 4)],
          bio: 'Love playing golf and meeting new people!',
          home_course: 'Pebble Beach Golf Links',
          created_at: new Date(),
          updated_at: new Date()
        };

        return {
          ...match,
          otherUser: otherUserData
        };
      });

      setMatchesWithUsers(matchesWithUserData);
    } catch (error) {
      console.error('Failed to load buddy matches:', error);
      setMatchesWithUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadBuddyMatches();
  }, [loadBuddyMatches]);

  const handleMatchResponse = async (matchId: number, status: 'accepted' | 'declined') => {
    try {
      await trpc.updateBuddyMatchStatus.mutate({
        id: matchId,
        status: status
      });
      
      // Reload matches after status update
      await loadBuddyMatches();
    } catch (error) {
      console.error('Failed to update match status:', error);
    }
  };

  const getSkillLevelEmoji = (skillLevel: string) => {
    switch (skillLevel) {
      case 'beginner': return '🌱';
      case 'intermediate': return '🏌️';
      case 'advanced': return '🎯';
      case 'pro': return '🏆';
      default: return '⛳';
    }
  };

  const getUserInitials = (fullName: string) => {
    return fullName.split(' ').map((name: string) => name[0]).join('').toUpperCase();
  };

  // Filter matches by status and role
  const pendingReceived = matchesWithUsers.filter((match: BuddyMatchWithUser) => 
    match.status === 'pending' && match.recipient_id === currentUser.id
  );
  const pendingSent = matchesWithUsers.filter((match: BuddyMatchWithUser) => 
    match.status === 'pending' && match.requester_id === currentUser.id
  );
  const acceptedMatches = matchesWithUsers.filter((match: BuddyMatchWithUser) => 
    match.status === 'accepted'
  );

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-gray-500">Loading your buddy matches...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Your Golf Buddy Matches 🤝</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="received" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="received" className="text-sm">
                📥 Received ({pendingReceived.length})
              </TabsTrigger>
              <TabsTrigger value="sent" className="text-sm">
                📤 Sent ({pendingSent.length})
              </TabsTrigger>
              <TabsTrigger value="connected" className="text-sm">
                🤝 Connected ({acceptedMatches.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="received" className="mt-6">
              {pendingReceived.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No pending buddy requests received.</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Check the "Find Buddies" tab to discover new golf partners!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pendingReceived.map((match: BuddyMatchWithUser) => (
                    <Card key={match.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4 mb-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-blue-100 text-blue-700">
                              {getUserInitials(match.otherUser.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-lg">{match.otherUser.full_name}</h3>
                            <p className="text-sm text-gray-500">@{match.otherUser.username}</p>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {getSkillLevelEmoji(match.otherUser.skill_level)} {match.otherUser.skill_level}
                            </Badge>
                            {match.otherUser.handicap && (
                              <Badge variant="outline">
                                Handicap: {match.otherUser.handicap}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            📍 {match.otherUser.location}
                          </p>
                        </div>

                        {match.otherUser.bio && (
                          <div className="mb-4">
                            <Separator className="mb-2" />
                            <p className="text-sm text-gray-600 italic">
                              "{match.otherUser.bio}"
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleMatchResponse(match.id, 'accepted')}
                            className="flex-1"
                            variant="default"
                          >
                            Accept ✅
                          </Button>
                          <Button 
                            onClick={() => handleMatchResponse(match.id, 'declined')}
                            className="flex-1"
                            variant="outline"
                          >
                            Decline ❌
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sent" className="mt-6">
              {pendingSent.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No pending buddy requests sent.</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Visit the "Find Buddies" tab to send requests to potential golf partners!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pendingSent.map((match: BuddyMatchWithUser) => (
                    <Card key={match.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4 mb-4">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-orange-100 text-orange-700">
                              {getUserInitials(match.otherUser.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold">{match.otherUser.full_name}</h3>
                            <p className="text-sm text-gray-500">@{match.otherUser.username}</p>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          <Badge variant="outline">
                            {getSkillLevelEmoji(match.otherUser.skill_level)} {match.otherUser.skill_level}
                          </Badge>
                          <p className="text-sm text-gray-600">📍 {match.otherUser.location}</p>
                        </div>

                        <Badge variant="secondary" className="w-full justify-center">
                          ⏳ Awaiting Response
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="connected" className="mt-6">
              {acceptedMatches.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No connected golf buddies yet.</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Once you connect with other golfers, they'll appear here!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {acceptedMatches.map((match: BuddyMatchWithUser) => (
                    <Card key={match.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4 mb-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-green-100 text-green-700">
                              {getUserInitials(match.otherUser.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-lg">{match.otherUser.full_name}</h3>
                            <p className="text-sm text-gray-500">@{match.otherUser.username}</p>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {getSkillLevelEmoji(match.otherUser.skill_level)} {match.otherUser.skill_level}
                            </Badge>
                            {match.otherUser.handicap && (
                              <Badge variant="outline">
                                Handicap: {match.otherUser.handicap}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            📍 {match.otherUser.location}
                          </p>
                          <p className="text-sm text-gray-400">
                            Connected since {match.updated_at.toLocaleDateString()}
                          </p>
                        </div>

                        <Button className="w-full" variant="outline">
                          💬 Start Chat
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}