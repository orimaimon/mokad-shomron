import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type RosterStateKey = 'field' | 'brief' | 'return' | 'unavailable' | 'out';

export interface RosterStateConfig {
  label: string;
  colorClass: 'green' | 'amber' | 'blue' | 'red';
}

const ROSTER_STATE_MAP: Record<RosterStateKey, RosterStateConfig> = {
  field:       { label: 'בשטח',       colorClass: 'green' },
  brief:       { label: 'תדריך',      colorClass: 'amber' },
  return:      { label: 'בחזרה',      colorClass: 'blue'  },
  unavailable: { label: 'לא זמין',    colorClass: 'red'   },
  out:         { label: 'מחוץ לגזרה', colorClass: 'red'   },
};

export function getRosterStateConfig(state: string): RosterStateConfig {
  return ROSTER_STATE_MAP[state as RosterStateKey] ?? { label: state, colorClass: 'red' };
}
