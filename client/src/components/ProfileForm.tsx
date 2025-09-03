import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import { trpc } from '@/utils/trpc';
import type { 
  User, 
  UpdateUserInput, 
  Course,
  UserTimePreference
} from '../../../server/src/schema';

interface ProfileFormProps {
  user: User;
  onUserUpdate: (user: User) => void;
}

export function ProfileForm({ user, onUserUpdate }: ProfileFormProps) {
  const [formData, setFormData] = useState<UpdateUserInput>({
    id: user.id,
    email: user.email,
    username: user.username,
    full_name: user.full_name,
    skill_level: user.skill_level,
    handicap: user.handicap,
    location: user.location,
    bio: user.bio,
    home_course: user.home_course
  });

  const [courses, setCourses] = useState<Course[]>([]);
  const [userFavorites, setUserFavorites] = useState<Course[]>([]);
  const [userTimePreferences, setUserTimePreferences] = useState<UserTimePreference[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedTimePreference, setSelectedTimePreference] = useState<string>('');

  // Load courses and user preferences
  useEffect(() => {
    const loadData = async () => {
      try {
        const [coursesData, favoritesData, timePrefsData] = await Promise.all([
          trpc.getCourses.query(),
          trpc.getUserFavorites.query({ userId: user.id }),
          trpc.getUserTimePreferences.query({ userId: user.id })
        ]);
        setCourses(coursesData);
        setUserFavorites(favoritesData);
        setUserTimePreferences(timePrefsData);
      } catch (error) {
        console.error('Failed to load profile data:', error);
      }
    };

    loadData();
  }, [user.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const updatedUser = await trpc.updateUser.mutate(formData);
      if (updatedUser) {
        onUserUpdate(updatedUser);
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFavoriteCourse = async () => {
    if (!selectedCourse) return;
    
    try {
      await trpc.addFavoriteCourse.mutate({
        user_id: user.id,
        course_id: parseInt(selectedCourse)
      });
      
      // Refresh favorites list
      const updatedFavorites = await trpc.getUserFavorites.query({ userId: user.id });
      setUserFavorites(updatedFavorites);
      setSelectedCourse('');
    } catch (error) {
      console.error('Failed to add favorite course:', error);
    }
  };

  const handleAddTimePreference = async () => {
    if (!selectedTimePreference) return;
    
    try {
      await trpc.addTimePreference.mutate({
        user_id: user.id,
        time_preference: selectedTimePreference as 'morning' | 'afternoon' | 'evening' | 'weekend'
      });
      
      // Refresh time preferences list
      const updatedTimePrefs = await trpc.getUserTimePreferences.query({ userId: user.id });
      setUserTimePreferences(updatedTimePrefs);
      setSelectedTimePreference('');
    } catch (error) {
      console.error('Failed to add time preference:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Your Golf Profile ⛳</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: UpdateUserInput) => ({ ...prev, full_name: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: UpdateUserInput) => ({ ...prev, username: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: UpdateUserInput) => ({ ...prev, email: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="City, State"
                  value={formData.location || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: UpdateUserInput) => ({ ...prev, location: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="skill_level">Skill Level</Label>
                <Select
                  value={formData.skill_level}
                  onValueChange={(value: string) =>
                    setFormData((prev: UpdateUserInput) => ({ 
                      ...prev, 
                      skill_level: value as 'beginner' | 'intermediate' | 'advanced' | 'pro'
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner 🌱</SelectItem>
                    <SelectItem value="intermediate">Intermediate 🏌️</SelectItem>
                    <SelectItem value="advanced">Advanced 🎯</SelectItem>
                    <SelectItem value="pro">Pro 🏆</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="handicap">Handicap (optional)</Label>
                <Input
                  id="handicap"
                  type="number"
                  placeholder="Enter your handicap"
                  value={formData.handicap || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: UpdateUserInput) => ({ 
                      ...prev, 
                      handicap: e.target.value ? parseInt(e.target.value) : null 
                    }))
                  }
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="home_course">Home Course</Label>
                <Input
                  id="home_course"
                  placeholder="Your primary golf course"
                  value={formData.home_course || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: UpdateUserInput) => ({ ...prev, home_course: e.target.value || null }))
                  }
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell other golfers about yourself and your golf interests..."
                  value={formData.bio || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: UpdateUserInput) => ({ ...prev, bio: e.target.value || null }))
                  }
                  className="min-h-[100px]"
                />
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
              {isLoading ? 'Updating Profile...' : 'Update Profile 💾'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Favorite Courses Section */}
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Favorite Courses 🏌️‍♂️</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a course to add" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course: Course) => (
                  <SelectItem key={course.id} value={course.id.toString()}>
                    {course.name} - {course.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddFavoriteCourse} disabled={!selectedCourse}>
              Add Course
            </Button>
          </div>
          
          {userFavorites.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {userFavorites.map((course: Course) => (
                <Badge key={course.id} variant="secondary">
                  ⛳ {course.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No favorite courses added yet</p>
          )}
        </CardContent>
      </Card>

      {/* Time Preferences Section */}
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Preferred Playing Times ⏰</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedTimePreference || ''} onValueChange={setSelectedTimePreference}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select preferred time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">🌅 Morning</SelectItem>
                <SelectItem value="afternoon">☀️ Afternoon</SelectItem>
                <SelectItem value="evening">🌆 Evening</SelectItem>
                <SelectItem value="weekend">🎯 Weekend</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAddTimePreference} disabled={!selectedTimePreference}>
              Add Time
            </Button>
          </div>
          
          {userTimePreferences.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {userTimePreferences.map((timePref: UserTimePreference) => (
                <Badge key={timePref.id} variant="outline">
                  {timePref.time_preference === 'morning' && '🌅'} 
                  {timePref.time_preference === 'afternoon' && '☀️'} 
                  {timePref.time_preference === 'evening' && '🌆'} 
                  {timePref.time_preference === 'weekend' && '🎯'} 
                  {timePref.time_preference.charAt(0).toUpperCase() + timePref.time_preference.slice(1)}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No time preferences set</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}