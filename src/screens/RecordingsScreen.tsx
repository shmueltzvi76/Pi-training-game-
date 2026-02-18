import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { Theme } from '@constants/theme';
import StorageManager from '@storage/StorageManager';
import { Recording } from '../types';

// expo-av for native
let Audio: any = null;
try {
  Audio = require('expo-av').Audio;
} catch (e) {}

// Web audio recording via MediaRecorder
let webMediaRecorder: MediaRecorder | null = null;
let webAudioChunks: Blob[] = [];
let webAudioElement: HTMLAudioElement | null = null;

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export const RecordingsScreen: React.FC<{ navigation?: any }> = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recDuration, setRecDuration] = useState(0);
  const [playPos, setPlayPos] = useState(0);
  const [playDuration, setPlayDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const recordingRef = useRef<any>(null);
  const soundRef = useRef<any>(null);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadRecordings();
    return () => {
      clearTimers();
      stopPlayback();
    };
  }, []);

  // Pulse animation for recording dot
  useEffect(() => {
    if (isRecording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isRecording]);

  const clearTimers = () => {
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
    if (playTimerRef.current) { clearInterval(playTimerRef.current); playTimerRef.current = null; }
  };

  const loadRecordings = async () => {
    try {
      const recs = await StorageManager.getRecordings();
      setRecordings(recs);
    } catch (e) {
      console.error('Error loading recordings:', e);
    }
  };

  // ─── Recording ───
  const startRecording = async () => {
    await stopPlayback();

    if (Platform.OS === 'web') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        webAudioChunks = [];
        webMediaRecorder = new MediaRecorder(stream);
        webMediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) webAudioChunks.push(e.data); };
        webMediaRecorder.start();
        setIsRecording(true);
        setRecDuration(0);
        recTimerRef.current = setInterval(() => setRecDuration(d => d + 1), 1000);
      } catch (e: any) {
        if (Platform.OS === 'web') {
          window.alert('נא לאשר גישה למיקרופון');
        }
      }
      return;
    }

    if (!Audio) return;
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) { Alert.alert('הרשאה נדרשת', 'נא לאשר גישה למיקרופון'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
      setRecDuration(0);
      recTimerRef.current = setInterval(() => setRecDuration(d => d + 1), 1000);
    } catch (e) {
      Alert.alert('שגיאה', 'לא הצליח להתחיל הקלטה');
    }
  };

  const stopRecording = async () => {
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }

    if (Platform.OS === 'web') {
      if (!webMediaRecorder) return;
      return new Promise<void>((resolve) => {
        webMediaRecorder!.onstop = async () => {
          const blob = new Blob(webAudioChunks, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          const newRec: Recording = {
            id: Date.now().toString(),
            title: `הקלטה ${recordings.length + 1}`,
            description: `משך: ${fmt(recDuration)}`,
            uri: url,
            duration: recDuration,
            createdAt: new Date().toISOString(),
          };
          await StorageManager.addRecording(newRec);
          setIsRecording(false);
          webMediaRecorder!.stream.getTracks().forEach(t => t.stop());
          webMediaRecorder = null;
          await loadRecordings();
          resolve();
        };
        webMediaRecorder!.stop();
      });
    }

    if (!recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);
      if (uri) {
        const newRec: Recording = {
          id: Date.now().toString(),
          title: `הקלטה ${recordings.length + 1}`,
          description: `משך: ${fmt(recDuration)}`,
          uri,
          duration: recDuration,
          createdAt: new Date().toISOString(),
        };
        await StorageManager.addRecording(newRec);
        await loadRecordings();
      }
    } catch (e) { console.error('Error stopping recording:', e); }
  };

  // ─── Playback ───
  const startPlayback = async (rec: Recording) => {
    await stopPlayback();
    setActiveId(rec.id);
    setPlayPos(0);
    setPlayDuration(rec.duration);

    if (Platform.OS === 'web') {
      try {
        webAudioElement = new window.Audio(rec.uri);
        webAudioElement.playbackRate = speed;
        webAudioElement.onended = () => {
          setIsPlaying(false);
          setPlayPos(0);
          if (playTimerRef.current) { clearInterval(playTimerRef.current); playTimerRef.current = null; }
        };
        webAudioElement.onloadedmetadata = () => {
          if (webAudioElement && webAudioElement.duration && isFinite(webAudioElement.duration)) {
            setPlayDuration(Math.floor(webAudioElement.duration));
          }
        };
        await webAudioElement.play();
        setIsPlaying(true);
        playTimerRef.current = setInterval(() => {
          if (webAudioElement) {
            setPlayPos(Math.floor(webAudioElement.currentTime));
          }
        }, 200);
      } catch (e) {
        console.error('Web playback error:', e);
      }
      return;
    }

    if (!Audio) return;
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: rec.uri }, { shouldPlay: true, rate: speed });
      soundRef.current = sound;
      setIsPlaying(true);
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded) {
          setPlayPos(Math.floor((status.positionMillis || 0) / 1000));
          if (status.durationMillis) setPlayDuration(Math.floor(status.durationMillis / 1000));
        }
        if (status.didJustFinish) {
          setIsPlaying(false);
          setPlayPos(0);
          soundRef.current = null;
        }
      });
    } catch (e) {
      console.error('Native playback error:', e);
    }
  };

  const togglePlayPause = async () => {
    if (Platform.OS === 'web' && webAudioElement) {
      if (isPlaying) {
        webAudioElement.pause();
        setIsPlaying(false);
        if (playTimerRef.current) { clearInterval(playTimerRef.current); playTimerRef.current = null; }
      } else {
        await webAudioElement.play();
        setIsPlaying(true);
        playTimerRef.current = setInterval(() => {
          if (webAudioElement) setPlayPos(Math.floor(webAudioElement.currentTime));
        }, 200);
      }
      return;
    }
    if (soundRef.current) {
      if (isPlaying) { await soundRef.current.pauseAsync(); setIsPlaying(false); }
      else { await soundRef.current.playAsync(); setIsPlaying(true); }
    }
  };

  const stopPlayback = async () => {
    if (playTimerRef.current) { clearInterval(playTimerRef.current); playTimerRef.current = null; }
    if (Platform.OS === 'web' && webAudioElement) {
      webAudioElement.pause();
      webAudioElement.currentTime = 0;
      webAudioElement = null;
    }
    if (soundRef.current) {
      try { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); } catch (e) {}
      soundRef.current = null;
    }
    setIsPlaying(false);
    setActiveId(null);
    setPlayPos(0);
  };

  const seekTo = (fraction: number) => {
    const time = fraction * playDuration;
    if (Platform.OS === 'web' && webAudioElement) {
      webAudioElement.currentTime = time;
      setPlayPos(Math.floor(time));
    } else if (soundRef.current) {
      soundRef.current.setPositionAsync(time * 1000);
      setPlayPos(Math.floor(time));
    }
  };

  const changeSpeed = () => {
    const idx = SPEEDS.indexOf(speed);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    setSpeed(next);
    if (Platform.OS === 'web' && webAudioElement) {
      webAudioElement.playbackRate = next;
    } else if (soundRef.current) {
      soundRef.current.setRateAsync(next, true);
    }
  };

  const deleteRecording = async (id: string) => {
    const doDelete = async () => {
      if (activeId === id) await stopPlayback();
      await StorageManager.deleteRecording(id);
      loadRecordings();
    };
    if (Platform.OS === 'web') {
      if (window.confirm('מחיקת הקלטה - האם אתה בטוח?')) await doDelete();
    } else {
      Alert.alert('מחיקת הקלטה', 'האם אתה בטוח?', [
        { text: 'ביטול', style: 'cancel' },
        { text: 'מחק', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const saveTitle = async (id: string) => {
    const rec = recordings.find(r => r.id === id);
    if (!rec) return;
    await StorageManager.deleteRecording(id);
    await StorageManager.addRecording({ ...rec, title: editTitle });
    setEditingId(null);
    loadRecordings();
  };

  const fmt = (sec: number) => {
    const s = Math.max(0, Math.floor(sec));
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const progress = playDuration > 0 ? playPos / playDuration : 0;

  // ─── Waveform bars ───
  const renderWaveform = useCallback((recId: string, dur: number) => {
    const barCount = 40;
    const seed = parseInt(recId.slice(-6), 10) || 1;
    const isActive = activeId === recId;
    return (
      <View style={st.waveWrap}>
        {Array.from({ length: barCount }, (_, i) => {
          const h = 8 + ((seed * (i + 1) * 7) % 24);
          const played = isActive && progress > i / barCount;
          return (
            <View
              key={i}
              style={[
                st.waveBar,
                { height: h },
                played ? st.waveBarPlayed : st.waveBarIdle,
              ]}
            />
          );
        })}
      </View>
    );
  }, [activeId, progress]);

  // ─── Player UI for active recording ───
  const renderPlayer = (rec: Recording) => {
    if (activeId !== rec.id) return null;
    return (
      <View style={st.player}>
        {/* Progress bar */}
        <TouchableOpacity
          style={st.progressWrap}
          activeOpacity={1}
          onPress={(e) => {
            const { locationX } = e.nativeEvent;
            const width = 300; // approximate
            seekTo(Math.min(1, Math.max(0, locationX / width)));
          }}
        >
          <View style={st.progressTrack}>
            <View style={[st.progressFill, { width: `${progress * 100}%` }]} />
            <View style={[st.progressThumb, { left: `${progress * 100}%` }]} />
          </View>
        </TouchableOpacity>

        {/* Times */}
        <View style={st.timeRow}>
          <Text style={st.timeText}>{fmt(playPos)}</Text>
          <Text style={st.timeText}>{fmt(playDuration)}</Text>
        </View>

        {/* Controls */}
        <View style={st.controls}>
          <TouchableOpacity style={st.speedBtn} onPress={changeSpeed}>
            <Text style={st.speedText}>{speed}x</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => seekTo(Math.max(0, (playPos - 5) / playDuration))}>
            <Text style={st.skipText}>-5</Text>
          </TouchableOpacity>

          <TouchableOpacity style={st.playPauseBtn} onPress={togglePlayPause}>
            <Text style={st.playPauseIcon}>{isPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => seekTo(Math.min(1, (playPos + 5) / playDuration))}>
            <Text style={st.skipText}>+5</Text>
          </TouchableOpacity>

          <TouchableOpacity style={st.stopBtn} onPress={stopPlayback}>
            <Text style={st.stopIcon}>⏹</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={st.container}>
      <ScrollView contentContainerStyle={st.content}>
        {/* Header */}
        <View style={st.header}>
          <Text style={st.headerPi}>π</Text>
          <Text style={st.title}>הקלטות</Text>
          <Text style={st.subtitle}>הקלט את עצמך אומר ספרות פאי והתאמן בהשמעה</Text>
        </View>

        {/* Record button */}
        <View style={st.recSection}>
          {isRecording ? (
            <View style={st.recActive}>
              <Animated.View style={[st.recDot, { opacity: pulseAnim }]} />
              <Text style={st.recTime}>{fmt(recDuration)}</Text>
              <TouchableOpacity style={st.recStopBtn} onPress={stopRecording}>
                <View style={st.recStopInner} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={st.recBtn} onPress={startRecording} activeOpacity={0.7}>
              <View style={st.recBtnCircle} />
              <Text style={st.recBtnLabel}>הקלט</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        {recordings.length === 0 ? (
          <View style={st.emptyWrap}>
            <Text style={st.emptyIcon}>🎙</Text>
            <Text style={st.emptyText}>אין הקלטות עדיין</Text>
            <Text style={st.emptySub}>לחץ על כפתור ההקלטה כדי להתחיל</Text>
          </View>
        ) : (
          recordings.map(rec => (
            <View key={rec.id} style={[st.card, activeId === rec.id && st.cardActive]}>
              {/* Header row */}
              <View style={st.cardHead}>
                {editingId === rec.id ? (
                  <View style={st.editRow}>
                    <TextInput
                      style={st.editInput}
                      value={editTitle}
                      onChangeText={setEditTitle}
                      autoFocus
                      onSubmitEditing={() => saveTitle(rec.id)}
                    />
                    <TouchableOpacity onPress={() => saveTitle(rec.id)}>
                      <Text style={st.editSave}>✓</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => { setEditingId(rec.id); setEditTitle(rec.title); }}>
                    <Text style={st.cardTitle}>{rec.title}</Text>
                  </TouchableOpacity>
                )}
                <Text style={st.cardDate}>{new Date(rec.createdAt).toLocaleDateString('he-IL')}</Text>
              </View>

              {/* Waveform */}
              {renderWaveform(rec.id, rec.duration)}

              {/* Duration + play */}
              <View style={st.cardFooter}>
                <TouchableOpacity onPress={() => deleteRecording(rec.id)}>
                  <Text style={st.deleteText}>מחק</Text>
                </TouchableOpacity>
                <Text style={st.durationText}>{fmt(rec.duration)}</Text>
                <TouchableOpacity
                  style={[st.cardPlayBtn, activeId === rec.id && isPlaying && st.cardPlayBtnActive]}
                  onPress={() => {
                    if (activeId === rec.id) togglePlayPause();
                    else startPlayback(rec);
                  }}
                >
                  <Text style={st.cardPlayIcon}>
                    {activeId === rec.id && isPlaying ? '⏸' : '▶'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Expanded player */}
              {renderPlayer(rec)}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 200 },
  // Header
  header: { alignItems: 'center', paddingTop: 16, paddingBottom: 20 },
  headerPi: { fontSize: 48, color: Theme.colors.primary, fontWeight: '700', marginBottom: 4 },
  title: { fontSize: 22, color: Theme.colors.text, fontWeight: Theme.fontWeight.bold, marginBottom: 4 },
  subtitle: { fontSize: 13, color: Theme.colors.textSecondary, textAlign: 'center' },
  // Record section
  recSection: { alignItems: 'center', marginBottom: 28 },
  recBtn: { alignItems: 'center', gap: 8 },
  recBtnCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Theme.colors.error,
    borderWidth: 4, borderColor: Theme.colors.text + '30',
  },
  recBtnLabel: { color: Theme.colors.textSecondary, fontSize: 14 },
  recActive: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: Theme.colors.surface, borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 14,
    borderWidth: 2, borderColor: Theme.colors.error,
  },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Theme.colors.error },
  recTime: {
    color: Theme.colors.error, fontSize: 28, fontWeight: '700',
    fontFamily: 'monospace', minWidth: 80, textAlign: 'center',
  },
  recStopBtn: {
    width: 40, height: 40, borderRadius: 8,
    backgroundColor: Theme.colors.error, alignItems: 'center', justifyContent: 'center',
  },
  recStopInner: { width: 16, height: 16, backgroundColor: '#fff', borderRadius: 2 },
  // Empty
  emptyWrap: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: Theme.colors.text, fontSize: 18, fontWeight: Theme.fontWeight.semibold, marginBottom: 4 },
  emptySub: { color: Theme.colors.textMuted, fontSize: 14 },
  // Card
  card: {
    backgroundColor: Theme.colors.surface, borderRadius: 16,
    padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: Theme.colors.border,
  },
  cardActive: { borderColor: Theme.colors.primary },
  cardHead: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  cardTitle: { color: Theme.colors.text, fontSize: 16, fontWeight: Theme.fontWeight.semibold },
  cardDate: { color: Theme.colors.textMuted, fontSize: 12 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 },
  editInput: {
    flex: 1, backgroundColor: Theme.colors.backgroundInput, borderRadius: 8,
    padding: 8, color: Theme.colors.text, fontSize: 14, textAlign: 'right',
  },
  editSave: { color: Theme.colors.primary, fontSize: 22, fontWeight: '700' },
  // Waveform
  waveWrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 36, gap: 2, marginBottom: 12,
  },
  waveBar: { width: 3, borderRadius: 2 },
  waveBarIdle: { backgroundColor: Theme.colors.borderLight },
  waveBarPlayed: { backgroundColor: Theme.colors.primary },
  // Card footer
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  deleteText: { color: Theme.colors.error, fontSize: 13, fontWeight: Theme.fontWeight.medium },
  durationText: { color: Theme.colors.textSecondary, fontSize: 14, fontFamily: 'monospace' },
  cardPlayBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Theme.colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  cardPlayBtnActive: { backgroundColor: Theme.colors.warning },
  cardPlayIcon: { color: '#fff', fontSize: 16 },
  // Player
  player: {
    marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: Theme.colors.border,
  },
  progressWrap: { height: 24, justifyContent: 'center' },
  progressTrack: {
    height: 4, backgroundColor: Theme.colors.backgroundInput, borderRadius: 2,
  },
  progressFill: {
    height: 4, backgroundColor: Theme.colors.primary, borderRadius: 2,
    position: 'absolute', left: 0, top: 0,
  },
  progressThumb: {
    position: 'absolute', top: -5, marginLeft: -7,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: Theme.colors.primary,
  },
  timeRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 12,
  },
  timeText: { color: Theme.colors.textMuted, fontSize: 12, fontFamily: 'monospace' },
  controls: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20,
  },
  speedBtn: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: Theme.colors.border,
  },
  speedText: { color: Theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },
  skipText: { color: Theme.colors.textSecondary, fontSize: 14, fontWeight: '600' },
  playPauseBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Theme.colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  playPauseIcon: { color: '#fff', fontSize: 20 },
  stopBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Theme.colors.backgroundInput, alignItems: 'center', justifyContent: 'center',
  },
  stopIcon: { color: Theme.colors.textSecondary, fontSize: 16 },
});
