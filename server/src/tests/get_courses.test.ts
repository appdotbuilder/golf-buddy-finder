import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { coursesTable } from '../db/schema';
import { type CreateCourseInput } from '../schema';
import { getCourses } from '../handlers/get_courses';

// Test course data
const testCourse1: CreateCourseInput = {
  name: 'Pine Valley Golf Club',
  location: 'Pine Valley, NJ',
  description: 'One of the most exclusive golf courses in the world',
  par: 70
};

const testCourse2: CreateCourseInput = {
  name: 'Augusta National',
  location: 'Augusta, GA',
  description: 'Home of the Masters Tournament',
  par: 72
};

const testCourse3: CreateCourseInput = {
  name: 'Local Municipal Course',
  location: 'Anytown, USA',
  description: null,
  par: 71
};

describe('getCourses', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no courses exist', async () => {
    const result = await getCourses();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return single course when one exists', async () => {
    // Create a course in the database
    await db.insert(coursesTable)
      .values(testCourse1)
      .execute();

    const result = await getCourses();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Pine Valley Golf Club');
    expect(result[0].location).toEqual('Pine Valley, NJ');
    expect(result[0].description).toEqual('One of the most exclusive golf courses in the world');
    expect(result[0].par).toEqual(70);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return all courses when multiple exist', async () => {
    // Create multiple courses in the database
    await db.insert(coursesTable)
      .values([testCourse1, testCourse2, testCourse3])
      .execute();

    const result = await getCourses();

    expect(result).toHaveLength(3);
    
    // Check that all courses are present
    const courseNames = result.map(course => course.name);
    expect(courseNames).toContain('Pine Valley Golf Club');
    expect(courseNames).toContain('Augusta National');
    expect(courseNames).toContain('Local Municipal Course');
  });

  it('should handle courses with null descriptions', async () => {
    // Create course with null description
    await db.insert(coursesTable)
      .values(testCourse3)
      .execute();

    const result = await getCourses();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Local Municipal Course');
    expect(result[0].description).toBeNull();
    expect(result[0].par).toEqual(71);
  });

  it('should return courses with proper data types', async () => {
    // Create a course
    await db.insert(coursesTable)
      .values(testCourse1)
      .execute();

    const result = await getCourses();

    expect(result).toHaveLength(1);
    const course = result[0];
    
    // Verify data types
    expect(typeof course.id).toBe('number');
    expect(typeof course.name).toBe('string');
    expect(typeof course.location).toBe('string');
    expect(typeof course.par).toBe('number');
    expect(course.created_at).toBeInstanceOf(Date);
    
    // Description can be string or null
    expect(course.description === null || typeof course.description === 'string').toBe(true);
  });

  it('should maintain insertion order for consistent results', async () => {
    // Insert courses in specific order
    const courses = [testCourse1, testCourse2, testCourse3];
    
    for (const course of courses) {
      await db.insert(coursesTable)
        .values(course)
        .execute();
    }

    const result = await getCourses();

    expect(result).toHaveLength(3);
    // Results should be ordered by ID (insertion order)
    expect(result[0].name).toEqual('Pine Valley Golf Club');
    expect(result[1].name).toEqual('Augusta National');
    expect(result[2].name).toEqual('Local Municipal Course');
  });
});