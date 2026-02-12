import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Theme } from '@constants/theme';
import { Button } from '@components/Button';
import StorageManager from '@storage/StorageManager';
import { Recording } from '../types';

// Note: expo-av is used for audio recording/playback
// On web, we use a simplified interface
let Audio: any = null;
try {
  Audio = require('expo-av').Audio;
} catch (e) {
  // expo-av not available (web without native)
}

export const RecordingsScreen: React.FC<{ navigation?: any }> = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const recordingRef = useRef<any>(null);
  const soundRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadRecordings();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopPlayback();
    };
  }, []);

  const loadRecordings = async () => {
    try {
      const recs = await StorageManager.getRecordings();
      setRecordings(recs);
    } catch (e) {
      console.error('Error loading recordings:', e);
    }
  };

  const startRecording = async () => {
    if (!Audio) {
      Alert.alert('לא זמין', 'הקלטה זמינה רק באפליקציית Android/iOS');
      return;
    }

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('הרשאה נדרשת', 'נא לאשר גישה למיקרופון');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);
    } catch (e) {
      console.error('Error starting recording:', e);
      Alert.alert('שגיאה', 'לא הצליח להתחיל הקלטה');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      if (uri) {
        const newRecording: Recording = {
          id: Date.now().toString(),
          title: `הקלטה ${recordings.length + 1}`,
          description: `משך: ${formatTime(recordingDuration)}`,
          uri,
          duration: recordingDuration,
          createdAt: new Date().toISOString(),
        };

        await StorageManager.addRecording(newRecording);
        await loadRecordings();
      }
    } catch (e) {
      console.error('Error stopping recording:', e);
    }
  };

  const playRecording = async (recording: Recording) => {
    if (!Audio) {
      Alert.alert('לא זמין', 'השמעה זמינה רק באפליקציית Android/iOS');
      return;
    }

    try {
      // Stop any current playback
      await stopPlayback();

      const { sound } = await Audio.Sound.createAsync(
        { uri: recording.uri },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setIsPlaying(recording.id);

      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setIsPlaying(null);
          soundRef.current = null;
        }
      });
    } catch (e) {
      console.error('Error playing recording:', e);
      Alert.alert('שגיאה', 'לא הצליח להשמיע');
    }
  };

  const stopPlayback = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) {
        // ignore
      }
      soundRef.current = null;
      setIsPlaying(null);
    }
  };

  const deleteRecording = async (id: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm('מחיקת הקלטה - האם אתה בטוח?')) {
        await StorageManager.deleteRecording(id);
        if (isPlaying === id) await stopPlayback();
        loadRecordings();
      }
    } else {
      Alert.alert('מחיקת הקלטה', 'האם אתה בטוח?', [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            await StorageManager.deleteRecording(id);
            if (isPlaying === id) await stopPlayback();
            loadRecordings();
          },
        },
      ]);
    }
  };

  const saveTitle = async (id: string) => {
    const rec = recordings.find(r => r.id === id);
    if (!rec) return;
    const updated: Recording = { ...rec, title: editTitle };
    // Delete and re-add with new title
    await StorageManager.deleteRecording(id);
    await StorageManager.addRecording(updated);
    setEditingId(null);
    loadRecordings();
  };

  const formatTime = (seconds: number) => {
    const safe = Math.max(0, Math.floor(seconds));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>ההקלטות שלי</Text>
        <Text style={styles.subtitle}>הקלט את עצמך אומר את הספרות והשמע ברקע</Text>

        {/* Record button */}
        <View style={styles.recordSection}>
          {isRecording ? (
            <View style={styles.recordingActive}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingTime}>{formatTime(recordingDuration)}</Text>
              <TouchableOpacity style={styles.stopBtn} onPress={stopRecording}>
                <View style={styles.stopIcon} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.recordBtn} onPress={startRecording}>
              <View style={styles.recordBtnInner} />
              <Text style={styles.recordBtnText}>הקלט</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info for web users */}
        {Platform.OS === 'web' && (
          <View style={styles.webInfo}>
            <Text style={styles.webInfoText}>
              הקלטה והשמעה זמינים בגרסת Android.
              {'\n'}בגרסת Web ניתן לנהל רשימת הקלטות.
            </Text>
          </View>
        )}

        {/* Recordings list */}
        {recordings.length === 0 ? (
          <Text style={styles.emptyText}>
            אין הקלטות עדיין. לחץ על כפתור ההקלטה כדי להתחיל!
          </Text>
        ) : (
          recordings.map(rec => (
            <View key={rec.id} style={styles.recordCard}>
              <View style={styles.cardHeader}>
                {editingId === rec.id ? (
                  <View style={styles.editRow}>
                    <TextInput
                      style={styles.editInput}
                      value={editTitle}
                      onChangeText={setEditTitle}
                      autoFocus
                      onSubmitEditing={() => saveTitle(rec.id)}
                    />
                    <TouchableOpacity onPress={() => saveTitle(rec.id)}>
                      <Text style={styles.saveBtn}>שמור</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      setEditingId(rec.id);
                      setEditTitle(rec.title);
                    }}
                  >
                    <Text style={styles.cardTitle}>{rec.title}</Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.cardDate}>
                  {new Date(rec.createdAt).toLocaleDateString('he-IL')}
                </Text>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.cardDuration}>{formatTime(rec.duration)}</Text>
                {rec.description && (
                  <Text style={styles.cardDesc}>{rec.description}</Text>
                )}
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.playBtn, isPlaying === rec.id && styles.playBtnActive]}
                  onPress={() => {
                    if (isPlaying === rec.id) {
                      stopPlayback();
                    } else {
                      playRecording(rec);
                    }
                  }}
                >
                  <Text style={styles.playBtnText}>
                    {isPlaying === rec.id ? 'עצור' : 'השמע'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteRecording(rec.id)}>
                  <Text style={styles.deleteText}>מחק</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  content: {
    padding: Theme.spacing.md,
    paddingBottom: 200,
  },
  title: {
    fontSize: Theme.fontSize.xxl,
    color: Theme.colors.text,
    fontWeight: Theme.fontWeight.bold,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: Theme.fontSize.sm,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
  },
  // Record button
  recordSection: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  recordBtn: {
    alignItems: 'center',
    gap: 8,
  },
  recordBtnInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Theme.colors.error,
    borderWidth: 4,
    borderColor: Theme.colors.white,
    ...Theme.shadow.lg,
  },
  recordBtnText: {
    color: Theme.colors.text,
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.medium,
  },
  recordingActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: Theme.colors.surface,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: Theme.colors.error,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Theme.colors.error,
  },
  recordingTime: {
    color: Theme.colors.error,
    fontSize: Theme.fontSize.xxl,
    fontWeight: Theme.fontWeight.bold,
    fontFamily: 'monospace',
    minWidth: 80,
    textAlign: 'center',
  },
  stopBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: Theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIcon: {
    width: 18,
    height: 18,
    backgroundColor: Theme.colors.white,
    borderRadius: 2,
  },
  // Web info
  webInfo: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.info,
  },
  webInfoText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.fontSize.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyText: {
    color: Theme.colors.textMuted,
    textAlign: 'center',
    padding: Theme.spacing.xl,
    fontSize: Theme.fontSize.base,
  },
  // Recording card
  recordCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: 12,
    ...Theme.shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: Theme.fontSize.base,
    color: Theme.colors.text,
    fontWeight: Theme.fontWeight.semibold,
  },
  cardDate: {
    fontSize: Theme.fontSize.xs,
    color: Theme.colors.textMuted,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  editInput: {
    flex: 1,
    backgroundColor: Theme.colors.backgroundInput,
    borderRadius: Theme.borderRadius.sm,
    padding: 8,
    color: Theme.colors.text,
    fontSize: Theme.fontSize.sm,
    textAlign: 'right',
  },
  saveBtn: {
    color: Theme.colors.primary,
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.bold,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  cardDuration: {
    color: Theme.colors.primary,
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    fontFamily: 'monospace',
  },
  cardDesc: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.fontSize.sm,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    paddingTop: 8,
  },
  playBtn: {
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  playBtnActive: {
    backgroundColor: Theme.colors.warning,
  },
  playBtnText: {
    color: Theme.colors.white,
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.bold,
  },
  deleteText: {
    color: Theme.colors.error,
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.medium,
  },
});
