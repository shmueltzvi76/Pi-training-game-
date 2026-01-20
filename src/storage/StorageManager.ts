import AsyncStorageManager from './AsyncStorageManager';
import GitHubSyncManager from './GitHubSync';
import { UserData, UserSettings, DailyProgress, GameSession, Note, Recording, CalendarTask, SyncStatus } from '../types';

// מנג'ר מרכזי לניהול נתונים
class StorageManager {
  private syncInProgress: boolean = false;
  private lastSyncTime: Date | null = null;

  // === הגדרות ===
  async getSettings(): Promise<UserSettings> {
    return await AsyncStorageManager.getSettings();
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    await AsyncStorageManager.saveSettings(settings);
    await this.autoSync();
  }

  // === התקדמות יומית ===
  async getDailyProgress(): Promise<DailyProgress[]> {
    return await AsyncStorageManager.getDailyProgress();
  }

  async addDailyProgress(progress: DailyProgress): Promise<void> {
    await AsyncStorageManager.addDailyProgress(progress);
    await this.autoSync();
  }

  async getTodayProgress(): Promise<DailyProgress | null> {
    const allProgress = await this.getDailyProgress();
    const today = new Date().toISOString().split('T')[0];
    return allProgress.find(p => p.date.startsWith(today)) || null;
  }

  async updateTodayProgress(updates: Partial<DailyProgress>): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    let todayProgress = await this.getTodayProgress();

    if (!todayProgress) {
      todayProgress = {
        date: today,
        digitsLearned: 0,
        practiceCount: 0,
        totalCorrect: 0,
        totalIncorrect: 0,
        timeSpent: 0,
        currentMastery: 0,
      };
    }

    const updated: DailyProgress = { ...todayProgress, ...updates };
    await AsyncStorageManager.addDailyProgress(updated);
    await this.autoSync();
  }

  // === סשנים ===
  async getSessions(): Promise<GameSession[]> {
    return await AsyncStorageManager.getSessions();
  }

  async addSession(session: GameSession): Promise<void> {
    await AsyncStorageManager.addSession(session);
    await this.autoSync();
  }

  // === פתקים ===
  async getNotes(): Promise<Note[]> {
    return await AsyncStorageManager.getNotes();
  }

  async saveNote(note: Note): Promise<void> {
    await AsyncStorageManager.saveNote(note);
    await this.autoSync();
  }

  async deleteNote(noteId: string): Promise<void> {
    await AsyncStorageManager.deleteNote(noteId);
    await this.autoSync();
  }

  async getNote(noteId: string): Promise<Note | null> {
    const notes = await this.getNotes();
    return notes.find(n => n.id === noteId) || null;
  }

  // פתק מיוחד - פתק כתב יד (הפתק העליון הקבוע)
  async getHandwritingNote(): Promise<Note | null> {
    const notes = await this.getNotes();
    return notes.find(n => n.id === 'handwriting-note') || null;
  }

  async saveHandwritingNote(content: string): Promise<void> {
    const existingNote = await this.getHandwritingNote();
    const note: Note = {
      id: 'handwriting-note',
      title: 'כתב יד - כל המספרים',
      content,
      startDigit: 0,
      endDigit: 0,
      createdAt: existingNote?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.saveNote(note);
  }

  // פתק מיוחד - ריכוז כל הטקסט (הפתק התחתון)
  async getSummaryNote(): Promise<Note | null> {
    const notes = await this.getNotes();
    return notes.find(n => n.id === 'summary-note') || null;
  }

  async updateSummaryNote(): Promise<void> {
    const notes = await this.getNotes();
    const regularNotes = notes.filter(
      n => n.id !== 'handwriting-note' && n.id !== 'summary-note'
    );

    const summaryContent = regularNotes
      .sort((a, b) => a.startDigit - b.startDigit)
      .map(n => `[${n.title}]\n${n.content}`)
      .join('\n\n---\n\n');

    const summaryNote: Note = {
      id: 'summary-note',
      title: 'ריכוז כל הפתקים',
      content: summaryContent,
      startDigit: 0,
      endDigit: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.saveNote(summaryNote);
  }

  // === הקלטות ===
  async getRecordings(): Promise<Recording[]> {
    return await AsyncStorageManager.getRecordings();
  }

  async addRecording(recording: Recording): Promise<void> {
    await AsyncStorageManager.addRecording(recording);
    await this.autoSync();
  }

  async deleteRecording(recordingId: string): Promise<void> {
    await AsyncStorageManager.deleteRecording(recordingId);
    await this.autoSync();
  }

  // === משימות ===
  async getTasks(): Promise<CalendarTask[]> {
    return await AsyncStorageManager.getTasks();
  }

  async addTask(task: CalendarTask): Promise<void> {
    await AsyncStorageManager.addTask(task);
    await this.autoSync();
  }

  async updateTask(taskId: string, updates: Partial<CalendarTask>): Promise<void> {
    await AsyncStorageManager.updateTask(taskId, updates);
    await this.autoSync();
  }

  // === כל הנתונים ===
  async getAllUserData(): Promise<Partial<UserData>> {
    return await AsyncStorageManager.getAllUserData();
  }

  // === סנכרון עם GitHub ===
  async configureGitHub(token: string, owner: string, repo: string, branch: string = 'main'): Promise<void> {
    GitHubSyncManager.configure(token, owner, repo, branch);

    // עדכן הגדרות
    const settings = await this.getSettings();
    settings.githubSyncEnabled = true;
    await AsyncStorageManager.saveSettings(settings);
  }

  async disableGitHubSync(): Promise<void> {
    GitHubSyncManager.clearConfig();

    const settings = await this.getSettings();
    settings.githubSyncEnabled = false;
    await AsyncStorageManager.saveSettings(settings);
  }

  async manualSync(): Promise<void> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    const settings = await this.getSettings();
    if (!settings.githubSyncEnabled || !GitHubSyncManager.isConfigured()) {
      throw new Error('GitHub sync not enabled or configured');
    }

    try {
      this.syncInProgress = true;

      const localData = await this.getAllUserData();
      const mergedData = await GitHubSyncManager.sync(localData);

      // עדכן נתונים מקומיים עם הנתונים הממוזגים
      if (mergedData.settings) await AsyncStorageManager.saveSettings(mergedData.settings);
      if (mergedData.progress) await AsyncStorageManager.saveDailyProgress(mergedData.progress);
      if (mergedData.sessions) await AsyncStorageManager.saveSessions(mergedData.sessions);
      if (mergedData.notes) await AsyncStorageManager.saveNotes(mergedData.notes);
      if (mergedData.recordings) await AsyncStorageManager.saveRecordings(mergedData.recordings);
      if (mergedData.calendarTasks) await AsyncStorageManager.saveTasks(mergedData.calendarTasks);

      this.lastSyncTime = new Date();
    } finally {
      this.syncInProgress = false;
    }
  }

  private async autoSync(): Promise<void> {
    const settings = await this.getSettings();
    if (settings.autoSyncEnabled && settings.githubSyncEnabled && GitHubSyncManager.isConfigured()) {
      try {
        await this.manualSync();
      } catch (error) {
        console.error('Auto sync failed:', error);
        // לא לזרוק שגיאה - auto sync אינו קריטי
      }
    }
  }

  async getSyncStatus(): Promise<SyncStatus> {
    return {
      lastSync: this.lastSyncTime?.toISOString() || null,
      syncing: this.syncInProgress,
      error: null,
    };
  }

  // === איפוס ===
  async clearAllData(): Promise<void> {
    await AsyncStorageManager.clearAllData();
  }
}

export default new StorageManager();
