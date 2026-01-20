import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, I18nManager } from 'react-native';
import { Theme } from '@constants/theme';
import { Button } from '@components/Button';
import StorageManager from '@storage/StorageManager';

// הפעלת RTL לעברית
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

interface HomeScreenProps {
  navigation?: any; // נוסיף typing מדויק אחר כך
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

  const handleTrainingMode = () => {
    // נוסיף ניווט אחר כך
    console.log('Training mode');
  };

  const handleChallengeMode = () => {
    // נוסיף ניווט אחר כך
    console.log('Challenge mode');
  };

  const handleStatistics = () => {
    console.log('Statistics');
  };

  const handleNotes = () => {
    console.log('Notes');
  };

  const handleRecordings = () => {
    console.log('Recordings');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* לוגו ופאי */}
        <View style={styles.header}>
          <Text style={styles.piSymbol}>π</Text>
          <Text style={styles.piValue}>3.14</Text>
          <Text style={styles.title}>משחק זיכרון פאי</Text>
          <Text style={styles.subtitle}>אימון וזכירת ספרות פאי</Text>
        </View>

        {/* סטטיסטיקות מהירות */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalDigits}</Text>
            <Text style={styles.statLabel}>ספרות שנשלטו</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{currentStreak}</Text>
            <Text style={styles.statLabel}>רצף ימים</Text>
          </View>
        </View>

        {/* כפתורי מצב משחק */}
        <View style={styles.modesContainer}>
          <Button
            title="מצב אימון"
            onPress={handleTrainingMode}
            variant="primary"
            size="lg"
            style={styles.modeButton}
          />
          <Button
            title="מצב אתגר"
            onPress={handleChallengeMode}
            variant="secondary"
            size="lg"
            style={styles.modeButton}
          />
        </View>

        {/* כפתורים נוספים */}
        <View style={styles.additionalButtons}>
          <Button
            title="סטטיסטיקות"
            onPress={handleStatistics}
            variant="outline"
            style={styles.additionalButton}
          />
          <Button
            title="פתקים"
            onPress={handleNotes}
            variant="outline"
            style={styles.additionalButton}
          />
          <Button
            title="הקלטות"
            onPress={handleRecordings}
            variant="outline"
            style={styles.additionalButton}
          />
        </View>

        {/* מטרה יומית */}
        <View style={styles.goalContainer}>
          <Text style={styles.goalTitle}>היעד היומי שלי</Text>
          <Text style={styles.goalText}>10-20 ספרות חדשות</Text>
          <Text style={styles.goalSubtext}>5 פעמים בשבוע</Text>
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
    padding: Theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: Theme.spacing.xl,
    marginBottom: Theme.spacing.xl,
  },
  piSymbol: {
    fontSize: 120,
    fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.primary,
    marginBottom: -Theme.spacing.lg,
  },
  piValue: {
    fontSize: Theme.fontSize.xxxl,
    fontWeight: Theme.fontWeight.medium,
    color: Theme.colors.primaryLight,
    marginBottom: Theme.spacing.md,
  },
  title: {
    fontSize: Theme.fontSize.xxl,
    fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Theme.fontSize.base,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.xl,
    gap: Theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Theme.colors.backgroundCard,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    alignItems: 'center',
    ...Theme.shadow.md,
  },
  statValue: {
    fontSize: Theme.fontSize.xxxl,
    fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.primary,
    marginBottom: Theme.spacing.xs,
  },
  statLabel: {
    fontSize: Theme.fontSize.sm,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },
  modesContainer: {
    marginBottom: Theme.spacing.lg,
    gap: Theme.spacing.md,
  },
  modeButton: {
    width: '100%',
  },
  additionalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.lg,
    gap: Theme.spacing.sm,
  },
  additionalButton: {
    flex: 1,
  },
  goalContainer: {
    backgroundColor: Theme.colors.backgroundCard,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Theme.colors.accent,
    ...Theme.shadow.sm,
  },
  goalTitle: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.semibold,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
  },
  goalText: {
    fontSize: Theme.fontSize.xl,
    fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.accent,
    marginBottom: Theme.spacing.xs,
  },
  goalSubtext: {
    fontSize: Theme.fontSize.sm,
    color: Theme.colors.textSecondary,
  },
});
