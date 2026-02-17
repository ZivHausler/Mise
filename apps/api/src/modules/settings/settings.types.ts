import type { NotificationEventType } from './settings.schema.js';

// ─── Unit Categories ────────────────────────────────────────────────────────

export interface UnitCategory {
  id: string;
  name: string;
  createdAt: Date;
}

// ─── Units ──────────────────────────────────────────────────────────────────

export interface Unit {
  id: string;
  storeId: string | null;
  categoryId: string;
  categoryName?: string;
  name: string;
  abbreviation: string;
  conversionFactor: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Groups ─────────────────────────────────────────────────────────────────

export interface Group {
  id: string;
  storeId: string | null;
  name: string;
  color: string | null;
  icon: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Notifications ──────────────────────────────────────────────────────────

export interface NotificationPreference {
  id: string;
  userId: string;
  eventType: NotificationEventType;
  channelEmail: boolean;
  channelPush: boolean;
  channelSms: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Re-export schemas and DTO types from schema file
export {
  createUnitSchema,
  type CreateUnitDTO,
  updateUnitSchema,
  type UpdateUnitDTO,
  createGroupSchema,
  type CreateGroupDTO,
  updateGroupSchema,
  type UpdateGroupDTO,
  updateProfileSchema,
  type UpdateProfileDTO,
  NOTIFICATION_EVENT_TYPES,
  type NotificationEventType,
  notificationPrefItemSchema,
  updateNotificationPrefsSchema,
  type UpdateNotificationPrefsDTO,
} from './settings.schema.js';
