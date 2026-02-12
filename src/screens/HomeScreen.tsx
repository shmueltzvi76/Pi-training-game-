import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Theme } from '@constants/theme';
import { Button } from '@components/Button';
import StorageManager from '@storage/StorageManager';
import { TOTAL_DIGITS } from '@constants/piDigits';

interface HomeScreenProps {
  navigation?: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [totalDigits, setTotalDigits] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await StorageManager.getAllUserData();
      setTotalDigits(userData.totalDigitsMastered || 0);
      setCurrentStreak(userData.currentStreak || 0);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const nav = (screen: string) => navigation?.navigate(screen);

  // Progress percentage
  const progressPercent = Math.min((totalDigits / TOTAL_DIGITS) * 100, 100);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero section */}
        <View style={styles.hero}>
          <View style={styles.piCircle}>
            <Text style={styles.piSymbol}>π</Text>
          </View>
          <Text style={styles.title}>משחק זיכרון פאי</Text>
          <Text style={styles.subtitle}>אימון וזכירת ספרות פאי</Text>
          <Text style={styles.piPreview}>3.14159265...</Text>
        </View>

        {/* Stats cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: Theme.colors.primary }]}>
            <Text style={[styles.statValue, { color: Theme.colors.primary }]}>{totalDigits}</Text>
            <Text style={styles.statLabel}>ספרות שנשלטו</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: Theme.colors.accent }]}>
            <Text style={[styles.statValue, { color: Theme.colors.accent }]}>{currentStreak}</Text>
            <Text style={styles.statLabel}>רצף ימים</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: Theme.colors.secondary }]}>
            <Text style={[styles.statValue, { color: Theme.colors.secondary }]}>{TOTAL_DIGITS.toLocaleString()}</Text>
            <Text style={styles.statLabel}>סה"כ זמין</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>ההתקדמות שלי</Text>
            <Text style={styles.progressPercent}>{progressPercent.toFixed(1)}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.max(progressPercent, 1)}%` }]} />
          </View>
        </View>

        {/* Section: Game modes */}
        <Text style={styles.sectionTitle}>מצבי משחק</Text>
        <View style={styles.gameCards}>
          <TouchableOpacity style={[styles.gameCard, styles.gameCardPrimary]} onPress={() => nav('Training')}>
            <Text style={styles.gameCardIcon}>🧠</Text>
            <Text style={styles.gameCardTitle}>אימון</Text>
            <Text style={styles.gameCardDesc}>למד ותרגל ספרות חדשות</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.gameCard, styles.gameCardSecondary]} onPress={() => nav('Challenge')}>
            <Text style={styles.gameCardIcon}>🏆</Text>
            <Text style={styles.gameCardTitle}>אתגר</Text>
            <Text style={styles.gameCardDesc}>בדוק את עצמך עם טיימר</Text>
          </TouchableOpacity>
        </View>

        {/* Section: Tools */}
        <Text style={styles.sectionTitle}>כלים</Text>
        <View style={styles.toolsGrid}>
          <TouchableOpacity style={styles.toolCard} onPress={() => nav('PiView')}>
            <Text style={styles.toolIcon}>🔢</Text>
            <Text style={styles.toolLabel}>רשימת ספרות</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolCard} onPress={() => nav('Statistics')}>
            <Text style={styles.toolIcon}>📊</Text>
            <Text style={styles.toolLabel}>סטטיסטיקות</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolCard} onPress={() => nav('Notes')}>
            <Text style={styles.toolIcon}>📝</Text>
            <Text style={styles.toolLabel}>פתקים</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolCard} onPress={() => nav('Recordings')}>
            <Text style={styles.toolIcon}>🎙️</Text>
            <Text style={styles.toolLabel}>הקלטות</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolCard} onPress={() => nav('Settings')}>
            <Text style={styles.toolIcon}>⚙️</Text>
            <Text style={styles.toolLabel}>הגדרות</Text>
          </TouchableOpacity>
        </View>

        {/* Daily goal */}
        <View style={styles.goalCard}>
          <View style={styles.goalBadge}>
            <Text style={styles.goalBadgeText}>יעד יומי</Text>
          </View>
          <Text style={styles.goalValue}>10-20 ספרות חדשות</Text>
          <Text style={styles.goalFrequency}>5 פעמים בשבוע</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 200,
  },
  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 28,
  },
  piCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Theme.colors.primary + '20',
    borderWidth: 3,
    borderColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  piSymbol: {
    fontSize: 56,
    fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.primary,
  },
  title: {
    fontSize: 26,
    fontWeight: Theme.fontWeight.extrabold,
    color: Theme.colors.text,
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: Theme.fontSize.sm,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  piPreview: {
    fontSize: Theme.fontSize.lg,
    color: Theme.colors.primaryLight,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderLeftWidth: 3,
    ...Theme.shadow.sm,
  },
  statValue: {
    fontSize: 22,
    fontWeight: Theme.fontWeight.bold,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },
  // Progress
  progressSection: {
    backgroundColor: Theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    ...Theme.shadow.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressTitle: {
    color: Theme.colors.text,
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.semibold,
  },
  progressPercent: {
    color: Theme.colors.accent,
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.bold,
  },
  progressBar: {
    height: 8,
    backgroundColor: Theme.colors.backgroundInput,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: Theme.colors.accent,
  },
  // Section title
  sectionTitle: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.text,
    marginBottom: 12,
    textAlign: 'right',
  },
  // Game cards
  gameCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  gameCard: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    ...Theme.shadow.md,
  },
  gameCardPrimary: {
    backgroundColor: Theme.colors.primary,
  },
  gameCardSecondary: {
    backgroundColor: Theme.colors.secondary,
  },
  gameCardIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  gameCardTitle: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.white,
    marginBottom: 4,
  },
  gameCardDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  // Tools grid
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  toolCard: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: Theme.colors.surface,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    ...Theme.shadow.sm,
  },
  toolIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  toolLabel: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    fontWeight: Theme.fontWeight.medium,
    textAlign: 'center',
  },
  // Goal
  goalCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Theme.colors.accent + '40',
    ...Theme.shadow.sm,
  },
  goalBadge: {
    backgroundColor: Theme.colors.accent + '20',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  goalBadgeText: {
    color: Theme.colors.accent,
    fontSize: 12,
    fontWeight: Theme.fontWeight.bold,
  },
  goalValue: {
    fontSize: Theme.fontSize.xl,
    fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.text,
    marginBottom: 4,
  },
  goalFrequency: {
    fontSize: Theme.fontSize.sm,
    color: Theme.colors.textSecondary,
  },
});
