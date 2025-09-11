/**
 * Tests für Zod-Schemas
 * Valide/invalide Beispiele für Client/User/ImportSession
 */

import { describe, it, expect } from 'vitest';
import {
  ClientSchema,
  UserSchema,
  ImportSessionSchema,
  validateClient,
  validateUser,
  validateImportSession,
  ClientUpdateSchema
} from './zod';
import type { Client, User, ImportSession } from './models';

describe('Zod Schemas', () => {
  describe('ClientSchema', () => {
    const validClient: Client = {
      id: 'client-123',
      amsId: 'AMS123456',
      firstName: 'Max',
      lastName: 'Mustermann',
      birthDate: '1990-01-15',
      phone: '+49 123 456789',
      email: 'max.mustermann@example.com',
      address: 'Musterstraße 123, 12345 Musterstadt',
      internalCode: 'INT-001',
      assignedTo: 'sb-1',
      priority: 'normal',
      status: 'offen',
      result: 'infogespraech',
      followUp: '2024-02-15',
      lastActivity: '2024-01-15T10:30:00Z',
      contactCount: 2,
      contactLog: [
        {
          date: '2024-01-15T10:30:00Z',
          channel: 'telefon',
          note: 'Erstkontakt erfolgreich'
        },
        {
          date: '2024-01-20',
          channel: 'email'
        }
      ],
      isArchived: false,
      archivedAt: undefined,
      sourceId: 'AMS-Export-KW03',
      rowKey: 'AMS123456',
      sourceRowHash: 'abc123def456',
      lastImportedAt: '2024-01-10T08:00:00Z',
      lastSeenInSourceAt: '2024-01-20T12:00:00Z',
      protectedFields: ['phone', 'email'],
      source: {
        fileName: 'ams_export_2024_kw03.xlsx',
        importedAt: '2024-01-10T08:00:00Z',
        mappingPreset: 'ams-standard'
      }
    };

    it('should validate complete valid client', () => {
      expect(() => validateClient(validClient)).not.toThrow();
      const result = validateClient(validClient);
      expect(result).toEqual(validClient);
    });

    it('should validate minimal valid client', () => {
      const minimalClient: Client = {
        id: 'client-minimal',
        firstName: 'John',
        lastName: 'Doe',
        priority: 'niedrig',
        status: 'offen',
        contactCount: 0,
        contactLog: [],
        isArchived: false
      };

      expect(() => validateClient(minimalClient)).not.toThrow();
      const result = validateClient(minimalClient);
      expect(result.id).toBe('client-minimal');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
    });

    it('should reject client with missing required fields', () => {
      const invalidClient = {
        id: 'client-invalid',
        firstName: 'John'
        // Missing lastName, priority, status, contactCount, contactLog, isArchived
      };

      expect(() => validateClient(invalidClient)).toThrow();
    });

    it('should reject client with invalid priority', () => {
      const invalidClient = {
        ...validClient,
        priority: 'invalid-priority'
      };

      expect(() => validateClient(invalidClient)).toThrow();
    });

    it('should reject client with invalid status', () => {
      const invalidClient = {
        ...validClient,
        status: 'invalid-status'
      };

      expect(() => validateClient(invalidClient)).toThrow();
    });

    it('should reject client with invalid email', () => {
      const invalidClient = {
        ...validClient,
        email: 'not-an-email'
      };

      expect(() => validateClient(invalidClient)).toThrow();
    });

    it('should accept empty email string', () => {
      const clientWithEmptyEmail = {
        ...validClient,
        email: ''
      };

      expect(() => validateClient(clientWithEmptyEmail)).not.toThrow();
    });

    it('should reject client with invalid date format', () => {
      const invalidClient = {
        ...validClient,
        birthDate: '15.01.1990' // Wrong format
      };

      expect(() => validateClient(invalidClient)).toThrow();
    });

    it('should accept various valid date formats', () => {
      const validDates = [
        '2024-01-15',
        '2024-01-15T10:30:00Z',
        '2024-01-15T10:30:00.123Z'
      ];

      validDates.forEach(date => {
        const client = {
          ...validClient,
          birthDate: date,
          followUp: date,
          lastActivity: date
        };

        expect(() => validateClient(client)).not.toThrow();
      });
    });

    it('should reject client with invalid contact log', () => {
      const invalidClient = {
        ...validClient,
        contactLog: [
          {
            date: '2024-01-15',
            channel: 'invalid-channel' // Invalid channel
          }
        ]
      };

      expect(() => validateClient(invalidClient)).toThrow();
    });

    it('should reject client with negative contact count', () => {
      const invalidClient = {
        ...validClient,
        contactCount: -1
      };

      expect(() => validateClient(invalidClient)).toThrow();
    });
  });

  describe('UserSchema', () => {
    const validUser: User = {
      id: 'user-123',
      name: 'Sachbearbeiter Test',
      role: 'sb',
      active: true
    };

    it('should validate valid user', () => {
      expect(() => validateUser(validUser)).not.toThrow();
      const result = validateUser(validUser);
      expect(result).toEqual(validUser);
    });

    it('should validate admin user', () => {
      const adminUser: User = {
        ...validUser,
        role: 'admin'
      };

      expect(() => validateUser(adminUser)).not.toThrow();
    });

    it('should reject user with missing required fields', () => {
      const invalidUser = {
        id: 'user-invalid'
        // Missing name, role, active
      };

      expect(() => validateUser(invalidUser)).toThrow();
    });

    it('should reject user with invalid role', () => {
      const invalidUser = {
        ...validUser,
        role: 'invalid-role'
      };

      expect(() => validateUser(invalidUser)).toThrow();
    });

    it('should reject user with empty name', () => {
      const invalidUser = {
        ...validUser,
        name: ''
      };

      expect(() => validateUser(invalidUser)).toThrow();
    });
  });

  describe('ImportSessionSchema', () => {
    const validSession: ImportSession = {
      id: 'session-123',
      sourceId: 'AMS-Export-KW03',
      createdAt: '2024-01-15T10:30:00Z',
      stats: {
        created: 10,
        updated: 5,
        archived: 2,
        deleted: 1
      }
    };

    it('should validate valid import session', () => {
      expect(() => validateImportSession(validSession)).not.toThrow();
      const result = validateImportSession(validSession);
      expect(result).toEqual(validSession);
    });

    it('should reject session with missing required fields', () => {
      const invalidSession = {
        id: 'session-invalid'
        // Missing sourceId, createdAt, stats
      };

      expect(() => validateImportSession(invalidSession)).toThrow();
    });

    it('should reject session with negative stats', () => {
      const invalidSession = {
        ...validSession,
        stats: {
          created: -1,
          updated: 5,
          archived: 2,
          deleted: 1
        }
      };

      expect(() => validateImportSession(invalidSession)).toThrow();
    });

    it('should reject session with invalid date', () => {
      const invalidSession = {
        ...validSession,
        createdAt: 'not-a-date'
      };

      expect(() => validateImportSession(invalidSession)).toThrow();
    });
  });

  describe('ClientUpdateSchema', () => {
    it('should validate partial client update', () => {
      const partialUpdate = {
        id: 'client-123',
        status: 'inBearbeitung' as const,
        priority: 'hoch' as const
      };

      expect(() => ClientUpdateSchema.parse(partialUpdate)).not.toThrow();
    });

    it('should require id field', () => {
      const updateWithoutId = {
        status: 'inBearbeitung' as const
      };

      expect(() => ClientUpdateSchema.parse(updateWithoutId)).toThrow();
    });

    it('should allow updating single field', () => {
      const singleFieldUpdate = {
        id: 'client-123',
        phone: '+49 987 654321'
      };

      expect(() => ClientUpdateSchema.parse(singleFieldUpdate)).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined vs null correctly', () => {
      const clientWithUndefined = {
        id: 'client-test',
        firstName: 'Test',
        lastName: 'User',
        priority: 'normal' as const,
        status: 'offen' as const,
        contactCount: 0,
        contactLog: [],
        isArchived: false,
        amsId: undefined, // Explicitly undefined
        phone: undefined
      };

      expect(() => validateClient(clientWithUndefined)).not.toThrow();
    });

    it('should reject null values for optional fields', () => {
      const clientWithNull = {
        id: 'client-test',
        firstName: 'Test',
        lastName: 'User',
        priority: 'normal' as const,
        status: 'offen' as const,
        contactCount: 0,
        contactLog: [],
        isArchived: false,
        amsId: null // null is not allowed
      };

      expect(() => validateClient(clientWithNull)).toThrow();
    });
  });
});