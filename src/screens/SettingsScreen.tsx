import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Theme } from '@constants/theme';
import StorageManager from '@storage/StorageManager';
import { UserSettings } from '../types';
import { TOTAL_DIGITS } from '@constants/piDigits';

export const SettingsScreen: React.FC<{ navigation?: any }> = () => {
  const [settings, setSettings] = useState<UserSettings>({
    displayFormat: 1,
    rtlEnabled: true,
    soundEnabled: true,
    hapticEnabled: true,
    autoSyncEnabled: false,
    dailyGoal: 10,
    weeklyFrequency: 5,
    githubSyncEnabled: false,
    googleCalendarEnabled: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const s = await StorageManager.getSettings();
      setSettings(s);
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  };

  const updateSetting = async <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await StorageManager.saveSettings(newSettings);
  };

  const confirmClearData = () => {
    Alert.alert(
      'מחיקת כל הנתונים',
      'פעולה זו תמחק את כל ההתקדמות, הפתקים, וההגדרות. האם אתה בטוח?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק הכל',
          style: 'destructive',
          onPress: async () => {
            await StorageManager.clearAllData();
            loadSettings();
            Alert.alert('הנתונים נמחקו');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>הגדרות</Text>

      {/* Display format */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>פורמט תצוגת ספרות</Text>
        <View style={styles.formatRow}>
          {([1, 2, 4, 8, 10] as const).map(format => (
            <TouchableOpacity
              key={format}
              style={[styles.formatBtn, settings.displayFormat === format && styles.formatBtnActive]}
              onPress={() => updateSetting('displayFormat', format)}
            >
              <Text style={[
                styles.formatText,
                settings.displayFormat === format && styles.formatTextActive,
              ]}>
                {format === 1 ? 'בודד' : format === 2 ? 'זוגות' : format === 4 ? 'רביעיות' : format === 8 ? 'שמיניות' : 'עשיריות'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Daily goal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>יעד יומי (ספרות חדשות)</Text>
        <View style={styles.formatRow}>
          {[5, 10, 20, 50].map(goal => (
            <TouchableOpacity
              key={goal}
              style={[styles.formatBtn, settings.dailyGoal === goal && styles.formatBtnActive]}
              onPress={() => updateSetting('dailyGoal', goal)}
            >
              <Text style={[
                styles.formatText,
                settings.dailyGoal === goal && styles.formatTextActive,
              ]}>
                {goal}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Weekly frequency */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>תדירות שבועית</Text>
        <View style={styles.formatRow}>
          {[3, 5, 7].map(freq => (
            <TouchableOpacity
              key={freq}
              style={[styles.formatBtn, settings.weeklyFrequency === freq && styles.formatBtnActive]}
              onPress={() => updateSetting('weeklyFrequency', freq)}
            >
              <Text style={[
                styles.formatText,
                settings.weeklyFrequency === freq && styles.formatTextActive,
              ]}>
                {freq} ימים
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Toggles */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>כללי</Text>

        <View style={styles.toggleRow}>
          <Switch
            value={settings.soundEnabled}
            onValueChange={(v) => updateSetting('soundEnabled', v)}
            trackColor={{ true: Theme.colors.primary }}
          />
          <Text style={styles.toggleLabel}>צלילים</Text>
        </View>

        <View style={styles.toggleRow}>
          <Switch
            value={settings.hapticEnabled}
            onValueChange={(v) => updateSetting('hapticEnabled', v)}
            trackColor={{ true: Theme.colors.primary }}
          />
          <Text style={styles.toggleLabel}>רטט</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>מידע</Text>
        <Text style={styles.infoText}>ספרות פאי זמינות: {TOTAL_DIGITS}</Text>
        <Text style={styles.infoText}>גרסה: 1.0.0</Text>
      </View>

      {/* Clear data */}
      <TouchableOpacity style={styles.dangerButton} onPress={confirmClearData}>
        <Text style={styles.dangerText}>מחק את כל הנתונים</Text>
      </TouchableOpacity>
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
    paddingBottom: 40,
  },
  title: {
    fontSize: Theme.fontSize.xxl,
    color: Theme.colors.text,
    fontWeight: Theme.fontWeight.bold,
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
  },
  section: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: Theme.fontSize.base,
    color: Theme.colors.text,
    fontWeight: Theme.fontWeight.semibold,
    marginBottom: 12,
    textAlign: 'right',
  },
  formatRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  formatBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.backgroundInput,
    minWidth: 70,
    alignItems: 'center',
  },
  formatBtnActive: {
    backgroundColor: Theme.colors.primary,
  },
  formatText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.fontSize.sm,
  },
  formatTextActive: {
    color: Theme.colors.white,
    fontWeight: Theme.fontWeight.bold,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 8,
    gap: 12,
  },
  toggleLabel: {
    color: Theme.colors.text,
    fontSize: Theme.fontSize.base,
  },
  infoText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.fontSize.sm,
    textAlign: 'right',
    marginBottom: 4,
  },
  dangerButton: {
    backgroundColor: Theme.colors.error,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    alignItems: 'center',
    marginTop: Theme.spacing.md,
  },
  dangerText: {
    color: Theme.colors.white,
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.bold,
  },
});
