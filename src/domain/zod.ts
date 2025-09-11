import { z } from 'zod';
import type { Priority, Status, Result, Channel, ContactLog, Client, Role, User, ImportSession } from './models';

// Helper für ISO-Datumstrings (tolerant, aber validiert Format)
const isoDateString = z.string().regex(
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/,
  'Muss ISO-Datumsformat sein (YYYY-MM-DD oder ISO 8601)'
);

// Enum-Schemas
export const PrioritySchema = z.enum(['niedrig', 'normal', 'hoch', 'dringend']) satisfies z.ZodType<Priority>;

export const StatusSchema = z.enum([
  'offen',
  'inBearbeitung', 
  'terminVereinbart',
  'wartetRueckmeldung',
  'dokumenteOffen',
  'foerderAbklaerung',
  'zugewiesenExtern',
  'ruht',
  'erledigt',
  'nichtErreichbar',
  'abgebrochen'
]) satisfies z.ZodType<Status>;

export const ResultSchema = z.enum([
  'infogespraech',
  'terminFixiert',
  'nachrichtHinterlassen',
  'rueckrufZugesagt',
  'keineReaktion',
  'ablehnung',
  'massnahmeBeendet',
  'vermittelt',
  'sonstiges',
  // neue Werte für Board-UI
  'bam',
  'bewerbungsbuero',
  'lebenslauf',
  'mailaustausch',
  'gesundheitlicheMassnahme',
  'uebergabeAnAMS',
  'terminNichtEingehalten',
  'keinInteresse'
]) satisfies z.ZodType<Result>;

export const ChannelSchema = z.enum([
  'telefon',
  'sms',
  'email',
  'brief',
  'vorOrt',
  'video',
  'dritt'
]) satisfies z.ZodType<Channel>;

// ContactLog Schema
export const ContactLogSchema = z.object({
  date: isoDateString,
  channel: ChannelSchema,
  note: z.string().optional()
}) satisfies z.ZodType<ContactLog>;

// Client Schema - Pflichtfelder: firstName, lastName, status, priority, contactCount, contactLog, isArchived
export const ClientSchema = z.object({
  id: z.string().min(1),
  amsId: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  birthDate: isoDateString.optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  zip: z.string().optional(),
  city: z.string().optional(),
  title: z.string().optional(),
  gender: z.string().optional(),
  svNumber: z.string().optional(),
  countryCode: z.string().optional(),
  areaCode: z.string().optional(),
  phoneNumber: z.string().optional(),
  amsBookingDate: isoDateString.optional(),
  entryDate: isoDateString.optional(),
  exitDate: isoDateString.optional(),
  amsAgentLastName: z.string().optional(),
  amsAgentFirstName: z.string().optional(),
  note: z.string().optional(),
  internalCode: z.string().optional(),

  assignedTo: z.string().optional(),
  priority: PrioritySchema,

  status: StatusSchema,
  result: ResultSchema.optional(),

  angebot: AngebotSchema.optional(),

  followUp: isoDateString.optional(),
  lastActivity: isoDateString.optional(),
  contactCount: z.number().int().min(0),
  contactLog: z.array(ContactLogSchema),

  // Provenienz & Archiv
  isArchived: z.boolean(),
  archivedAt: isoDateString.optional(),
  sourceId: z.string().optional(),
  rowKey: z.string().optional(),
  sourceRowHash: z.string().optional(),
  lastImportedAt: isoDateString.optional(),
  lastSeenInSourceAt: isoDateString.optional(),
  protectedFields: z.array(z.string()).optional(),

  // Pin-Funktionalität
  isPinned: z.boolean().optional(),
  pinnedAt: isoDateString.optional(),

  // AMS-Berater Override
  amsAdvisor: z.string().optional(),

  // Angebot
  angebot: z.enum(['BAM', 'LL/B+', 'BwB', 'NB']).optional(),

  source: z.object({
    fileName: z.string(),
    importedAt: isoDateString,
    mappingPreset: z.string().optional()
  }).optional()
}) satisfies z.ZodType<Client>;

// Role Schema
export const RoleSchema = z.enum(['admin', 'sb']) satisfies z.ZodType<Role>;

// User Schema
export const UserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: RoleSchema,
  active: z.boolean(),
  avatar: z.string().optional(),
  initials: z.string().optional()
}) satisfies z.ZodType<User>;

// ImportSession Schema
export const ImportSessionSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  createdAt: isoDateString,
  stats: z.object({
    created: z.number().int().min(0),
    updated: z.number().int().min(0),
    archived: z.number().int().min(0),
    deleted: z.number().int().min(0)
  })
}) satisfies z.ZodType<ImportSession>;

// Validation helpers
export function validateClient(data: unknown): Client {
  return ClientSchema.parse(data);
}

export function validateUser(data: unknown): User {
  return UserSchema.parse(data);
}

export function validateImportSession(data: unknown): ImportSession {
  return ImportSessionSchema.parse(data);
}

// Partial schemas für Updates
export const ClientUpdateSchema = ClientSchema.partial().required({ id: true });
export const UserUpdateSchema = UserSchema.partial().required({ id: true });