// ערכת צבעים מודרנית - סגנון רציני, קליל וכייפי
export const Colors = {
  // Primary - גוונים כחולים-סגולים מודרניים
  primary: '#6366F1',        // Indigo עיקרי
  primaryLight: '#818CF8',   // Indigo בהיר
  primaryDark: '#4F46E5',    // Indigo כהה

  // Secondary - גוונים ורודים-סגולים
  secondary: '#EC4899',      // Pink
  secondaryLight: '#F472B6', // Pink בהיר
  secondaryDark: '#DB2777',  // Pink כהה

  // Accent - גוונים טורקיז לתוספות
  accent: '#14B8A6',         // Teal
  accentLight: '#2DD4BF',    // Teal בהיר

  // Background
  background: '#0F172A',     // כחול-שחור כהה
  backgroundLight: '#1E293B', // כחול-אפור
  backgroundCard: '#1E293B',  // כרטיסים
  backgroundInput: '#334155', // שדות קלט

  // Surface
  surface: '#1E293B',
  surfaceLight: '#334155',
  surfaceHover: '#475569',

  // Text
  text: '#F1F5F9',           // לבן כמעט
  textSecondary: '#94A3B8',  // אפור בהיר
  textMuted: '#64748B',      // אפור
  textDisabled: '#475569',   // אפור כהה

  // Status
  success: '#10B981',        // ירוק
  error: '#EF4444',          // אדום
  warning: '#F59E0B',        // כתום
  info: '#3B82F6',           // כחול

  // Game specific
  correct: '#10B981',        // תשובה נכונה
  incorrect: '#EF4444',      // תשובה שגויה
  heart: '#EF4444',          // לבבות

  // Borders
  border: '#334155',
  borderLight: '#475569',
  borderFocus: '#6366F1',

  // Overlays
  overlay: 'rgba(15, 23, 42, 0.8)',
  overlayLight: 'rgba(15, 23, 42, 0.6)',

  // Transparent
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type ColorKey = keyof typeof Colors;
