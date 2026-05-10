import { z } from 'zod';

// --- Database Row Types ---

export interface DBUser {
  id: number;
  email: string;
  password?: string;
  name: string;
  role: string;
}

export interface DBRoster {
  id: number;
  name: string;
  role: string;
  task: string;
  out_time: string;
  return_time: string;
  reason: string;
  state: string;
  is_out_of_sector: number;
  replacement: string;
  phone: string;
  operational_phone: string;
  replacement_phone: string;
}

export interface DBIncident {
  id: number;
  type: string;
  location: string;
  status: string;
  severity: string;
  created_at: string;
}

export interface DBFeed {
  id: number;
  time: string;
  src: string;
  text: string;
  urgent: number;
  system: number;
  event_id: string | null;
}

export interface DBActiveEvent {
  id: string;
  type: string;
  location: string;
  grid: string;
  scene_name: string;
  started_at: number;
  snapshot_at: string;
  description: string;
  is_active: number;
  dead: number;
  critical: number;
  serious: number;
  light: number;
  untreated: number;
  missing: number;
  trapped: number;
  map_coords: string;
}

export interface DBApproval {
  id: number;
  time: string;
  author: string;
  text: string;
  scene: string | null;
  urgent: number;
  status: string;
}

export interface DBShiftLog {
  id: number;
  manager_name: string;
  start_time: string;
  end_time: string | null;
  status: string;
  open_incidents_count: number;
  out_of_sector_count: number;
  hardware_status: string;
  notes: string;
  dispatchers: string;
}

// --- Zod API Validation Schemas ---

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const UserSchema = z.object({
  email: z.string().email(),
  password: z.string().optional(),
  name: z.string().min(1),
  role: z.enum(['dispatcher', 'admin']),
});

export const RosterAddSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
  task: z.string().optional(),
  phone: z.string().optional(),
  operational_phone: z.string().optional(),
  state: z.string().optional(),
});

export const RosterEditSchema = RosterAddSchema;

export const RosterUpdateSchema = z.object({
  id: z.number(),
  is_out_of_sector: z.boolean().optional(),
  replacement: z.string().optional(),
  replacement_phone: z.string().optional(),
  state: z.string().optional(),
  return_time: z.string().optional(),
  phone: z.string().optional(),
  operational_phone: z.string().optional(),
});

export const IncidentAddSchema = z.object({
  type: z.string().min(1),
  location: z.string().min(1),
  severity: z.string().optional(),
});

export const IncidentUpdateSchema = IncidentAddSchema.extend({
  status: z.string().min(1),
});

export const FeedAddSchema = z.object({
  src: z.string().min(1),
  text: z.string().min(1),
  urgent: z.boolean().optional(),
  system: z.boolean().optional(),
  event_id: z.string().optional(),
});

export const EmergencyStartSchema = z.object({
  type: z.string().min(1),
  location: z.string().min(1),
  grid: z.string().optional(),
  scene_name: z.string().optional(),
  description: z.string().optional(),
});

export const EmergencyUpdateSchema = z.object({
  id: z.string().min(1),
  dead: z.number().int().min(0).optional(),
  critical: z.number().int().min(0).optional(),
  serious: z.number().int().min(0).optional(),
  light: z.number().int().min(0).optional(),
  untreated: z.number().int().min(0).optional(),
  missing: z.number().int().min(0).optional(),
  trapped: z.number().int().min(0).optional(),
  description: z.string().optional(),
  map_coords: z.string().optional(),
});

export const EmergencyCloseSchema = z.object({
  id: z.string().min(1),
});

export const ShiftStartSchema = z.object({
  manager_name: z.string().min(1),
  dispatchers: z.array(z.string().min(1)).optional(),
});

export const ShiftEndSchema = z.object({
  open_incidents_count: z.number().int().min(0),
  out_of_sector_count: z.number().int().min(0),
  hardware_status: z.string(),
  notes: z.string(),
  dispatchers: z.array(z.string().min(1)).optional(),
});

export const ApprovalAddSchema = z.object({
  author: z.string().min(1),
  text: z.string().min(1),
  scene: z.string().optional(),
  urgent: z.boolean().optional(),
});

export const ApprovalApproveSchema = z.object({
  text: z.string().min(1).optional(),
});

export const EvacSchema = z.object({
  event_id: z.string().min(1),
  who: z.string().min(1),
  by: z.string().optional(),
  to: z.string().optional(),
  state: z.string().optional(),
});

export interface JWTPayload {
  id: number;
  role: string;
  name: string;
}

// Infer types from Zod schemas for handler typings
export type LoginBody = z.infer<typeof LoginSchema>;
export type UserBody = z.infer<typeof UserSchema>;
export type RosterAddBody = z.infer<typeof RosterAddSchema>;
export type RosterEditBody = z.infer<typeof RosterEditSchema>;
export type RosterUpdateBody = z.infer<typeof RosterUpdateSchema>;
export type IncidentAddBody = z.infer<typeof IncidentAddSchema>;
export type IncidentUpdateBody = z.infer<typeof IncidentUpdateSchema>;
export type FeedAddBody = z.infer<typeof FeedAddSchema>;
export type EmergencyStartBody = z.infer<typeof EmergencyStartSchema>;
export type EmergencyUpdateBody = z.infer<typeof EmergencyUpdateSchema>;
export type EmergencyCloseBody = z.infer<typeof EmergencyCloseSchema>;
export type ShiftStartBody = z.infer<typeof ShiftStartSchema>;
export type ShiftEndBody = z.infer<typeof ShiftEndSchema>;
export type ApprovalAddBody = z.infer<typeof ApprovalAddSchema>;
export type ApprovalApproveBody = z.infer<typeof ApprovalApproveSchema>;
export type EvacBody = z.infer<typeof EvacSchema>;
