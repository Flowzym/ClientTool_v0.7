/**
 * Tests for follow-up filter boundary semantics
 * Covers today/overdue/next7 filters with local timezone boundaries
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock date utilities for controlled testing
const mockDate = vi.hoisted(() => ({
  now: new Date('2024-01-15T14:30:00Z') // Fixed test time: Monday, Jan 15, 2024, 14:30 UTC
}));

// Pure functions for follow-up filtering (extracted from board logic)
function isToday(followUpISO: string, referenceDate = new Date()): boolean {
  try {
    const followUpDate = new Date(followUpISO);
    
    return followUpDate.getFullYear() === referenceDate.getFullYear() &&
           followUpDate.getMonth() === referenceDate.getMonth() &&
           followUpDate.getDate() === referenceDate.getDate();
  } catch {
    return false;
  }
}

function isOverdue(followUpISO: string, referenceDate = new Date()): boolean {
  try {
    const followUpDate = new Date(followUpISO);
    const startOfToday = new Date(referenceDate);
    startOfToday.setHours(0, 0, 0, 0);
    
    return followUpDate < startOfToday;
  } catch {
    return false;
  }
}

function isNext7Days(followUpISO: string, referenceDate = new Date()): boolean {
  try {
    const followUpDate = new Date(followUpISO);
    const startOfToday = new Date(referenceDate);
    startOfToday.setHours(0, 0, 0, 0);
    
    const endOfNext7 = new Date(startOfToday);
    endOfNext7.setDate(endOfNext7.getDate() + 7);
    endOfNext7.setHours(23, 59, 59, 999);
    
    return followUpDate >= startOfToday && followUpDate <= endOfNext7;
  } catch {
    return false;
  }
}

describe('Follow-up Filter Boundaries', () => {
  beforeEach(() => {
    // Mock Date constructor to return fixed test time
    vi.useFakeTimers();
    vi.setSystemTime(mockDate.now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('today filter (inclusive boundaries)', () => {
    it('should include follow-ups at start of day (00:00)', () => {
      const startOfDay = '2024-01-15T00:00:00Z'; // Midnight UTC
      expect(isToday(startOfDay)).toBe(true);
    });

    it('should include follow-ups at end of day (23:59)', () => {
      const endOfDay = '2024-01-15T23:59:59Z'; // Just before midnight UTC
      expect(isToday(endOfDay)).toBe(true);
    });

    it('should include follow-ups during business hours', () => {
      const businessHours = [
        '2024-01-15T08:00:00Z', // 8 AM UTC
        '2024-01-15T12:00:00Z', // Noon UTC
        '2024-01-15T17:00:00Z'  // 5 PM UTC
      ];

      businessHours.forEach(time => {
        expect(isToday(time)).toBe(true);
      });
    });

    it('should exclude yesterday', () => {
      const yesterday = [
        '2024-01-14T23:59:59Z', // Last second of yesterday
        '2024-01-14T12:00:00Z', // Yesterday noon
        '2024-01-14T00:00:00Z'  // Start of yesterday
      ];

      yesterday.forEach(time => {
        expect(isToday(time)).toBe(false);
      });
    });

    it('should exclude tomorrow', () => {
      const tomorrow = [
        '2024-01-16T00:00:00Z', // First second of tomorrow
        '2024-01-16T12:00:00Z', // Tomorrow noon
        '2024-01-16T23:59:59Z'  // End of tomorrow
      ];

      tomorrow.forEach(time => {
        expect(isToday(time)).toBe(false);
      });
    });
  });

  describe('overdue filter (before today)', () => {
    it('should include dates from yesterday', () => {
      const yesterdayTimes = [
        '2024-01-14T23:59:59Z', // Last second of yesterday
        '2024-01-14T12:00:00Z', // Yesterday noon
        '2024-01-14T00:00:00Z'  // Start of yesterday
      ];

      yesterdayTimes.forEach(time => {
        expect(isOverdue(time)).toBe(true);
      });
    });

    it('should include dates from last week', () => {
      const lastWeek = [
        '2024-01-08T10:00:00Z', // One week ago
        '2024-01-10T15:30:00Z', // Few days ago
        '2024-01-01T00:00:00Z'  // Start of month
      ];

      lastWeek.forEach(time => {
        expect(isOverdue(time)).toBe(true);
      });
    });

    it('should exclude today (even early morning)', () => {
      const todayTimes = [
        '2024-01-15T00:00:00Z', // Start of today
        '2024-01-15T06:00:00Z', // Early morning
        '2024-01-15T23:59:59Z'  // End of today
      ];

      todayTimes.forEach(time => {
        expect(isOverdue(time)).toBe(false);
      });
    });

    it('should exclude future dates', () => {
      const futureTimes = [
        '2024-01-16T00:00:00Z', // Tomorrow
        '2024-01-22T10:00:00Z', // Next week
        '2024-02-15T12:00:00Z'  // Next month
      ];

      futureTimes.forEach(time => {
        expect(isOverdue(time)).toBe(false);
      });
    });
  });

  describe('next 7 days filter (inclusive)', () => {
    it('should include today', () => {
      const todayTimes = [
        '2024-01-15T00:00:00Z', // Start of today
        '2024-01-15T12:00:00Z', // Noon today
        '2024-01-15T23:59:59Z'  // End of today
      ];

      todayTimes.forEach(time => {
        expect(isNext7Days(time)).toBe(true);
      });
    });

    it('should include next 7 days (inclusive)', () => {
      const next7Days = [
        '2024-01-16T10:00:00Z', // Tomorrow
        '2024-01-17T15:30:00Z', // Day after tomorrow
        '2024-01-21T09:00:00Z', // Weekend
        '2024-01-22T23:59:59Z'  // Exactly 7 days later (end of day)
      ];

      next7Days.forEach(time => {
        expect(isNext7Days(time)).toBe(true);
      });
    });

    it('should exclude dates beyond 7 days', () => {
      const beyond7Days = [
        '2024-01-23T00:00:00Z', // 8 days later (start of day)
        '2024-01-25T12:00:00Z', // 10 days later
        '2024-02-15T10:00:00Z'  // Next month
      ];

      beyond7Days.forEach(time => {
        expect(isNext7Days(time)).toBe(false);
      });
    });

    it('should exclude overdue dates', () => {
      const overdueTimes = [
        '2024-01-14T23:59:59Z', // Yesterday
        '2024-01-08T10:00:00Z', // Last week
        '2024-01-01T00:00:00Z'  // Start of month
      ];

      overdueTimes.forEach(time => {
        expect(isNext7Days(time)).toBe(false);
      });
    });
  });

  describe('timezone handling', () => {
    it('should handle different timezones consistently', () => {
      // Test with different system timezones
      const timezoneTests = [
        { tz: 'UTC', offset: 0 },
        { tz: 'Europe/Vienna', offset: 1 }, // CET
        { tz: 'America/New_York', offset: -5 } // EST
      ];

      timezoneTests.forEach(({ tz, offset }) => {
        // Simulate timezone by adjusting reference date
        const localRef = new Date(mockDate.now.getTime() + offset * 60 * 60 * 1000);
        
        // Same UTC time should be "today" in all timezones when adjusted
        const todayInTz = '2024-01-15T12:00:00Z';
        expect(isToday(todayInTz, localRef)).toBe(true);
      });
    });

    it('should handle DST transitions gracefully', () => {
      // Test around DST transition dates (approximate)
      const dstDates = [
        '2024-03-31T01:00:00Z', // Spring forward (Europe)
        '2024-10-27T01:00:00Z', // Fall back (Europe)
        '2024-03-10T07:00:00Z', // Spring forward (US)
        '2024-11-03T06:00:00Z'  // Fall back (US)
      ];

      dstDates.forEach(date => {
        // Should not throw errors during DST transitions
        expect(() => isToday(date)).not.toThrow();
        expect(() => isOverdue(date)).not.toThrow();
        expect(() => isNext7Days(date)).not.toThrow();
      });
    });
  });

  describe('filter stability', () => {
    it('should return consistent results throughout the day', () => {
      const followUpDate = '2024-01-16T10:00:00Z'; // Tomorrow
      
      // Test at different times of the reference day
      const timesOfDay = [
        new Date('2024-01-15T00:00:00Z'), // Start of day
        new Date('2024-01-15T06:00:00Z'), // Early morning
        new Date('2024-01-15T12:00:00Z'), // Noon
        new Date('2024-01-15T18:00:00Z'), // Evening
        new Date('2024-01-15T23:59:59Z')  // End of day
      ];

      timesOfDay.forEach(refTime => {
        expect(isToday(followUpDate, refTime)).toBe(false);
        expect(isOverdue(followUpDate, refTime)).toBe(false);
        expect(isNext7Days(followUpDate, refTime)).toBe(true);
      });
    });

    it('should handle boundary transitions correctly', () => {
      // Test the exact moment when "today" becomes "yesterday"
      const endOfToday = new Date('2024-01-15T23:59:59Z');
      const startOfTomorrow = new Date('2024-01-16T00:00:00Z');
      
      const todayFollowUp = '2024-01-15T12:00:00Z';
      
      expect(isToday(todayFollowUp, endOfToday)).toBe(true);
      expect(isToday(todayFollowUp, startOfTomorrow)).toBe(false);
      expect(isOverdue(todayFollowUp, startOfTomorrow)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle invalid ISO strings gracefully', () => {
      const invalidISO = [
        'invalid-date',
        '2024-13-45T25:70:70Z', // Invalid components
        '2024-01-15T25:00:00Z', // Invalid hour
        '2024-01-32T10:00:00Z', // Invalid day
        ''
      ];

      invalidISO.forEach(invalid => {
        expect(isToday(invalid)).toBe(false);
        expect(isOverdue(invalid)).toBe(false);
        expect(isNext7Days(invalid)).toBe(false);
      });
    });

    it('should handle malformed reference dates', () => {
      const validFollowUp = '2024-01-16T10:00:00Z';
      const invalidRef = new Date('invalid');
      
      // Should not crash with invalid reference date
      expect(() => isToday(validFollowUp, invalidRef)).not.toThrow();
      expect(() => isOverdue(validFollowUp, invalidRef)).not.toThrow();
      expect(() => isNext7Days(validFollowUp, invalidRef)).not.toThrow();
    });
  });

  describe('real-world scenarios', () => {
    it('should handle typical follow-up scheduling patterns', () => {
      const referenceDate = new Date('2024-01-15T10:00:00Z'); // Monday
      
      const schedulePatterns = [
        { date: '2024-01-15T14:00:00Z', desc: 'Same day afternoon', today: true, overdue: false, next7: true },
        { date: '2024-01-16T09:00:00Z', desc: 'Next day morning', today: false, overdue: false, next7: true },
        { date: '2024-01-19T10:00:00Z', desc: 'End of week', today: false, overdue: false, next7: true },
        { date: '2024-01-22T15:00:00Z', desc: 'Next Monday', today: false, overdue: false, next7: true },
        { date: '2024-01-23T09:00:00Z', desc: 'Beyond 7 days', today: false, overdue: false, next7: false },
        { date: '2024-01-12T10:00:00Z', desc: 'Last Friday', today: false, overdue: true, next7: false }
      ];

      schedulePatterns.forEach(({ date, desc, today, overdue, next7 }) => {
        expect(isToday(date, referenceDate)).toBe(today);
        expect(isOverdue(date, referenceDate)).toBe(overdue);
        expect(isNext7Days(date, referenceDate)).toBe(next7);
      });
    });

    it('should handle weekend and holiday scheduling', () => {
      const fridayRef = new Date('2024-01-19T10:00:00Z'); // Friday
      
      const weekendSchedule = [
        { date: '2024-01-20T10:00:00Z', desc: 'Saturday', next7: true },
        { date: '2024-01-21T10:00:00Z', desc: 'Sunday', next7: true },
        { date: '2024-01-22T09:00:00Z', desc: 'Next Monday', next7: true },
        { date: '2024-01-26T17:00:00Z', desc: 'Next Friday (exactly 7 days)', next7: true },
        { date: '2024-01-27T00:00:00Z', desc: 'Beyond 7 days', next7: false }
      ];

      weekendSchedule.forEach(({ date, desc, next7 }) => {
        expect(isNext7Days(date, fridayRef)).toBe(next7);
      });
    });

    it('should handle month boundaries correctly', () => {
      const endOfMonth = new Date('2024-01-31T10:00:00Z'); // Last day of January
      
      const monthBoundary = [
        { date: '2024-01-31T15:00:00Z', desc: 'Same day', today: true },
        { date: '2024-02-01T09:00:00Z', desc: 'Next month start', next7: true },
        { date: '2024-02-07T23:59:59Z', desc: 'Exactly 7 days later', next7: true },
        { date: '2024-02-08T00:00:00Z', desc: 'Beyond 7 days', next7: false }
      ];

      monthBoundary.forEach(({ date, desc, today, next7 }) => {
        if (today !== undefined) {
          expect(isToday(date, endOfMonth)).toBe(today);
        }
        if (next7 !== undefined) {
          expect(isNext7Days(date, endOfMonth)).toBe(next7);
        }
      });
    });
  });

  describe('filter combination logic', () => {
    it('should have mutually exclusive today and overdue filters', () => {
      const testDates = [
        '2024-01-14T12:00:00Z', // Yesterday
        '2024-01-15T12:00:00Z', // Today
        '2024-01-16T12:00:00Z'  // Tomorrow
      ];

      testDates.forEach(date => {
        const todayResult = isToday(date);
        const overdueResult = isOverdue(date);
        
        // Should never be both today and overdue
        expect(todayResult && overdueResult).toBe(false);
      });
    });

    it('should handle edge case where today overlaps with next7', () => {
      const todayDate = '2024-01-15T12:00:00Z';
      
      // Today should be included in both "today" and "next7" filters
      expect(isToday(todayDate)).toBe(true);
      expect(isNext7Days(todayDate)).toBe(true);
      expect(isOverdue(todayDate)).toBe(false);
    });

    it('should categorize all possible follow-up dates correctly', () => {
      const allCategories = [
        { date: '2024-01-10T10:00:00Z', category: 'overdue' },
        { date: '2024-01-15T10:00:00Z', category: 'today' },
        { date: '2024-01-18T10:00:00Z', category: 'next7' },
        { date: '2024-01-25T10:00:00Z', category: 'future' }
      ];

      allCategories.forEach(({ date, category }) => {
        const results = {
          overdue: isOverdue(date),
          today: isToday(date),
          next7: isNext7Days(date) && !isToday(date), // Exclude today from next7 for this test
          future: !isOverdue(date) && !isToday(date) && !isNext7Days(date)
        };

        // Exactly one category should be true
        const trueCategories = Object.entries(results).filter(([, value]) => value);
        expect(trueCategories).toHaveLength(1);
        expect(trueCategories[0][0]).toBe(category);
      });
    });
  });

  describe('performance and stability', () => {
    it('should handle large datasets efficiently', () => {
      const largeDateSet = Array.from({ length: 1000 }, (_, i) => {
        const date = new Date('2024-01-01T00:00:00Z');
        date.setDate(date.getDate() + i);
        return date.toISOString();
      });

      const start = performance.now();
      
      const results = largeDateSet.map(date => ({
        today: isToday(date),
        overdue: isOverdue(date),
        next7: isNext7Days(date)
      }));
      
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(100); // Should be fast
      expect(results.length).toBe(1000);
      
      // Should have reasonable distribution
      const todayCount = results.filter(r => r.today).length;
      const overdueCount = results.filter(r => r.overdue).length;
      const next7Count = results.filter(r => r.next7).length;
      
      expect(todayCount).toBe(1); // Only one "today"
      expect(overdueCount).toBe(14); // 14 days before reference date
      expect(next7Count).toBe(8); // Today + 7 days
    });

    it('should be deterministic for same input', () => {
      const testDate = '2024-01-16T10:00:00Z';
      
      const results1 = Array.from({ length: 100 }, () => ({
        today: isToday(testDate),
        overdue: isOverdue(testDate),
        next7: isNext7Days(testDate)
      }));

      const results2 = Array.from({ length: 100 }, () => ({
        today: isToday(testDate),
        overdue: isOverdue(testDate),
        next7: isNext7Days(testDate)
      }));

      expect(results1).toEqual(results2);
    });
  });

  describe('integration with board filters', () => {
    it('should work with board filter chip logic', () => {
      // Simulate board filter application
      const clients = [
        { id: '1', followUp: '2024-01-14T10:00:00Z' }, // Overdue
        { id: '2', followUp: '2024-01-15T14:00:00Z' }, // Today
        { id: '3', followUp: '2024-01-18T09:00:00Z' }, // Next 7
        { id: '4', followUp: '2024-01-25T10:00:00Z' }, // Future
        { id: '5', followUp: undefined }               // No follow-up
      ];

      // Apply overdue filter
      const overdueClients = clients.filter(c => 
        c.followUp && isOverdue(c.followUp)
      );
      expect(overdueClients).toHaveLength(1);
      expect(overdueClients[0].id).toBe('1');

      // Apply today filter
      const todayClients = clients.filter(c => 
        c.followUp && isToday(c.followUp)
      );
      expect(todayClients).toHaveLength(1);
      expect(todayClients[0].id).toBe('2');

      // Apply next 7 days filter
      const next7Clients = clients.filter(c => 
        c.followUp && isNext7Days(c.followUp)
      );
      expect(next7Clients).toHaveLength(2); // Today + next 7
      expect(next7Clients.map(c => c.id).sort()).toEqual(['2', '3']);
    });
  });
});