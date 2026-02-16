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

  const renderToggle = (
    icon: string,
    label: string,
    description: string,
    value: boolean,
    onChange: (v: boolean) => void,
    isLast = false,
  ) => (
    <View style={[styles.toggleItem, !isLast && styles.toggleItemBorder]}>
      <View style={styles.toggleLeft}>
        <View style={styles.toggleIconWrap}>
          <Text style={styles.toggleIcon}>{icon}</Text>
        </View>
        <View style={styles.toggleTexts}>
          <Text style={styles.toggleLabel}>{label}</Text>
          <Text style={styles.toggleDesc}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Theme.colors.backgroundInput, true: Theme.colors.primary }}
        thumbColor={value ? Theme.colors.white : Theme.colors.textSecondary}
      />
    </View>
  );

  const renderChips = (
    options: { value: any; label: string }[],
    selected: any,
    onSelect: (v: any) => void,
  ) => (
    <View style={styles.chipRow}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.chip, selected === opt.value && styles.chipActive]}
          onPress={() => onSelect(opt.value)}
        >
          <Text style={[styles.chipText, selected === opt.value && styles.chipTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <Text style={styles.headerIcon}>&#x2699;&#xFE0F;</Text>
        </View>
        <Text style={styles.title}>הגדרות</Text>
        <Text style={styles.subtitle}>התאם את חוויית האימון שלך</Text>
      </View>

      {/* Display format */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>&#x1F522;</Text>
          <Text style={styles.sectionTitle}>פורמט תצוגת ספרות</Text>
        </View>
        <Text style={styles.sectionDesc}>בחר כמה ספרות להציג בכל קבוצה</Text>
        {renderChips(
          [
            { value: 1, label: 'בודד' },
            { value: 2, label: 'זוגות' },
            { value: 5, label: 'חמישיות' },
            { value: 10, label: 'עשיריות' },
            { value: 15, label: '15' },
            { value: 20, label: '20' },
          ],
          settings.displayFormat,
          (v) => updateSetting('displayFormat', v),
        )}
      </View>

      {/* Daily goal */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>&#x1F3AF;</Text>
          <Text style={styles.sectionTitle}>יעד יומי</Text>
        </View>
        <Text style={styles.sectionDesc}>כמה ספרות חדשות ביום</Text>
        {renderChips(
          [
            { value: 5, label: '5' },
            { value: 10, label: '10' },
            { value: 20, label: '20' },
            { value: 50, label: '50' },
          ],
          settings.dailyGoal,
          (v) => updateSetting('dailyGoal', v),
        )}
      </View>

      {/* Weekly frequency */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>&#x1F4C5;</Text>
          <Text style={styles.sectionTitle}>תדירות שבועית</Text>
        </View>
        <Text style={styles.sectionDesc}>כמה ימי אימון בשבוע</Text>
        {renderChips(
          [
            { value: 3, label: '3 ימים' },
            { value: 5, label: '5 ימים' },
            { value: 7, label: 'כל יום' },
          ],
          settings.weeklyFrequency,
          (v) => updateSetting('weeklyFrequency', v),
        )}
      </View>

      {/* Toggles */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>&#x2699;&#xFE0F;</Text>
          <Text style={styles.sectionTitle}>כללי</Text>
        </View>
        {renderToggle(
          '\uD83D\uDD0A',
          'צלילים',
          'אפקטים קוליים בעת אימון',
          settings.soundEnabled,
          (v) => updateSetting('soundEnabled', v),
        )}
        {renderToggle(
          '\uD83D\uDCF3',
          'רטט',
          'רטט בעת לחיצה נכונה/שגויה',
          settings.hapticEnabled,
          (v) => updateSetting('hapticEnabled', v),
        )}
        {renderToggle(
          '\uD83D\uDD22',
          'היפוך Numpad',
          '1-2-3 למעלה במקום 7-8-9',
          settings.numpadReversed ?? false,
          (v) => updateSetting('numpadReversed', v),
          true,
        )}
      </View>

      {/* Info */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>&#x2139;&#xFE0F;</Text>
          <Text style={styles.sectionTitle}>מידע</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoValue}>{TOTAL_DIGITS.toLocaleString()}</Text>
          <Text style={styles.infoLabel}>ספרות פאי זמינות</Text>
        </View>
        <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: Theme.colors.border }]}>
          <Text style={styles.infoValue}>1.0.0</Text>
          <Text style={styles.infoLabel}>גרסה</Text>
        </View>
      </View>

      {/* Clear data */}
      <TouchableOpacity style={styles.dangerButton} onPress={confirmClearData}>
        <Text style={styles.dangerIcon}>&#x1F5D1;&#xFE0F;</Text>
        <Text style={styles.dangerText}>מחק את כל הנתונים</Text>
      </TouchableOpacity>

      <Text style={styles.dangerHint}>פעולה זו אינה ניתנת לביטול</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 200,
  },
  // Header
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  headerIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Theme.colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerIcon: {
    fontSize: 32,
  },
  title: {
    fontSize: 26,
    color: Theme.colors.text,
    fontWeight: Theme.fontWeight.extrabold,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: Theme.fontSize.sm,
    color: Theme.colors.textSecondary,
  },
  // Section
  section: {
    backgroundColor: Theme.colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    ...Theme.shadow.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: Theme.fontSize.lg,
    color: Theme.colors.text,
    fontWeight: Theme.fontWeight.bold,
  },
  sectionDesc: {
    fontSize: Theme.fontSize.xs,
    color: Theme.colors.textMuted,
    marginBottom: 14,
    textAlign: 'right',
    paddingRight: 30,
  },
  // Chips
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: Theme.colors.backgroundInput,
    minWidth: 65,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: Theme.colors.primary,
    ...Theme.shadow.md,
  },
  chipText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.medium,
  },
  chipTextActive: {
    color: Theme.colors.white,
    fontWeight: Theme.fontWeight.bold,
  },
  // Toggles
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  toggleItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Theme.colors.backgroundInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleIcon: {
    fontSize: 20,
  },
  toggleTexts: {
    flex: 1,
  },
  toggleLabel: {
    color: Theme.colors.text,
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.semibold,
  },
  toggleDesc: {
    color: Theme.colors.textMuted,
    fontSize: Theme.fontSize.xs,
    marginTop: 2,
  },
  // Info
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.fontSize.sm,
  },
  infoValue: {
    color: Theme.colors.accent,
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.bold,
  },
  // Danger
  dangerButton: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.error + '15',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Theme.colors.error + '40',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  dangerIcon: {
    fontSize: 20,
  },
  dangerText: {
    color: Theme.colors.error,
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.bold,
  },
  dangerHint: {
    color: Theme.colors.textMuted,
    fontSize: Theme.fontSize.xs,
    textAlign: 'center',
    marginTop: 8,
  },
});
