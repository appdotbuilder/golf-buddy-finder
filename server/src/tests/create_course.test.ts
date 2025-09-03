import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { coursesTable } from '../db/schema';
import { type CreateCourseInput } from '../schema';
import { createCourse } from '../handlers/create_course';
import { and, eq } from 'drizzle-orm';

// Test input for creating a course
const testInput: CreateCourseInput = {
  name: 'Pebble Beach Golf Links',
  location: 'Pebble Beach, California',
  description: 'World-famous oceanside golf course with stunning views',
  par: 72
};

// Minimal test input
const minimalInput: CreateCourseInput = {
  name: 'Simple Course',
  location: 'Test City',
  description: null,
  par: 70
};

describe('createCourse', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a course with full details', async () => {
    const result = await createCourse(testInput);

    // Validate all fields
    expect(result.name).toEqual('Pebble Beach Golf Links');
    expect(result.location).toEqual('Pebble Beach, California');
    expect(result.description).toEqual('World-famous oceanside golf course with stunning views');
    expect(result.par).toEqual(72);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a course with minimal details', async () => {
    const result = await createCourse(minimalInput);

    expect(result.name).toEqual('Simple Course');
    expect(result.location).toEqual('Test City');
    expect(result.description).toBeNull();
    expect(result.par).toEqual(70);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save course to database', async () => {
    const result = await createCourse(testInput);

    // Query database to verify course was saved
    const courses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, result.id))
      .execute();

    expect(courses).toHaveLength(1);
    expect(courses[0].name).toEqual('Pebble Beach Golf Links');
    expect(courses[0].location).toEqual('Pebble Beach, California');
    expect(courses[0].description).toEqual('World-famous oceanside golf course with stunning views');
    expect(courses[0].par).toEqual(72);
    expect(courses[0].created_at).toBeInstanceOf(Date);
  });

  it('should prevent duplicate courses with same name and location', async () => {
    // Create the first course
    await createCourse(testInput);

    // Attempt to create duplicate should fail
    await expect(createCourse(testInput)).rejects.toThrow(/already exists at this location/i);
  });

  it('should allow courses with same name in different locations', async () => {
    // Create first course
    const firstCourse = await createCourse(testInput);

    // Create course with same name but different location
    const differentLocationInput: CreateCourseInput = {
      ...testInput,
      location: 'Different City, State'
    };

    const secondCourse = await createCourse(differentLocationInput);

    // Both should be created successfully
    expect(firstCourse.id).toBeDefined();
    expect(secondCourse.id).toBeDefined();
    expect(firstCourse.id).not.toEqual(secondCourse.id);
    expect(firstCourse.name).toEqual(secondCourse.name);
    expect(firstCourse.location).not.toEqual(secondCourse.location);
  });

  it('should allow courses with different names in same location', async () => {
    // Create first course
    const firstCourse = await createCourse(testInput);

    // Create course with different name but same location
    const differentNameInput: CreateCourseInput = {
      ...testInput,
      name: 'Another Great Course'
    };

    const secondCourse = await createCourse(differentNameInput);

    // Both should be created successfully
    expect(firstCourse.id).toBeDefined();
    expect(secondCourse.id).toBeDefined();
    expect(firstCourse.id).not.toEqual(secondCourse.id);
    expect(firstCourse.name).not.toEqual(secondCourse.name);
    expect(firstCourse.location).toEqual(secondCourse.location);
  });

  it('should handle various par values correctly', async () => {
    const parValues = [70, 71, 72, 73, 74];

    for (const par of parValues) {
      const courseInput: CreateCourseInput = {
        name: `Test Course Par ${par}`,
        location: 'Test Location',
        description: null,
        par: par
      };

      const result = await createCourse(courseInput);
      expect(result.par).toEqual(par);
    }
  });

  it('should query courses by name and location correctly', async () => {
    // Create test course
    await createCourse(testInput);

    // Query using proper drizzle syntax
    const courses = await db.select()
      .from(coursesTable)
      .where(and(
        eq(coursesTable.name, 'Pebble Beach Golf Links'),
        eq(coursesTable.location, 'Pebble Beach, California')
      ))
      .execute();

    expect(courses).toHaveLength(1);
    expect(courses[0].name).toEqual('Pebble Beach Golf Links');
    expect(courses[0].location).toEqual('Pebble Beach, California');
    expect(courses[0].description).toEqual('World-famous oceanside golf course with stunning views');
  });
});