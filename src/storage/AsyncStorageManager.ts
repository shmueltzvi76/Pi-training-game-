import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserData, UserSettings, DailyProgress, GameSession, Note, Recording, CalendarTask, Achievement } from '../types';

// מפתחות לשמירה
const STORAGE_KEYS = {
  USER_DATA: '@pi_game_user_data',
  SETTINGS: '@pi_game_settings',
  PROGRESS: '@pi_game_progress',
  SESSIONS: '@pi_game_sessions',
  NOTES: '@pi_game_notes',
  RECORDINGS: '@pi_game_recordings',
  TASKS: '@pi_game_tasks',
  ACHIEVEMENTS: '@pi_game_achievements',
  LAST_SYNC: '@pi_game_last_sync',
} as const;

// הגדרות ברירת מחדל
const DEFAULT_SETTINGS: UserSettings = {
  displayFormat: 1,
  rtlEnabled: true,
  soundEnabled: true,
  hapticEnabled: true,
  autoSyncEnabled: false,
  dailyGoal: 10,
  weeklyFrequency: 5,
  githubSyncEnabled: false,
  googleCalendarEnabled: false,
};

// מנג'ר לשמירה מקומית
class AsyncStorageManager {
  // שמירת נתונים כלליים
  async saveData<T>(key: string, data: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(data);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`Error saving data for key ${key}:`, error);
      throw error;
    }
  }

  // קריאת נתונים כלליים
  async getData<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error(`Error reading data for key ${key}:`, error);
      return null;
    }
  }

  // מחיקת נתונים
  async removeData(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing data for key ${key}:`, error);
      throw error;
    }
  }

  // שמירת הגדרות
  async saveSettings(settings: UserSettings): Promise<void> {
    await this.saveData(STORAGE_KEYS.SETTINGS, settings);
  }

  // קריאת הגדרות
  async getSettings(): Promise<UserSettings> {
    const settings = await this.getData<UserSettings>(STORAGE_KEYS.SETTINGS);
    return settings || DEFAULT_SETTINGS;
  }

  // שמירת התקדמות יומית
  async saveDailyProgress(progress: DailyProgress[]): Promise<void> {
    await this.saveData(STORAGE_KEYS.PROGRESS, progress);
  }

  // קריאת התקדמות יומית
  async getDailyProgress(): Promise<DailyProgress[]> {
    const progress = await this.getData<DailyProgress[]>(STORAGE_KEYS.PROGRESS);
    return progress || [];
  }

  // הוספת התקדמות יומית
  async addDailyProgress(progress: DailyProgress): Promise<void> {
    const allProgress = await this.getDailyProgress();
    const existingIndex = allProgress.findIndex(p => p.date === progress.date);

    if (existingIndex >= 0) {
      // עדכון קיים
      allProgress[existingIndex] = progress;
    } else {
      // הוספה חדשה
      allProgress.push(progress);
    }

    await this.saveDailyProgress(allProgress);
  }

  // שמירת סשנים
  async saveSessions(sessions: GameSession[]): Promise<void> {
    await this.saveData(STORAGE_KEYS.SESSIONS, sessions);
  }

  // קריאת סשנים
  async getSessions(): Promise<GameSession[]> {
    const sessions = await this.getData<GameSession[]>(STORAGE_KEYS.SESSIONS);
    return sessions || [];
  }

  // הוספת סשן
  async addSession(session: GameSession): Promise<void> {
    const sessions = await this.getSessions();
    sessions.push(session);
    await this.saveSessions(sessions);
  }

  // שמירת פתקים
  async saveNotes(notes: Note[]): Promise<void> {
    await this.saveData(STORAGE_KEYS.NOTES, notes);
  }

  // קריאת פתקים
  async getNotes(): Promise<Note[]> {
    const notes = await this.getData<Note[]>(STORAGE_KEYS.NOTES);
    return notes || [];
  }

  // הוספת/עדכון פתק
  async saveNote(note: Note): Promise<void> {
    const notes = await this.getNotes();
    const existingIndex = notes.findIndex(n => n.id === note.id);

    if (existingIndex >= 0) {
      notes[existingIndex] = note;
    } else {
      notes.push(note);
    }

    await this.saveNotes(notes);
  }

  // מחיקת פתק
  async deleteNote(noteId: string): Promise<void> {
    const notes = await this.getNotes();
    const filtered = notes.filter(n => n.id !== noteId);
    await this.saveNotes(filtered);
  }

  // שמירת הקלטות
  async saveRecordings(recordings: Recording[]): Promise<void> {
    await this.saveData(STORAGE_KEYS.RECORDINGS, recordings);
  }

  // קריאת הקלטות
  async getRecordings(): Promise<Recording[]> {
    const recordings = await this.getData<Recording[]>(STORAGE_KEYS.RECORDINGS);
    return recordings || [];
  }

  // הוספת הקלטה
  async addRecording(recording: Recording): Promise<void> {
    const recordings = await this.getRecordings();
    recordings.push(recording);
    await this.saveRecordings(recordings);
  }

  // מחיקת הקלטה
  async deleteRecording(recordingId: string): Promise<void> {
    const recordings = await this.getRecordings();
    const filtered = recordings.filter(r => r.id !== recordingId);
    await this.saveRecordings(filtered);
  }

  // שמירת משימות
  async saveTasks(tasks: CalendarTask[]): Promise<void> {
    await this.saveData(STORAGE_KEYS.TASKS, tasks);
  }

  // קריאת משימות
  async getTasks(): Promise<CalendarTask[]> {
    const tasks = await this.getData<CalendarTask[]>(STORAGE_KEYS.TASKS);
    return tasks || [];
  }

  // הוספת משימה
  async addTask(task: CalendarTask): Promise<void> {
    const tasks = await this.getTasks();
    tasks.push(task);
    await this.saveTasks(tasks);
  }

  // עדכון משימה
  async updateTask(taskId: string, updates: Partial<CalendarTask>): Promise<void> {
    const tasks = await this.getTasks();
    const index = tasks.findIndex(t => t.id === taskId);
    if (index >= 0) {
      tasks[index] = { ...tasks[index], ...updates };
      await this.saveTasks(tasks);
    }
  }

  // קבלת כל נתוני המשתמש
  async getAllUserData(): Promise<Partial<UserData>> {
    const [settings, progress, sessions, notes, recordings, tasks] = await Promise.all([
      this.getSettings(),
      this.getDailyProgress(),
      this.getSessions(),
      this.getNotes(),
      this.getRecordings(),
      this.getTasks(),
    ]);

    return {
      settings,
      progress,
      sessions,
      notes,
      recordings,
      calendarTasks: tasks,
      totalDigitsMastered: this.calculateMasteredDigits(progress),
      currentStreak: this.calculateCurrentStreak(progress),
      longestStreak: this.calculateLongestStreak(progress),
      achievements: [],
    };
  }

  // חישוב ספרות שמשולטות
  private calculateMasteredDigits(progress: DailyProgress[]): number {
    if (progress.length === 0) return 0;
    const latest = progress[progress.length - 1];
    return latest.currentMastery || 0;
  }

  // חישוב רצף נוכחי
  private calculateCurrentStreak(progress: DailyProgress[]): number {
    if (progress.length === 0) return 0;

    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    const sortedProgress = [...progress].sort((a, b) => b.date.localeCompare(a.date));

    for (const p of sortedProgress) {
      const date = p.date.split('T')[0];
      if (date === today || this.isConsecutiveDay(date, streak)) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  // חישוב רצף הכי ארוך
  private calculateLongestStreak(progress: DailyProgress[]): number {
    if (progress.length === 0) return 0;

    const sortedProgress = [...progress].sort((a, b) => a.date.localeCompare(b.date));
    let maxStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < sortedProgress.length; i++) {
      const prevDate = new Date(sortedProgress[i - 1].date);
      const currDate = new Date(sortedProgress[i].date);
      const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    return maxStreak;
  }

  // בדיקה אם יום רצוף
  private isConsecutiveDay(date: string, daysAgo: number): boolean {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - daysAgo);
    const targetDateStr = targetDate.toISOString().split('T')[0];
    return date === targetDateStr;
  }

  // איפוס כל הנתונים
  async clearAllData(): Promise<void> {
    const keys = Object.values(STORAGE_KEYS);
    await Promise.all(keys.map(key => this.removeData(key)));
  }
}

export default new AsyncStorageManager();
