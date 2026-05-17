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
| `MobileScreen` | אפליקציית שטח PWA עצמאית — כניסה בדוא"ל+סיסמה → שליחת דיווח לאישור |
| `AdminScreen` | CRUD משתמשים (admin בלבד) |

---

## ניתוב (Routing)

| נתיב | התנהגות |
|------|---------|
| `/` | אפליקציית המוקד השולחנית הרגילה (Sidebar + TopHeader) |
| `/mobile` | אפליקציית שטח עצמאית — ללא Sidebar/TopHeader, viewport=device-width |

### MobileScreen — Standalone PWA Mode
- `main.tsx` מזהה נתיב `/mobile` ומחליף את ה-viewport meta tag ל-`width=device-width, viewport-fit=cover`
- `App.tsx` מדלג על כל מעטפת השולחן ומרנדר `MobileScreen` בלבד
- מחלקות CSS ייעודיות: `.standalone-stage`, `.standalone-phone`, `.standalone-screen`
- תמיכה ב-safe-area-insets לאייפון (notch)
- האפליקציה מתנהגת כ-PWA: ניתן להוסיף למסך הבית עם "Add to Home Screen"

---

## API Routes (server/routes/)

| prefix | קובץ | פעולות |
|--------|------|--------|
| `/api/auth` | auth.routes.ts | POST /login |
| `/api/roster` | roster.routes.ts | GET, POST /add, POST /update, POST /:id/edit, DELETE /:id, GET /replacements |
| `/api/incidents` | incidents.routes.ts | GET (פילטר/עמוד), POST, POST /:id/update (כולל map_coords), POST /:id/close |
| `/api/feed` | feed.routes.ts | GET (src_type filter), POST, DELETE /:id |
| `/api/emergency` | emergency.routes.ts | GET /active, POST /start, POST /update, POST /close |
| `/api/approvals` | approvals.routes.ts | GET, POST, POST /:id/approve, POST /:id/reject |
| `/api/shifts` | shifts.routes.ts | GET, POST /start, POST /:id/end |
| `/api/media` | media.routes.ts | POST /upload (multer, JWT token param) |
| `/api/reports` | reports.routes.ts | GET /daily, GET /event/:id, GET /roster, GET /shift/:id, GET /osint |
| `/api/audit` | audit.routes.ts | GET (admin only) |
| `/api/admin` | admin.routes.ts | GET /users, POST /users, PUT /users/:id, DELETE /users/:id |
| `/api/analytics` | analytics.routes.ts | GET /kpi, GET /trends, GET /distribution |
| `/api/map` | map.routes.ts | GET /kml (proxy ל-Google My Maps, עד 5 redirects) |
| `/api/mobile` | mobile.routes.ts | POST /request-otp, POST /verify-otp, GET /otp (admin) — *לגאסי, לא בשימוש* |
| `/uploads/*` | static | JWT auth via query param `?token=` |

---

## קומפוננטות משותפות (src/components/)

| קובץ | תוכן |
|------|------|
| `MediaViewer.tsx` | `MediaThumb`, `MediaInline`, `Lightbox` — lightbox אחיד לכל המסכים |
| `Icons.tsx` | wrapper ל-lucide-react עם שמות עבריים-ידידותיים |
| `CommandPalette.tsx` | Ctrl+K palette גלובלי |
| `LiveMap.tsx` | מפת COP אינטראקטיבית (Leaflet): אירועים, כוחות, חירום + KML overlay מ-Google My Maps |
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
1. איש שטח נכנס ל-`domain/mobile` ומתחבר עם דוא"ל + סיסמה (`POST /api/login`)
2. שולח דיווח → `POST /api/approvals` (src_type defaults to 'field')
3. מוקדן רואה ב-`ManagementScreen` ולוחץ "אשר ופרסם"
4. `POST /api/approvals/:id/approve` → INSERT לתוך `feed` עם src_type מהאישור

**Mobile auth flow:**
- כניסה: טופס email + password → `POST /api/login` → token + user נשמרים ב-`sessionStorage`
- יציאה מהאפליקציה / סגירת הדפדפן → sessionStorage נמחק, נדרשת כניסה מחדש
- כפתור "התנתק" בטאב "אני"

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
- [x] **MobileScreen → Standalone PWA**: נתיב `/mobile` עם viewport נפרד, ללא sidebar/header
- [x] **Mobile auth**: החלפת OTP בכניסת email+password רגילה (sessionStorage)
- [x] **Mobile offline queue**: דיווחים נשמרים ב-localStorage כשאין קליטה, מסתנכרנים אוטומטית בחזרה לרשת
- [x] **AnalyticsScreen**: מסך סטטיסטיקות ומגמות (BI Dashboard) עם גרפים מבוססי `recharts`
- [x] **LiveMap COP**: מפה אינטראקטיבית בחמ"ל — Leaflet dark tiles, מרקרים לאירועים/כוחות/חירום, KML overlay מ-Google My Maps
- [x] **incidents.map_coords**: עמודת map_coords נוספה ל-incidents (migration + schema + API create + update)
- [x] **TypeScript 0 errors**: תוקנו כל שגיאות TS — RosterUpdateModal סוגר חסר, recharts formatter types, Signature component, html2pdf cast, MobileScreen headers type
- [x] **Production build תקין**: code splitting ל-4 vendor chunks (react/motion/charts/socket) — main bundle ירד מ-2.21MB ל-1.48MB; תוקן `app.get('*')` → `app.use()` לתאימות Express 5

---

## ידוע / ממתין

- [x] DashboardScreen: מצלמות סימולציה — הוחלפו במפת COP אינטראקטיבית
- [x] ArchiveScreen: חיפוש/פילטר בדוחות ישנים
- [ ] אין tests אוטומטיים
- [ ] mobile.routes.ts (OTP) — קוד לגאסי, ניתן להסיר
- [x] RoutineScreen: טופס "אירוע חדש" כולל Map Picker לבחירת נ"צ (map_coords נשלח ל-API)
- [ ] analytics + map routes — ללא JWT auth (עקבי עם שאר ה-GET routes, אך ניתן לשיקול)
- [ ] ניהול נהלים (SOP Checklists): הוספת רשימת משימות אוטומטית לפי סוג אירוע ב-EmergencyScreen
- [ ] מערכת התראות (Alerts): צלילים והתראות Toast בולטות כשיש דיווחי שדה חדשים או אירועי חירום
- [x] מפת תמונת מצב (COP): מפה חיה וגדולה ב-Dashboard המציגה אירועים, כוחות ורדיוסים בזמן אמת
- [x] Offline-First Mobile: שמירה ב-localStorage + sync אוטומטי בחזרה לרשת
- [ ] אינטגרציות חיצוניות: חיבור ל-API של פיקוד העורף (צבע אדום) או מערכות שליחת SMS

---

## ה-commit האחרון

```
017f91b feat: add Map Picker to new incident form in RoutineScreen
e50d96a fix: production build and server
309f93c docs: update SANDBOX with latest commits and TS fix entry
9c40a45 fix: resolve all TypeScript errors found during runtime check
ec4ceb7 fix: code review bugs — mobile auth headers, redirect loop, Leaflet guard, timezone
f3666d5 feat: AnalyticsScreen, LiveMap COP, standalone mobile auth + fixes
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

**אפליקציית שטח:** `http://[domain]/mobile`
