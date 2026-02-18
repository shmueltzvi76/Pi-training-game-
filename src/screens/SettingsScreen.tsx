import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Theme } from '@constants/theme';
import StorageManager from '@storage/StorageManager';
import { UserSettings } from '../types';
import { TOTAL_DIGITS } from '@constants/piDigits';
import { refreshFeedbackSettings } from '../utils/feedback';

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
    if (key === 'soundEnabled' || key === 'hapticEnabled') {
      refreshFeedbackSettings();
    }
  };

  const confirmClearData = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('מחיקת כל הנתונים - פעולה זו תמחק את כל ההתקדמות, הפתקים, וההגדרות. האם אתה בטוח?')) {
        await StorageManager.clearAllData();
        loadSettings();
        window.alert('הנתונים נמחקו');
      }
    } else {
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
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerPi}>π</Text>
        <Text style={s.headerTitle}>הגדרות</Text>
      </View>

      {/* Display format */}
      <Text style={s.label}>תצוגת ספרות</Text>
      <View style={s.card}>
        <View style={s.segmentRow}>
          {([1, 2, 5, 10, 15, 20] as const).map(format => (
            <TouchableOpacity
              key={format}
              style={[s.segment, settings.displayFormat === format && s.segmentOn]}
              onPress={() => updateSetting('displayFormat', format)}
            >
              <Text style={[s.segmentText, settings.displayFormat === format && s.segmentTextOn]}>
                {format === 1 ? '1' : format === 2 ? '2' : format === 5 ? '5' : format === 10 ? '10' : format === 15 ? '15' : '20'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Goals */}
      <Text style={s.label}>יעדים</Text>
      <View style={s.card}>
        <View style={s.row}>
          <View style={s.segmentRow}>
            {[5, 10, 20, 50].map(goal => (
              <TouchableOpacity
                key={goal}
                style={[s.segmentSmall, settings.dailyGoal === goal && s.segmentOn]}
                onPress={() => updateSetting('dailyGoal', goal)}
              >
                <Text style={[s.segmentText, settings.dailyGoal === goal && s.segmentTextOn]}>{goal}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.rowLabel}>ספרות ליום</Text>
        </View>
        <View style={s.divider} />
        <View style={s.row}>
          <View style={s.segmentRow}>
            {[3, 5, 7].map(freq => (
              <TouchableOpacity
                key={freq}
                style={[s.segmentSmall, settings.weeklyFrequency === freq && s.segmentOn]}
                onPress={() => updateSetting('weeklyFrequency', freq)}
              >
                <Text style={[s.segmentText, settings.weeklyFrequency === freq && s.segmentTextOn]}>
                  {freq === 7 ? 'כל יום' : `${freq}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.rowLabel}>ימים בשבוע</Text>
        </View>
      </View>

      {/* Preferences */}
      <Text style={s.label}>העדפות</Text>
      <View style={s.card}>
        <View style={s.toggleRow}>
          <Switch
            value={settings.soundEnabled}
            onValueChange={(v) => updateSetting('soundEnabled', v)}
            trackColor={{ false: '#334155', true: Theme.colors.primary }}
            thumbColor="#fff"
          />
          <View style={s.toggleTexts}>
            <Text style={s.toggleLabel}>צלילים</Text>
            <Text style={s.toggleSub}>אפקטים קוליים בעת אימון</Text>
          </View>
        </View>
        <View style={s.divider} />
        <View style={s.toggleRow}>
          <Switch
            value={settings.hapticEnabled}
            onValueChange={(v) => updateSetting('hapticEnabled', v)}
            trackColor={{ false: '#334155', true: Theme.colors.primary }}
            thumbColor="#fff"
          />
          <View style={s.toggleTexts}>
            <Text style={s.toggleLabel}>רטט</Text>
            <Text style={s.toggleSub}>משוב הפטי בלחיצה</Text>
          </View>
        </View>
        <View style={s.divider} />
        <View style={s.toggleRow}>
          <Switch
            value={settings.numpadReversed ?? false}
            onValueChange={(v) => updateSetting('numpadReversed', v)}
            trackColor={{ false: '#334155', true: Theme.colors.primary }}
            thumbColor="#fff"
          />
          <View style={s.toggleTexts}>
            <Text style={s.toggleLabel}>היפוך מקלדת</Text>
            <Text style={s.toggleSub}>1-2-3 למעלה במקום 7-8-9</Text>
          </View>
        </View>
      </View>

      {/* Info */}
      <Text style={s.label}>אודות</Text>
      <View style={s.card}>
        <View style={s.infoRow}>
          <Text style={s.infoVal}>{TOTAL_DIGITS.toLocaleString()}</Text>
          <Text style={s.infoKey}>ספרות זמינות</Text>
        </View>
        <View style={s.divider} />
        <View style={s.infoRow}>
          <Text style={s.infoVal}>1.0.0</Text>
          <Text style={s.infoKey}>גרסה</Text>
        </View>
      </View>

      {/* Danger zone */}
      <TouchableOpacity style={s.danger} onPress={confirmClearData} activeOpacity={0.7}>
        <Text style={s.dangerText}>מחק את כל הנתונים</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 200,
  },
  // Header
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerPi: {
    fontSize: 48,
    color: Theme.colors.primary,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    color: Theme.colors.text,
    fontWeight: Theme.fontWeight.bold,
  },
  // Section label
  label: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    fontWeight: Theme.fontWeight.semibold,
    textTransform: 'uppercase' as any,
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 20,
    paddingHorizontal: 4,
    textAlign: 'right',
  },
  // Card
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.border,
  },
  // Segment control
  segmentRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    paddingVertical: 12,
  },
  segment: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Theme.colors.backgroundInput,
    minWidth: 44,
    alignItems: 'center',
  },
  segmentSmall: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Theme.colors.backgroundInput,
    minWidth: 38,
    alignItems: 'center',
  },
  segmentOn: {
    backgroundColor: Theme.colors.primary,
  },
  segmentText: {
    color: Theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: Theme.fontWeight.medium,
  },
  segmentTextOn: {
    color: '#fff',
    fontWeight: Theme.fontWeight.bold,
  },
  // Row with label
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  rowLabel: {
    color: Theme.colors.text,
    fontSize: 15,
    fontWeight: Theme.fontWeight.medium,
  },
  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
  },
  toggleTexts: {
    flex: 1,
  },
  toggleLabel: {
    color: Theme.colors.text,
    fontSize: 16,
    fontWeight: Theme.fontWeight.semibold,
    textAlign: 'right',
  },
  toggleSub: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
    textAlign: 'right',
  },
  // Info
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  infoKey: {
    color: Theme.colors.text,
    fontSize: 15,
  },
  infoVal: {
    color: Theme.colors.textSecondary,
    fontSize: 15,
  },
  // Danger
  danger: {
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.error + '50',
    alignItems: 'center',
  },
  dangerText: {
    color: Theme.colors.error,
    fontSize: 15,
    fontWeight: Theme.fontWeight.semibold,
  },
});
