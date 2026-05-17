// ── Shared domain types ───────────────────────────────────────────────────

export interface User {
  name: string;
  email: string;
  role: 'admin' | 'dispatcher';
}

export interface NavItem {
  k: string;
  label: string;
  icon: string;
  cls?: string;
  admin?: boolean;
  hotkey?: string;
}

export interface OpenEventFormData {
  type: string;
  scene_name: string;
  location: string;
  grid: string;
  description: string;
  map_coords?: string;
}

// ── Raw DB types (snake_case, as returned by the API) ─────────────────────

export interface DBRosterMember {
  id: number;
  name: string;
  role: string;
  task: string;
  out_time: string;
  return_time: string;
  reason: string;
  state: 'field' | 'brief' | 'return' | 'out' | 'unavailable';
  is_out_of_sector: number;
  replacement: string;
  replacement_phone: string;
  phone: string;
  operational_phone: string;
  map_coords: string;
  version: number;
}

export interface DBFeedItem {
  id: number;
  time: string;
  src: string;
  text: string;
  urgent: number;
  system: number;
  event_id: string | null;
  src_type?: 'internal' | 'osint' | 'field';
  created_at?: string;
  media?: string | null;
}

export interface DBIncident {
  id: number;
  type: string;
  location: string;
  status: string;
  severity: string;
  sev?: string;
  created_at: string;
  version: number;
  map_coords?: string;
}

export interface DBActiveEventRaw {
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
  version: number;
  forces: Force[];
  evac: Evacuation[];
  media: unknown[];
}

// ── Frontend mapped types ─────────────────────────────────────────────────

export interface CasualtyData {
  dead: number;
  critical: number;
  serious: number;
  light: number;
  untreated: number;
}

export interface MissingData {
  missing: number;
  trapped: number;
}

export interface Force {
  name: string;
  icon: string;
  count: number;
}

export interface Evacuation {
  who: string;
  by: string;
  to: string;
  state: string;
}

export interface ActiveEvent {
  id: string;
  type: string;
  location: string;
  grid: string;
  sceneName: string;
  scene_name?: string;
  startedAt: number;
  started_at?: number;
  snapshotAt: string;
  snapshot_at?: string;
  description: string;
  forces: Force[];
  evac: Evacuation[];
  dead: number;
  critical: number;
  serious: number;
  light: number;
  untreated: number;
  missing: number;
  trapped: number;
  map_coords?: string;
  version?: number;
}

export interface LogEntry {
  id: number;
  time: string;
  t: string;
  src: string;
  text: string;
  urgent?: number | boolean;
  system?: number | boolean;
  event_id?: string | null;
  src_type?: 'internal' | 'osint' | 'field';
  created_at?: string;
  media?: string | null;
}

export interface ApprovalRequest {
  id: string;
  time: string;
  created_at?: string;
  author: string;
  text: string;
  attachments?: number;
  scene?: string | null;
  urgent?: boolean;
  media?: string | null;
}

export interface RoutineIncident {
  id: number;
  type: string;
  location: string;
  status: string;
  severity: string;
  created_at: string;
  t: string;
  loc: string;
  sev: string;
  version: number;
}

export interface RosterMember {
  id: number;
  name: string;
  role: string;
  task: string;
  out: string;
  returnTime?: string;
  return_time?: string;
  reason?: string;
  state: 'field' | 'brief' | 'return' | 'out' | 'unavailable';
  isOutOfSector?: boolean;
  is_out_of_sector?: number;
  replacement?: string;
  replacement_phone?: string;
  phone?: string;
  operational_phone?: string;
  map_coords?: string;
  version?: number;
}

export interface RoutineMetrics {
  open: number;
  today: number;
  avgResponse: string;
  online: number;
  total: number;
}

export interface ArchiveItem {
  id: string;
  date: string;
  type: string;
  loc: string;
  dur: string;
  cas: number;
  status: 'closed';
}

export interface ReportItem {
  name: string;
  date: string;
  size: string;
  kind: 'PDF' | 'XLSX';
}

export interface UserItem {
  name: string;
  email: string;
  role: string;
  last: string;
  twofa: boolean;
}

export interface MediaItem {
  i: number;
  kind: 'photo' | 'video';
  cap: string;
  t: string;
  cls: string;
  dur?: string;
}

export interface ShiftHardware {
  cameras: boolean;
  vehicles: boolean;
  comms: boolean;
  other: string;
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
  dispatchers: string[];
}

export interface MokadData {
  activeEvent: ActiveEvent;
  log: LogEntry[];
  approvals: ApprovalRequest[];
  routine: {
    incidents: RoutineIncident[];
    feed: LogEntry[];
    roster: RosterMember[];
    metrics: RoutineMetrics;
  };
  archive: ArchiveItem[];
  reports: ReportItem[];
  users: UserItem[];
  media: MediaItem[];
}
