import { UserData } from '../types';

// Cross-platform base64 (works in React Native + Web)
const base64Decode = (str: string): string => {
  try {
    return decodeURIComponent(
      atob(str.replace(/\s/g, ''))
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    return atob(str.replace(/\s/g, ''));
  }
};

const base64Encode = (str: string): string => {
  try {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );
  } catch {
    return btoa(str);
  }
};

// מנג'ר לסנכרון עם GitHub
class GitHubSyncManager {
  private token: string | null = null;
  private repo: string | null = null;
  private owner: string | null = null;
  private branch: string = 'main';
  private dataPath: string = 'pi-game-data.json';

  // הגדרת פרטי GitHub
  configure(token: string, owner: string, repo: string, branch: string = 'main') {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.branch = branch;
  }

  // בדיקה אם מוגדר
  isConfigured(): boolean {
    return !!(this.token && this.owner && this.repo);
  }

  // קבלת נתונים מ-GitHub
  async fetchData(): Promise<Partial<UserData> | null> {
    if (!this.isConfigured()) {
      throw new Error('GitHub not configured');
    }

    try {
      const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${this.dataPath}?ref=${this.branch}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // הקובץ לא קיים עדיין
          return null;
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      const content = base64Decode(data.content);
      return JSON.parse(content);
    } catch (error) {
      console.error('Error fetching from GitHub:', error);
      throw error;
    }
  }

  // שמירת נתונים ל-GitHub
  async pushData(userData: Partial<UserData>, message: string = 'Update Pi game data'): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('GitHub not configured');
    }

    try {
      // קודם נקבל את ה-SHA הנוכחי של הקובץ (אם קיים)
      let sha: string | undefined;

      try {
        const existingFileUrl = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${this.dataPath}?ref=${this.branch}`;
        const existingResponse = await fetch(existingFileUrl, {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });

        if (existingResponse.ok) {
          const existingData = await existingResponse.json();
          sha = existingData.sha;
        }
      } catch (error) {
        // הקובץ לא קיים - זה בסדר
      }

      // המרת הנתונים ל-base64
      const content = base64Encode(JSON.stringify(userData, null, 2));

      // שליחת הנתונים
      const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${this.dataPath}`;

      const body: any = {
        message,
        content,
        branch: this.branch,
      };

      if (sha) {
        body.sha = sha;
      }

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`GitHub API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      console.log('Data successfully pushed to GitHub');
    } catch (error) {
      console.error('Error pushing to GitHub:', error);
      throw error;
    }
  }

  // סנכרון (משיכה ודחיפה)
  async sync(localData: Partial<UserData>): Promise<Partial<UserData>> {
    if (!this.isConfigured()) {
      throw new Error('GitHub not configured');
    }

    try {
      // נסה למשוך נתונים מהענן
      const remoteData = await this.fetchData();

      if (!remoteData) {
        // אין נתונים בענן - נדחוף את הנתונים המקומיים
        await this.pushData(localData, 'Initial data upload');
        return localData;
      }

      // יש נתונים בענן - נמזג אותם עם המקומיים
      const mergedData = this.mergeData(localData, remoteData);

      // נדחוף את הנתונים הממוזגים
      await this.pushData(mergedData, 'Sync local and remote data');

      return mergedData;
    } catch (error) {
      console.error('Error during sync:', error);
      throw error;
    }
  }

  // מיזוג נתונים (מקומי + ענן)
  private mergeData(local: Partial<UserData>, remote: Partial<UserData>): Partial<UserData> {
    // לוגיקת מיזוג פשוטה - נשתמש בנתונים העדכניים ביותר
    // בעתיד אפשר לשפר את זה עם conflict resolution מתקדם

    return {
      settings: remote.settings || local.settings,
      progress: this.mergeArrays(local.progress || [], remote.progress || [], 'date'),
      sessions: this.mergeArrays(local.sessions || [], remote.sessions || [], 'id'),
      notes: this.mergeArrays(local.notes || [], remote.notes || [], 'id'),
      recordings: this.mergeArrays(local.recordings || [], remote.recordings || [], 'id'),
      calendarTasks: this.mergeArrays(local.calendarTasks || [], remote.calendarTasks || [], 'id'),
      totalDigitsMastered: Math.max(
        local.totalDigitsMastered || 0,
        remote.totalDigitsMastered || 0
      ),
      currentStreak: Math.max(
        local.currentStreak || 0,
        remote.currentStreak || 0
      ),
      longestStreak: Math.max(
        local.longestStreak || 0,
        remote.longestStreak || 0
      ),
      achievements: this.mergeArrays(local.achievements || [], remote.achievements || [], 'id'),
    };
  }

  // מיזוג מערכים לפי מפתח ייחודי
  private mergeArrays<T extends Record<string, any>>(
    local: T[],
    remote: T[],
    keyField: keyof T
  ): T[] {
    const merged = new Map<any, T>();

    // הוסף את כל האיברים המקומיים
    local.forEach(item => {
      merged.set(item[keyField], item);
    });

    // הוסף/עדכן עם איברים מהענן
    remote.forEach(item => {
      const existingItem = merged.get(item[keyField]);

      if (!existingItem) {
        // אין מקומי - הוסף מהענן
        merged.set(item[keyField], item);
      } else {
        // יש גם מקומי וגם בענן - בחר את העדכני יותר
        const localDate = (existingItem as any).updatedAt || (existingItem as any).createdAt || (existingItem as any).date;
        const remoteDate = (item as any).updatedAt || (item as any).createdAt || (item as any).date;

        if (remoteDate && localDate && new Date(remoteDate) > new Date(localDate)) {
          merged.set(item[keyField], item);
        }
      }
    });

    return Array.from(merged.values());
  }

  // ניקוי הגדרות
  clearConfig() {
    this.token = null;
    this.owner = null;
    this.repo = null;
  }
}

export default new GitHubSyncManager();
