# מוקד שומרון — SANDBOX

קובץ מעקב התקדמות לשיחות עם Claude. מעודכן ידנית בסוף כל session.

---

## מה המערכת

מערכת C2 (שו"ב) למועצה האזורית שומרון. מנהלת אירועי שגרה וחירום, כוח אדם, יומן מבצעים, דוחות ותיקיית ממתינים לאישור.

**GitHub:** `orimaimon/mokad-shomron` · branch `main`

---

## Stack

| שכבה | טכנולוגיה |
|------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Backend | Express.js 5 + better-sqlite3 |
| Auth | JWT (7d) + bcrypt |
| Realtime | Socket.IO |
| Animations | motion/react |
| Icons | lucide-react |
| CSS | Dark theme בנוי מ-CSS tokens, ללא Tailwind, RTL |
| PWA | vite-plugin-pwa (service worker + offline banner) |
| Export | xlsx (XLSX), html2pdf.js (PDF) |

**Entry point:** `server/server.ts` — מגיש Vite dev middleware בפיתוח ו-`dist/` בפרודקשן.

---

## מסדי נתונים (SQLite WAL — `mokad.db`)

| טבלה | תוכן |
|------|------|
| `users` | email, password hash, name, role (admin/dispatcher) |
| `roster` | בעלי תפקידים: state, is_out_of_sector, replacement, phone, version |
| `replacements` | שמות מחליפים (autocomplete) |
| `incidents` | אירועי שגרה: type, location, status, severity, version |
| `feed` | יומן מבצעים: src_type (internal/field/osint), media, created_at |
| `active_event` | אירוע חירום פעיל: נפגעים inline, version |
| `event_forces` | כוחות באירוע |
| `event_evac` | פינויים באירוע |
| `media` | מדיה לאירוע: kind, cap, cls, dur |
| `shift_logs` | משמרות: manager, dispatchers, חפ"ק |
| `approvals` | דיווחי שדה ממתינים לאישור (+ src_type, media) |
| `action_logs` | audit trail מלא |

**מיגרציות:** מנוהלות ב-`server/db.ts` עם PRAGMA table_info() — לא try/catch עיוור.

---

## מסכים (src/screens/)

| מסך | תיאור |
|-----|-------|
| `LoginScreen` | JWT login. ברירת מחדל: `admin@mokad.org` / `admin123` |
| `RoutineScreen` | שגרה יומית: אירועים חריגים + יומן + כוח אדם |
| `EmergencyScreen` | חירום: 4 עמודות — נפגעים / מדיה / פיד / פינויים |
| `DashboardScreen` | חמ"ל: 6 מצלמות סימולציה + אירועים חיים + כוח אדם |
| `ManagementScreen` | ניהול מוקד: אישור דיווחים, הזנה ידנית, סיווג מקור |
| `ArchiveScreen` | דוחות: שגרה / אירוע / כוח אדם / משמרת / OSINT + PDF/XLSX |
| `ShiftScreen` | פתיחת/סגירת משמרת, חפ"ק |
| `MobileScreen` | ממשק שדה: OTP → שליחת דיווח לאישור |
| `AdminScreen` | CRUD משתמשים (admin בלבד) |

---

## API Routes (server/routes/)

| prefix | קובץ | פעולות |
|--------|------|--------|
| `/api/auth` | auth.routes.ts | POST /login |
| `/api/roster` | roster.routes.ts | GET, POST, PATCH /:id, DELETE /:id |
| `/api/incidents` | incidents.routes.ts | GET (פילטר/עמוד), POST, POST /:id/update, POST /:id/close |
| `/api/feed` | feed.routes.ts | GET (src_type filter), POST, DELETE /:id |
| `/api/emergency` | emergency.routes.ts | GET /active, POST /start, POST /update, POST /close |
| `/api/approvals` | approvals.routes.ts | GET, POST, POST /:id/approve, POST /:id/reject |
| `/api/shifts` | shifts.routes.ts | GET, POST /start, POST /:id/end |
| `/api/media` | media.routes.ts | POST /upload (multer, JWT token param) |
| `/api/reports` | reports.routes.ts | GET /daily, GET /event/:id, GET /roster, GET /shift/:id, GET /osint |
| `/api/audit` | audit.routes.ts | GET (admin only) |
| `/api/admin` | admin.routes.ts | GET /users, POST /users, PUT /users/:id, DELETE /users/:id |
| `/api/mobile` | mobile.routes.ts | POST /request-otp, POST /verify-otp |
| `/uploads/*` | static | JWT auth via query param `?token=` |

---

## קומפוננטות משותפות (src/components/)

| קובץ | תוכן |
|------|------|
| `MediaViewer.tsx` | `MediaThumb`, `MediaInline`, `Lightbox` — lightbox אחיד לכל המסכים |
| `Icons.tsx` | wrapper ל-lucide-react עם שמות עבריים-ידידותיים |
| `CommandPalette.tsx` | Ctrl+K palette גלובלי |
| `LiveMap.tsx` | מפה חיה לאירועים |
| `MapPicker.tsx` | בחירת נ"צ מהמפה |
| `Toast.tsx` | הודעות toast |

---

## זרימות מרכזיות

**Polling / Realtime:**
- App.tsx מאזין ל-Socket.IO events: `feed:changed`, `incidents:changed`, `emergency:changed`, `approvals:changed`
- Fallback polling כל 30 שניות

**Emergency lifecycle:**
1. `OpenEventModal` → `POST /api/emergency/start`
2. App מתחלף אוטומטית ל-`EmergencyScreen`
3. עדכונים: `POST /api/emergency/update` (version check אופטימיסטי)
4. סגירה: `POST /api/emergency/close`

**Approvals (field reports):**
1. שטח שולח דרך `MobileScreen` → `POST /api/approvals` (src_type defaults to 'field')
2. מוקדן רואה ב-`ManagementScreen` ולוחץ "אשר ופרסם"
3. `POST /api/approvals/:id/approve` → INSERT לתוך `feed` עם src_type מהאישור

**Media upload:**
- תמונות: דחיסה client-side לפני העלאה
- סרטונים: upload ישיר עם progress
- URL: `/uploads/filename?token=JWT`

---

## מה בוצע (סדר כרונולוגי)

- [x] Auth, roster, incidents, feed — CRUD בסיסי
- [x] Emergency lifecycle מלא (נפגעים, כוחות, פינויים, מדיה)
- [x] Dashboard חמ"ל עם מצלמות סימולציה
- [x] Mobile OTP + approvals system
- [x] Audit trail מלא
- [x] WebSocket real-time (Socket.IO)
- [x] PWA (service worker, manifest, offline banner)
- [x] Media upload + JWT protection על /uploads
- [x] Lightbox אחיד (MediaViewer.tsx) בכל המסכים
- [x] ArchiveScreen: דוחות שגרה / אירוע / כוח אדם / משמרת / OSINT
- [x] XLSX export לכל סוגי הדוחות
- [x] PDF download (html2pdf.js) + כפתור הדפסה נפרד
- [x] תצוגת דוח כ"ניר לבן" עם רקע אפור (report-bg על scroll container)
- [x] SQLite WAL checkpoint לאחר crash + תיקון מיגרציות (PRAGMA table_info)
- [x] feed.created_at TEXT (ללא DEFAULT — SQLite לא מקבל CURRENT_TIMESTAMP ב-ALTER)
- [x] סיווג מקור דיווח (src_type: internal/field/osint) נשמר ועובר דרך approval flow
- [x] סוג אירוע שגרה: select עם קטגוריות מוגדרות (במקום free text)

---

## ידוע / ממתין

- [ ] MobileScreen: UI מלא לשדה (OTP זורם, אך עיצוב ממתין לשיפור)
- [ ] DashboardScreen: מצלמות סימולציה — לא חיות
- [ ] ArchiveScreen: חיפוש/פילטר בדוחות ישנים
- [ ] אין tests אוטומטיים

---

## ה-commit האחרון

```
81f2e67 fix: event type category selector + approval src_type passthrough
```

---

## איך מריצים

```bash
npm install
npm run dev        # frontend (Vite :5173) + backend (:3001) במקביל
npm run build      # build ל-dist/
npm run server     # production mode (מגיש dist/ + API)
```

**ברירת מחדל:** `admin@mokad.org` / `admin123`
