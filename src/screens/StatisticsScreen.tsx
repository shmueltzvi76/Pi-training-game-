import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Theme } from '@constants/theme';
import StorageManager from '@storage/StorageManager';
import { DailyProgress, GameSession, UserData } from '../types';

export const StatisticsScreen: React.FC<{ navigation?: any }> = () => {
  const [userData, setUserData] = useState<Partial<UserData>>({});
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [progress, setProgress] = useState<DailyProgress[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await StorageManager.getAllUserData();
      setUserData(data);
      setSessions(data.sessions || []);
      setProgress(data.progress || []);
    } catch (e) {
      console.error('Error loading stats:', e);
    }
  };

  const totalCorrect = sessions.reduce((sum, s) => sum + s.stats.correctCount, 0);
  const totalIncorrect = sessions.reduce((sum, s) => sum + s.stats.incorrectCount, 0);
  const accuracy = totalCorrect + totalIncorrect > 0
    ? Math.round((totalCorrect / (totalCorrect + totalIncorrect)) * 100)
    : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>הסטטיסטיקות שלי</Text>

      {/* Main stats */}
      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{userData.totalDigitsMastered || 0}</Text>
          <Text style={styles.cardLabel}>ספרות שנשלטו</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{userData.currentStreak || 0}</Text>
          <Text style={styles.cardLabel}>רצף ימים נוכחי</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{userData.longestStreak || 0}</Text>
          <Text style={styles.cardLabel}>רצף ימים שיא</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{accuracy}%</Text>
          <Text style={styles.cardLabel}>דיוק</Text>
        </View>
      </View>

      {/* Session count */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>סה"כ אימונים</Text>
        <Text style={styles.sectionValue}>{sessions.length}</Text>
      </View>

      {/* Recent sessions */}
      <Text style={styles.sectionTitle}>אימונים אחרונים</Text>
      {sessions.length === 0 ? (
        <Text style={styles.emptyText}>עדיין אין אימונים. התחל לתרגל!</Text>
      ) : (
        sessions.slice(-5).reverse().map((session) => (
          <View key={session.id} style={styles.sessionCard}>
            <View style={styles.sessionRow}>
              <Text style={styles.sessionMode}>
                {session.mode === 'training' ? '🧠 אימון' : '🏆 אתגר'}
              </Text>
              <Text style={styles.sessionDate}>
                {new Date(session.date).toLocaleDateString('he-IL')}
              </Text>
            </View>
            <View style={styles.sessionRow}>
              <Text style={styles.sessionStat}>
                נכון: {session.stats.correctCount}
              </Text>
              <Text style={styles.sessionStat}>
                שגוי: {session.stats.incorrectCount}
              </Text>
              <Text style={styles.sessionStat}>
                {session.completed ? 'הושלם' : 'חלקי'}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  content: {
    padding: Theme.spacing.md,
  },
  title: {
    fontSize: Theme.fontSize.xxl,
    color: Theme.colors.text,
    fontWeight: Theme.fontWeight.bold,
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: Theme.spacing.lg,
  },
  card: {
    width: '47%',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    alignItems: 'center',
    ...Theme.shadow.md,
  },
  cardValue: {
    fontSize: Theme.fontSize.xxxl,
    color: Theme.colors.primary,
    fontWeight: Theme.fontWeight.bold,
  },
  cardLabel: {
    fontSize: Theme.fontSize.sm,
    color: Theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: Theme.fontSize.lg,
    color: Theme.colors.text,
    fontWeight: Theme.fontWeight.semibold,
    marginBottom: Theme.spacing.sm,
  },
  sectionValue: {
    fontSize: Theme.fontSize.xxl,
    color: Theme.colors.accent,
    fontWeight: Theme.fontWeight.bold,
  },
  emptyText: {
    color: Theme.colors.textMuted,
    fontSize: Theme.fontSize.base,
    textAlign: 'center',
    padding: Theme.spacing.xl,
  },
  sessionCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: 8,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionMode: {
    color: Theme.colors.text,
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.medium,
  },
  sessionDate: {
    color: Theme.colors.textMuted,
    fontSize: Theme.fontSize.sm,
  },
  sessionStat: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.fontSize.sm,
  },
});
