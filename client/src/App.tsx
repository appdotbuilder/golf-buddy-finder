import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { ProfileForm } from '@/components/ProfileForm';
import { SearchBuddies } from '@/components/SearchBuddies';
import { ChatInterface } from '@/components/ChatInterface';
import { BuddyMatches } from '@/components/BuddyMatches';
import { CourseManager } from '@/components/CourseManager';
import { trpc } from '@/utils/trpc';
import type { User, Course } from '../../server/src/schema';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  
  const loadCurrentUser = useCallback(async () => {
    try {
      const sampleUser = await trpc.createUser.mutate({
        email: 'john.golfer@example.com',
        username: 'john_golfer',
        full_name: 'John Doe',
        skill_level: 'intermediate',
        handicap: 12,
        location: 'San Francisco, CA',
        bio: 'Love playing golf on weekends. Looking for friendly people to play with!',
        home_course: 'Pebble Beach Golf Links'
      });
      setCurrentUser(sampleUser);
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  }, []);

  const loadCourses = useCallback(async () => {
    try {
      const coursesData = await trpc.getCourses.query();
      setCourses(coursesData);
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
    loadCourses();
  }, [loadCurrentUser, loadCourses]);

  const handleCourseAdded = (newCourse: Course) => {
    setCourses((prev: Course[]) => [...prev, newCourse]);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-green-700">🏌️ Golf Buddy Finder</CardTitle>
            <CardDescription>Loading your profile...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-green-700 mb-2">
            🏌️ Golf Buddy Finder
          </h1>
          <p className="text-gray-600">
            Connect with fellow golfers and find your perfect playing partners
          </p>
        </div>

        {/* User Welcome Card */}
        <Card className="mb-8 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Welcome back, {currentUser.full_name}! 👋</CardTitle>
                <CardDescription className="mt-1">
                  <Badge variant="outline" className="mr-2">
                    {currentUser.skill_level}
                  </Badge>
                  {currentUser.handicap && (
                    <Badge variant="outline" className="mr-2">
                      Handicap: {currentUser.handicap}
                    </Badge>
                  )}
                  📍 {currentUser.location}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          {currentUser.bio && (
            <CardContent>
              <p className="text-gray-600 italic">"{currentUser.bio}"</p>
            </CardContent>
          )}
        </Card>

        {/* Main Application Tabs */}
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8 bg-white/80 backdrop-blur-sm">
            <TabsTrigger value="search" className="text-sm">
              🔍 Find Buddies
            </TabsTrigger>
            <TabsTrigger value="matches" className="text-sm">
              🤝 My Matches
            </TabsTrigger>
            <TabsTrigger value="chat" className="text-sm">
              💬 Messages
            </TabsTrigger>
            <TabsTrigger value="courses" className="text-sm">
              ⛳ Courses
            </TabsTrigger>
            <TabsTrigger value="profile" className="text-sm">
              👤 Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search">
            <SearchBuddies currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="matches">
            <BuddyMatches currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="chat">
            <ChatInterface currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="courses">
            <CourseManager 
              courses={courses}
              onCourseAdded={handleCourseAdded}
            />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileForm 
              user={currentUser} 
              onUserUpdate={(updatedUser: User) => setCurrentUser(updatedUser)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;