# מוקד שומרון — מערכת שו"ב v2.5

מערכת ניהול מוקד ביטחוני בזמן אמת למועצה האזורית שומרון.  
ממשק מלא לניהול שגרה, אירועי חירום, יומן משמרת, כוח אדם ואישור דיווחים שטחיים.

---

## טכנולוגיות

| שכבה | טכנולוגיה |
|------|-----------|
| Frontend | React 19 · TypeScript · Vite |
| Backend | Express 5 · TypeScript (`tsx`) |
| DB | SQLite (`better-sqlite3`, WAL mode) |
| Real-time | Socket.io (WebSocket) |
| Auth | JWT (`jsonwebtoken`, 7d) · bcrypt |
| Validation | Zod v4 |
| Animations | Motion v12 (`motion/react`) |
| Logging | Morgan |

---

## ארכיטקטורה

```
mokad-shomron/
├── server.ts                  # Entry point — HTTP + Socket.io + Vite middleware
├── server/
│   ├── db.ts                  # SQLite init, schema, migrations, seed
│   ├── config.ts              # JWT_SECRET, PORT
│   ├── socket.ts              # Socket.io singleton + emit()
│   ├── types.ts               # DB interfaces + Zod schemas
│   ├── express.d.ts           # Express Request type augmentation
│   ├── middlewares/
│   │   ├── auth.ts            # requireAuth / requireAdmin
│   │   └── validate.ts        # validateBody(schema)
│   └── routes/
│       ├── auth.routes.ts
│       ├── roster.routes.ts
│       ├── incidents.routes.ts
│       ├── feed.routes.ts
│       ├── emergency.routes.ts
│       ├── evac.routes.ts
│       ├── shifts.routes.ts
│       ├── approvals.routes.ts
│       ├── admin.routes.ts
│       └── reports.routes.ts
└── src/
    ├── App.tsx                # State root · socket listeners · 30s fallback polling
    ├── types.ts               # Frontend interfaces
    ├── screens/
    │   ├── LoginScreen.tsx
    │   ├── DashboardScreen.tsx
    │   ├── RoutineScreen.tsx
    │   ├── EmergencyScreen.tsx
    │   ├── ManagementScreen.tsx
    │   ├── ShiftScreen.tsx
    │   ├── AdminScreen.tsx
    │   ├── ArchiveScreen.tsx
    │   └── MobileScreen.tsx
    ├── components/
    │   ├── Icons.tsx
    │   └── Toast.tsx
    ├── hooks/
    │   └── useClock.ts
    └── lib/
        └── utils.ts           # cn() · getRosterStateConfig()
```

---

## התקנה והרצה

```bash
git clone https://github.com/orimaimon/mokad-shomron.git
cd mokad-shomron
npm install
npm run dev
```

הממשק זמין בכתובת `http://localhost:3000`.

**פרטי כניסה ברירת מחדל:**

| שדה | ערך |
|-----|-----|
| אימייל | `admin@mokad.org` |
| סיסמה | `admin123` |

---

## משתני סביבה

קובץ `.env` אופציונלי בשורש הפרויקט:

| משתנה | ברירת מחדל | תיאור |
|-------|-----------|-------|
| `JWT_SECRET` | `mokad-secret-key-2024` | מפתח חתימת JWT |
| `PORT` | `3000` | פורט השרת |

---

## מסכים

| מסך | מפתח ניווט | תיאור |
|-----|-----------|-------|
| שגרה | `1` | רשימת כוח אדם, אירועי שגרה, יומן מבצעים |
| אירוע חירום | `2` | תמונת מצב 4 עמודות, נפגעים, פינויים, מדיה |
| מצב חמ"ל | `3` | דשבורד ממ"ד ומצלמות |
| ניהול מוקד | — | יומן מבצעים, הזנת דיווחים, אישורי שטח |
| יומן משמרת | — | פתיחה/סגירת משמרת, היסטוריה, ציוד |
| ניהול מערכת | — | משתמשים + כוח אדם (Admin בלבד) |
| ממשק מדווח | — | סימולציית אפליקציית שטח |

---

## API

### Auth
| Method | Path | תיאור |
|--------|------|-------|
| POST | `/api/login` | כניסה, מחזיר JWT |

### כוח אדם
| Method | Path | תיאור |
|--------|------|-------|
| GET | `/api/roster` | רשימת בעלי תפקידים |
| POST | `/api/roster/add` | הוספת בעל תפקיד |
| POST | `/api/roster/update` | עדכון מצב / ממלא מקום |
| POST | `/api/roster/:id/edit` | עריכת פרטים |
| DELETE | `/api/roster/:id` | מחיקה |
| GET | `/api/roster/replacements` | רשימת ממלאי מקום לאוטוקומפליט |

### אירועי שגרה
| Method | Path | תיאור |
|--------|------|-------|
| GET | `/api/incidents` | כל האירועים |
| POST | `/api/incidents` | פתיחת אירוע |
| POST | `/api/incidents/:id/close` | סגירת אירוע |
| POST | `/api/incidents/:id/update` | עדכון פרטים |

### יומן מבצעים
| Method | Path | תיאור |
|--------|------|-------|
| GET | `/api/feed` | 100 הרשומות האחרונות |
| POST | `/api/feed` | הוספת רשומה |
| DELETE | `/api/feed/:id` | מחיקת רשומה |

### חירום
| Method | Path | תיאור |
|--------|------|-------|
| GET | `/api/emergency/active` | אירוע פעיל (`null` אם אין) |
| POST | `/api/emergency/start` | פתיחת אירוע |
| POST | `/api/emergency/update` | עדכון נפגעים / תיאור |
| POST | `/api/emergency/close` | סגירת אירוע |
| POST | `/api/evac` | הוספת פינוי |
| DELETE | `/api/evac/:id` | מחיקת פינוי |

### יומן משמרת
| Method | Path | תיאור |
|--------|------|-------|
| GET | `/api/shifts/active` | משמרת פעילה |
| GET | `/api/shifts` | היסטוריה (50 אחרונות) |
| POST | `/api/shifts/start` | פתיחת משמרת |
| POST | `/api/shifts/end` | סגירת משמרת (מסירה) |
| GET | `/api/shifts/operators` | שמות מוקדנים לאוטוקומפליט |

### אישורי דיווח שטחי
| Method | Path | Auth | תיאור |
|--------|------|------|-------|
| GET | `/api/approvals` | ✓ | דיווחים ממתינים לאישור |
| POST | `/api/approvals` | — | שליחת דיווח לאישור |
| POST | `/api/approvals/:id/approve` | ✓ | אישור + פרסום ביומן |
| POST | `/api/approvals/:id/reject` | ✓ | דחיית דיווח |

### ניהול (Admin בלבד)
| Method | Path | תיאור |
|--------|------|-------|
| GET | `/api/admin/users` | רשימת משתמשים |
| POST | `/api/admin/users` | הוספה / עריכת משתמש |
| DELETE | `/api/admin/users/:email` | מחיקת משתמש |

---

## Real-time — Socket.io Events

כל mutation שולח event מיידי לכל הלקוחות המחוברים:

| Event | מתי נשלח |
|-------|---------|
| `roster:changed` | add / edit / update / delete בכוח אדם |
| `incidents:changed` | פתיחה / סגירה / עדכון אירוע שגרה |
| `feed:changed` | הוספה / מחיקה / אישור דיווח |
| `emergency:changed` | פתיחה / עדכון / סגירת חירום + פינויים |
| `shifts:changed` | פתיחה / סגירת משמרת |
| `approvals:changed` | שליחה / אישור / דחיית דיווח |

הלקוח מאזין לאירועים ומבצע refetch ממוקד בלי לרענן את כל הדף. Fallback polling של 30 שניות שומר על עמידות גם אם ה-WebSocket מתנתק.

---

## הרשאות

| תפקיד | גישה |
|-------|------|
| `dispatcher` | כל המסכים למעט "ניהול מערכת" |
| `admin` | גישה מלאה כולל ניהול משתמשים |

JWT בתוקף 7 ימים. פקיעת תוקף גורמת להתנתקות אוטומטית עם הודעה.

---

## בנייה לפרודקשן

```bash
npm run build    # בונה את ה-frontend ל-dist/
npm start        # מריץ שרת פרודקשן (מגיש מ-dist/)
```
