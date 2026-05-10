# Changelog

## [Unreleased] — 2026-05-10

### Feature — Approvals System (מערכת אישורים)

- Added `approvals` table — stores pending field reports with `time`, `author`, `text`, `scene`, `urgent`, `status`
- `POST /api/approvals` — field reporter submits a report for dispatcher approval (no auth required)
- `GET /api/approvals` — returns all pending approvals (auth required)
- `POST /api/approvals/:id/approve` — publishes report to feed with optional text edit; marks approval as `approved`
- `POST /api/approvals/:id/reject` — marks approval as `rejected`
- **ManagementScreen** — approvals now fetched from real DB, polled every 5 seconds; approve/reject call real API endpoints instead of mutating local state only
- **MobileScreen** — "שלח דיווח לאישור" button wired to `POST /api/approvals`; textarea is now controlled with loading state and toast feedback
- Fixed `framer-motion` import → `motion/react` in `ManagementScreen.tsx` (`framer-motion` is not installed)

### Architecture — Server Hardening

- Added `morgan` request logging middleware (`dev` format)
- Added global error handler — all unhandled route errors return `500` with Hebrew message instead of crashing

---

### Fix — Wording

- Changed "בתורנות" → "במשמרת" in the active shift banner dispatcher label

### Feature — Dispatcher Roster in Shift Log (יומן משמרת)

- Added `shift_operators` table — stores dispatcher names permanently for future autocomplete (INSERT OR IGNORE, no duplicates)
- Added `dispatchers TEXT DEFAULT '[]'` column to `shift_logs` with automatic migration for existing databases
- `GET /api/shifts/operators` — returns all saved operator names sorted A→Z for autocomplete
- `POST /api/shifts/start` — now accepts `dispatchers: string[]`; saves names to `shift_operators`
- `POST /api/shifts/end` — accepts updated `dispatchers[]` (team may change mid-shift); also persists to `shift_operators`
- Routes parse `dispatchers` JSON before sending to client — client always receives `string[]`, never a raw string
- **Start Shift Modal** — replaced direct button click with a proper modal; includes `DispatcherInput` for entering on-duty staff
- **`DispatcherInput` component** — tag-input with `<datalist>` autocomplete from saved names; Enter or + to add, × to remove
- **Active shift banner** — shows all on-duty dispatchers as tags below manager name
- **End Shift Modal** — includes dispatcher field to update team at handover (someone joined / left mid-shift)
- **History table** — new "צוות תורנות" column shows dispatcher tags per shift

### Architecture — Server Modularization

- Refactored monolithic `server.ts` into a domain-driven module structure under `server/`
- Each domain has its own router: `auth`, `roster`, `incidents`, `feed`, `emergency`, `evac`, `reports`, `admin`, `shifts`
- `server/db.ts` — centralized DB init, WAL mode, schema creation, migrations, and seed data
- `server/config.ts` — `JWT_SECRET` and `PORT` as single source of truth (no more duplication across route files)
- `server/types.ts` — all DB interfaces and Zod validation schemas in one place
- `server/middlewares/auth.ts` — `requireAuth` / `requireAdmin` with proper `req.user` typing (no `as any`)
- `server/middlewares/validate.ts` — generic `validateBody(schema)` middleware using Zod
- `server/express.d.ts` — Express Request type augmentation for `req.user: JWTPayload`

### Type Safety — Zero `any`

- Eliminated all `any` types across the entire codebase (server and client)
- `src/types.ts` — complete rewrite with strict interfaces: `DBRosterMember`, `DBFeedItem`, `DBIncident`, `DBActiveEventRaw`, `DBShiftLog`, `ShiftHardware`, `RosterMember`, `RoutineIncident`, `LogEntry`, `ActiveEvent`, and more
- Added `'unavailable'` to the roster state union (`field | brief | return | out | unavailable`)
- Dynamic sort in `RoutineScreen` uses `Record<string, unknown>` instead of `as any`
- `Icon` component uses `LucideProps` instead of `[key: string]: any`

### State Synchronization — Roster Single Source of Truth

- `App.tsx` is now the single source of truth for roster data, polled every 3 seconds
- Removed independent `fetchRoster()` from `RoutineScreen` and `fetchMembers()` from `AdminScreen`
- Both screens receive `roster` from the polling loop — edits in either screen reflect immediately everywhere
- Added `refreshRoster()` — targeted immediate re-fetch after any roster mutation
- The "בעלי תפקידים בשטח" metric in the dashboard is now always in sync
- Roster mapping in `App.tsx` now includes `returnTime` (was missing, caused empty return-time in edit modal)

### Shared UI — Roster State Badges

- Added `getRosterStateConfig(state)` to `src/lib/utils.ts` — single source of truth for state labels and colors
- State mappings: `field → green`, `brief → amber`, `return → blue`, `unavailable → red`, `out → red`
- Both `RoutineScreen` and `AdminScreen` use `<span className="tag sm {colorClass}">` via the helper
- Eliminated hardcoded Hebrew fallbacks and per-screen color logic

### Feature — Shift Log (יומן משמרת)

- Complete rewrite of `ShiftScreen.tsx`
- Live elapsed-time clock for the active shift (updates every second via `useNow`)
- Hardware status (`cameras / vehicles / comms`) stored as JSON, parsed and displayed as colored badges in both the handover modal and the history table
- Added **duration** column to history table (`start → end`)
- Polling every 5 seconds — shift started on another tab/browser appears automatically
- `user` received as prop from `App` instead of reading `localStorage` directly in the component
- `POST /api/shifts/end` now returns `400` with a Hebrew error message when there is no active shift to close (previously returned `success: true` silently)
- Expandable notes in history table (click to expand/collapse)

### Bug Fixes

- Fixed `ArchiveScreen` discriminator bug: renamed `type` to `reportKind` to prevent DB event `type` field from overwriting the union discriminator in `PrintWrap`
- Fixed `/api/replacements` URL in `RoutineScreen` → `/api/roster/replacements` (was 404)
- Fixed `server/routes/evac.routes.ts` — `EvacSchema` moved to `server/types.ts`, removed inline duplicate
- Restored `EvacSchema`, `EvacBody`, `JWTPayload` exports in `server/types.ts` after file was overwritten
- `DBShiftLog` and `ShiftHardware` added to `src/types.ts` — `ShiftScreen` import was broken (type not found)
