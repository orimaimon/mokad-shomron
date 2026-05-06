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
  startedAt: number;
  snapshotAt: string;
  casualties: CasualtyData;
  missing: MissingData;
  forces: Force[];
  evac: Evacuation[];
  description: string;
}

export interface LogEntry {
  t: string;
  src: string;
  text: string;
  urgent?: boolean;
  system?: boolean;
}

export interface ApprovalRequest {
  id: string;
  time: string;
  author: string;
  text: string;
  attachments?: number;
  scene?: string | null;
  urgent?: boolean;
}

export interface RoutineIncident {
  id: string;
  t: string;
  type: string;
  loc: string;
  status: string;
  sev: 'amber' | 'green' | 'red' | 'blue';
}

export interface RosterMember {
  name: string;
  role: string;
  task: string;
  out: string;
  state: 'field' | 'brief' | 'return';
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
