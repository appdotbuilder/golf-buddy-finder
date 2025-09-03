import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { 
  User, 
  SearchBuddiesInput,
  Course
} from '../../../server/src/schema';

interface SearchBuddiesProps {
  currentUser: User;
}

export function SearchBuddies({ currentUser }: SearchBuddiesProps) {
  const [searchFilters, setSearchFilters] = useState<SearchBuddiesInput>({
    location: '',
    skill_level: undefined,
    course_id: undefined,
    time_preference: undefined,
    max_handicap_diff: undefined
  });
  
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Load courses for filter dropdown
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const coursesData = await trpc.getCourses.query();
        setCourses(coursesData);
      } catch (error) {
        console.error('Failed to load courses:', error);
      }
    };

    loadCourses();
  }, []);

  const handleSearch = async () => {
    setIsLoading(true);
    setHasSearched(true);
    try {
      const results = await trpc.searchBuddies.query(searchFilters);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendBuddyRequest = async (recipientId: number) => {
    try {
      await trpc.createBuddyMatch.mutate({
        requester_id: currentUser.id,
        recipient_id: recipientId
      });
      
      // Remove the user from search results after sending request
      setSearchResults((prev: User[]) => prev.filter((user: User) => user.id !== recipientId));
    } catch (error) {
      console.error('Failed to send buddy request:', error);
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Search Filters */}
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl">Find Your Golf Buddies 🔍</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="City, State"
                value={searchFilters.location || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchFilters((prev: SearchBuddiesInput) => ({ ...prev, location: e.target.value || undefined }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Skill Level</Label>
              <Select
                value={searchFilters.skill_level || 'all'}
                onValueChange={(value: string) =>
                  setSearchFilters((prev: SearchBuddiesInput) => ({ 
                    ...prev, 
                    skill_level: value === 'all' ? undefined : value as 'beginner' | 'intermediate' | 'advanced' | 'pro'
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any skill level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any skill level</SelectItem>
                  <SelectItem value="beginner">🌱 Beginner</SelectItem>
                  <SelectItem value="intermediate">🏌️ Intermediate</SelectItem>
                  <SelectItem value="advanced">🎯 Advanced</SelectItem>
                  <SelectItem value="pro">🏆 Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Preferred Course</Label>
              <Select
                value={searchFilters.course_id?.toString() || 'all'}
                onValueChange={(value: string) =>
                  setSearchFilters((prev: SearchBuddiesInput) => ({ 
                    ...prev, 
                    course_id: value === 'all' ? undefined : parseInt(value)
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any course</SelectItem>
                  {courses.map((course: Course) => (
                    <SelectItem key={course.id} value={course.id.toString()}>
                      ⛳ {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Preferred Time</Label>
              <Select
                value={searchFilters.time_preference || 'all'}
                onValueChange={(value: string) =>
                  setSearchFilters((prev: SearchBuddiesInput) => ({ 
                    ...prev, 
                    time_preference: value === 'all' ? undefined : value as 'morning' | 'afternoon' | 'evening' | 'weekend'
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any time</SelectItem>
                  <SelectItem value="morning">🌅 Morning</SelectItem>
                  <SelectItem value="afternoon">☀️ Afternoon</SelectItem>
                  <SelectItem value="evening">🌆 Evening</SelectItem>
                  <SelectItem value="weekend">🎯 Weekend</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_handicap_diff">Max Handicap Difference</Label>
              <Input
                id="max_handicap_diff"
                type="number"
                placeholder="e.g. 5"
                value={searchFilters.max_handicap_diff || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchFilters((prev: SearchBuddiesInput) => ({ 
                    ...prev, 
                    max_handicap_diff: e.target.value ? parseInt(e.target.value) : undefined 
                  }))
                }
              />
            </div>
          </div>

          <Button onClick={handleSearch} disabled={isLoading} className="w-full md:w-auto">
            {isLoading ? 'Searching...' : 'Search Golf Buddies 🔍'}
          </Button>
        </CardContent>
      </Card>

      {/* Search Results */}
      {hasSearched && (
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>
              Search Results ({searchResults.length} golfers found)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Searching for golf buddies...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  No golf buddies found matching your criteria. 
                </p>
                <p className="text-sm text-gray-400">
                  💡 Try adjusting your search filters or check back later as more golfers join!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map((buddy: User) => (
                  <Card key={buddy.id} className="h-full">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4 mb-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-green-100 text-green-700">
                            {getUserInitials(buddy.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-lg">{buddy.full_name}</h3>
                          <p className="text-sm text-gray-500">@{buddy.username}</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {getSkillLevelEmoji(buddy.skill_level)} {buddy.skill_level}
                          </Badge>
                          {buddy.handicap && (
                            <Badge variant="outline">
                              Handicap: {buddy.handicap}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          📍 {buddy.location}
                        </p>
                        {buddy.home_course && (
                          <p className="text-sm text-gray-600">
                            🏌️ Home: {buddy.home_course}
                          </p>
                        )}
                      </div>

                      {buddy.bio && (
                        <div className="mb-4">
                          <Separator className="mb-2" />
                          <p className="text-sm text-gray-600 italic">
                            "{buddy.bio}"
                          </p>
                        </div>
                      )}

                      <Button 
                        onClick={() => handleSendBuddyRequest(buddy.id)}
                        className="w-full"
                        variant="default"
                      >
                        Send Buddy Request 🤝
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}