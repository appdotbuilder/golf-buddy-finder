import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { CreateCourseInput, Course } from '../../../server/src/schema';

interface CourseManagerProps {
  courses: Course[];
  onCourseAdded: (course: Course) => void;
}

export function CourseManager({ courses, onCourseAdded }: CourseManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateCourseInput>({
    name: '',
    location: '',
    description: null,
    par: 72
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newCourse = await trpc.createCourse.mutate(formData);
      onCourseAdded(newCourse);
      setFormData({
        name: '',
        location: '',
        description: null,
        par: 72
      });
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create course:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Pre-populate with some sample courses if none exist
  const createSampleCourses = async () => {
    const sampleCourses: CreateCourseInput[] = [
      {
        name: "Pebble Beach Golf Links",
        location: "Pebble Beach, CA",
        description: "World-famous oceanside course with stunning views of Monterey Bay",
        par: 72
      },
      {
        name: "Golden Gate Park Golf Course", 
        location: "San Francisco, CA",
        description: "Historic municipal course in the heart of San Francisco",
        par: 72
      },
      {
        name: "Stanford Golf Course",
        location: "Palo Alto, CA", 
        description: "Championship course home to Stanford Cardinal golf teams",
        par: 70
      }
    ];

    setIsLoading(true);
    try {
      for (const courseData of sampleCourses) {
        const course = await trpc.createCourse.mutate(courseData);
        onCourseAdded(course);
      }
    } catch (error) {
      console.error('Failed to create sample courses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Golf Courses ({courses.length})</CardTitle>
          <div className="flex gap-2">
            {courses.length === 0 && (
              <Button onClick={createSampleCourses} disabled={isLoading} variant="outline">
                {isLoading ? 'Adding...' : 'Add Sample Courses 🏌️'}
              </Button>
            )}
            <Button 
              onClick={() => setShowForm(!showForm)} 
              variant={showForm ? "outline" : "default"}
            >
              {showForm ? 'Cancel' : 'Add Course ⛳'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="course-name">Course Name</Label>
                <Input
                  id="course-name"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateCourseInput) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Pebble Beach Golf Links"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="course-location">Location</Label>
                <Input
                  id="course-location"
                  value={formData.location}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateCourseInput) => ({ ...prev, location: e.target.value }))
                  }
                  placeholder="e.g. Pebble Beach, CA"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="course-par">Par</Label>
                <Input
                  id="course-par"
                  type="number"
                  value={formData.par}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateCourseInput) => ({ ...prev, par: parseInt(e.target.value) || 72 }))
                  }
                  min="60"
                  max="80"
                  required
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="course-description">Description (optional)</Label>
                <Textarea
                  id="course-description"
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateCourseInput) => ({ 
                      ...prev, 
                      description: e.target.value || null 
                    }))
                  }
                  placeholder="Describe the course features, difficulty, scenery..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
            
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating Course...' : 'Create Course ⛳'}
            </Button>
          </form>
        )}

        {courses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No golf courses available yet.</p>
            <p className="text-sm text-gray-400">
              Add some courses to help golfers find great places to play! 🏌️‍♂️
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((course: Course) => (
              <Card key={course.id} className="bg-white">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2">⛳ {course.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">📍 {course.location}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">Par {course.par}</Badge>
                    <Badge variant="secondary">
                      Added {course.created_at.toLocaleDateString()}
                    </Badge>
                  </div>
                  {course.description && (
                    <p className="text-sm text-gray-700 italic">"{course.description}"</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}