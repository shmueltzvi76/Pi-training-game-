// טיפוסים עבור האפליקציה

// מצבי משחק
export type GameMode = 'training' | 'challenge';

// הגדרות משחק
export interface GameSettings {
  startDigit: number;          // ספרה להתחלה
  challengeLength: number;     // כמות ספרות לאתגר
  thinkingTime: number;        // זמן חשיבה (0 = אינסוף)
}

// סטטיסטיקות משחק
export interface GameStats {
  currentPosition: number;      // מיקום נוכחי
  correctCount: number;         // כמות תשובות נכונות
  incorrectCount: number;       // כמות תשובות שגויות
  lives: number;                // חיים נותרים
  timeElapsed: number;          // זמן שחלף (שניות)
  bestTime: number | null;      // זמן מהיר ביותר
}

// רשומת משחק בודדת
export interface GameSession {
  id: string;
  mode: GameMode;
  settings: GameSettings;
  stats: GameStats;
  date: string;                 // ISO date string
  completed: boolean;
}

// פתק לתבניות
export interface Note {
  id: string;
  title: string;                // כותרת (רצף מספרים)
  content: string;              // תוכן הפתק
  startDigit: number;           // ספרה התחלתית
  endDigit: number;             // ספרה סופית
  createdAt: string;            // ISO date string
  updatedAt: string;            // ISO date string
  textFormat?: TextFormat;      // פורמט טקסט
}

// פורמט טקסט בפתקים
export interface TextFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  fontSize?: number;
}

// הקלטה
export interface Recording {
  id: string;
  title: string;                // כותרת (ניתנת לעריכה)
  description: string;          // תיאור - כמה מספרים
  uri: string;                  // נתיב לקובץ
  duration: number;             // משך (שניות)
  createdAt: string;            // ISO date string
  startDigit?: number;          // אופציונלי - מאיזו ספרה
  endDigit?: number;            // אופציונלי - עד איזו ספרה
}

// התקדמות יומית
export interface DailyProgress {
  date: string;                 // ISO date string (רק תאריך)
  digitsLearned: number;        // כמות ספרות חדשות שנלמדו
  practiceCount: number;        // כמות תרגולים
  totalCorrect: number;         // סה"כ נכונות
  totalIncorrect: number;       // סה"כ שגויות
  timeSpent: number;            // זמן שהושקע (דקות)
  currentMastery: number;       // כמות ספרות שמשולטות
}

// משימה ביומן
export interface CalendarTask {
  id: string;
  title: string;
  description?: string;
  date: string;                 // ISO date string
  completed: boolean;
  type: 'learn' | 'practice' | 'review' | 'achievement';
  relatedDigits?: number;       // כמות ספרות קשורה
}

// הגדרות משתמש
export interface UserSettings {
  displayFormat: 1 | 2 | 5 | 10 | 15 | 20;  // פורמט תצוגת ספרות
  rtlEnabled: boolean;                     // תמיכה ב-RTL
  soundEnabled: boolean;                   // צלילים
  hapticEnabled: boolean;                  // רטט
  autoSyncEnabled: boolean;                // סנכרון אוטומטי GitHub
  dailyGoal: number;                       // יעד יומי (ספרות)
  weeklyFrequency: number;                 // כמה פעמים בשבוע
  githubSyncEnabled: boolean;              // חיבור ל-GitHub
  googleCalendarEnabled: boolean;          // חיבור ליומן גוגל
  challengeStartDigitBookmark?: number;    // סימניה - ספרת התחלה באתגר
  challengeLengthBookmark?: number;        // סימניה - אורך אתגר
  trainingStartDigitBookmark?: number;     // סימניה - ספרת התחלה באימון
}

// נתוני משתמש מלאים
export interface UserData {
  settings: UserSettings;
  progress: DailyProgress[];
  sessions: GameSession[];
  notes: Note[];
  recordings: Recording[];
  calendarTasks: CalendarTask[];
  totalDigitsMastered: number;             // סה"כ ספרות שמשולטות
  currentStreak: number;                   // רצף ימים נוכחי
  longestStreak: number;                   // רצף ימים הכי ארוך
  achievements: Achievement[];
}

// הישגים
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;                            // emoji או שם אייקון
  unlockedAt: string | null;               // ISO date string או null אם נעול
  progress: number;                        // 0-100
  target: number;                          // יעד להשגה
}

// ניווט
export type RootStackParamList = {
  Home: undefined;
  Training: { startDigit?: number };
  Challenge: { startDigit?: number; length?: number };
  Statistics: undefined;
  Notes: undefined;
  NoteDetail: { noteId: string };
  NoteEdit: { noteId?: string; startDigit?: number; endDigit?: number };
  Recordings: undefined;
  Settings: undefined;
  PiView: { startDigit?: number; format?: number };
  Calendar: undefined;
};

// סטטוס סנכרון
export interface SyncStatus {
  lastSync: string | null;                 // ISO date string
  syncing: boolean;
  error: string | null;
}
