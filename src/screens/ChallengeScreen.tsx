import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Theme } from '@constants/theme';
import { PI_DIGITS, getDigitRange } from '@constants/piDigits';
import { Button } from '@components/Button';
import StorageManager from '@storage/StorageManager';

type ChallengeState = 'setup' | 'playing' | 'finished';

export const ChallengeScreen: React.FC<{ navigation?: any }> = () => {
  const [state, setState] = useState<ChallengeState>('setup');
  const [startDigit, setStartDigit] = useState(0);
  const [targetLength, setTargetLength] = useState(20);
  const [currentPos, setCurrentPos] = useState(0);
  const [lives, setLives] = useState(3);
  const [correctCount, setCorrectCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const [timerInterval, setTimerInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [timerInterval]);

  const startChallenge = () => {
    setState('playing');
    setCurrentPos(startDigit);
    setLives(3);
    setCorrectCount(0);
    setTimer(0);
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    setTimerInterval(interval);
  };

  const endChallenge = (completed: boolean) => {
    if (timerInterval) clearInterval(timerInterval);
    setTimerInterval(null);
    setState('finished');

    // Save session
    StorageManager.addSession({
      id: Date.now().toString(),
      mode: 'challenge',
      settings: { startDigit, challengeLength: targetLength, thinkingTime: 0 },
      stats: {
        currentPosition: currentPos,
        correctCount,
        incorrectCount: 3 - lives,
        lives,
        timeElapsed: timer,
        bestTime: null,
      },
      date: new Date().toISOString(),
      completed,
    });
  };

  const handleDigitPress = (digit: string) => {
    if (state !== 'playing') return;

    const expected = PI_DIGITS[currentPos];
    if (digit === expected) {
      setCorrectCount(c => c + 1);
      const nextPos = currentPos + 1;
      setCurrentPos(nextPos);

      if (nextPos >= startDigit + targetLength) {
        endChallenge(true);
      }
    } else {
      const newLives = lives - 1;
      setLives(newLives);
      if (newLives <= 0) {
        endChallenge(false);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Setup screen
  if (state === 'setup') {
    return (
      <View style={styles.container}>
        <View style={styles.setupContainer}>
          <Text style={styles.setupTitle}>הגדרות אתגר</Text>

          <Text style={styles.label}>ספרת התחלה:</Text>
          <View style={styles.optionRow}>
            {[0, 10, 50, 100].map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.optionBtn, startDigit === n && styles.optionBtnActive]}
                onPress={() => setStartDigit(n)}
              >
                <Text style={[styles.optionText, startDigit === n && styles.optionTextActive]}>
                  {n + 1}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>מספר ספרות:</Text>
          <View style={styles.optionRow}>
            {[10, 20, 50, 100].map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.optionBtn, targetLength === n && styles.optionBtnActive]}
                onPress={() => setTargetLength(n)}
              >
                <Text style={[styles.optionText, targetLength === n && styles.optionTextActive]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button
            title="התחל אתגר!"
            onPress={startChallenge}
            variant="secondary"
            size="lg"
            style={{ marginTop: 32, width: '100%' }}
          />
        </View>
      </View>
    );
  }

  // Finished screen
  if (state === 'finished') {
    const completed = correctCount >= targetLength;
    return (
      <View style={styles.container}>
        <View style={styles.finishedContainer}>
          <Text style={styles.finishedIcon}>{completed ? '🏆' : '💪'}</Text>
          <Text style={styles.finishedTitle}>
            {completed ? 'כל הכבוד!' : 'נסיון טוב!'}
          </Text>
          <Text style={styles.finishedStat}>ספרות נכונות: {correctCount}/{targetLength}</Text>
          <Text style={styles.finishedStat}>זמן: {formatTime(timer)}</Text>
          <Text style={styles.finishedStat}>חיים שנשארו: {lives}/3</Text>

          <Button
            title="נסה שוב"
            onPress={() => setState('setup')}
            variant="primary"
            size="lg"
            style={{ marginTop: 24, width: '100%' }}
          />
        </View>
      </View>
    );
  }

  // Playing screen
  const progress = ((currentPos - startDigit) / targetLength) * 100;

  return (
    <View style={styles.container}>
      {/* Status */}
      <View style={styles.playStatus}>
        <Text style={styles.playTimer}>{formatTime(timer)}</Text>
        <Text style={styles.playLives}>
          {Array(lives).fill('❤️').join('')}
          {Array(3 - lives).fill('🖤').join('')}
        </Text>
        <Text style={styles.playProgress}>{correctCount}/{targetLength}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      {/* Hint */}
      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>
          {currentPos > 0 ? '...' + getDigitRange(Math.max(0, currentPos - 4), currentPos) : '3.'}
        </Text>
        <Text style={styles.hintCurrent}>?</Text>
      </View>

      {/* Number pad */}
      <View style={styles.numPad}>
        {[[1, 2, 3], [4, 5, 6], [7, 8, 9], [null, 0, null]].map((row, ri) => (
          <View key={ri} style={styles.numPadRow}>
            {row.map((digit, ci) => {
              if (digit === null) return <View key={ci} style={styles.numPadEmpty} />;
              return (
                <TouchableOpacity
                  key={ci}
                  style={styles.numPadButton}
                  onPress={() => handleDigitPress(digit.toString())}
                  activeOpacity={0.6}
                >
                  <Text style={styles.numPadText}>{digit}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    padding: Theme.spacing.md,
  },
  // Setup
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setupTitle: {
    fontSize: Theme.fontSize.xxl,
    color: Theme.colors.text,
    fontWeight: Theme.fontWeight.bold,
    marginBottom: 32,
  },
  label: {
    fontSize: Theme.fontSize.base,
    color: Theme.colors.textSecondary,
    marginBottom: 8,
    alignSelf: 'flex-end',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    width: '100%',
    justifyContent: 'center',
  },
  optionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.surface,
    minWidth: 60,
    alignItems: 'center',
  },
  optionBtnActive: {
    backgroundColor: Theme.colors.secondary,
  },
  optionText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.medium,
  },
  optionTextActive: {
    color: Theme.colors.white,
    fontWeight: Theme.fontWeight.bold,
  },
  // Finished
  finishedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  finishedIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  finishedTitle: {
    fontSize: Theme.fontSize.xxxl,
    color: Theme.colors.text,
    fontWeight: Theme.fontWeight.bold,
    marginBottom: 24,
  },
  finishedStat: {
    fontSize: Theme.fontSize.lg,
    color: Theme.colors.textSecondary,
    marginBottom: 8,
  },
  // Playing
  playStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  playTimer: {
    fontSize: Theme.fontSize.xl,
    color: Theme.colors.text,
    fontWeight: Theme.fontWeight.bold,
  },
  playLives: {
    fontSize: Theme.fontSize.lg,
  },
  playProgress: {
    fontSize: Theme.fontSize.lg,
    color: Theme.colors.accent,
    fontWeight: Theme.fontWeight.bold,
  },
  progressBar: {
    height: 6,
    backgroundColor: Theme.colors.surface,
    borderRadius: 3,
    marginBottom: Theme.spacing.xl,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Theme.colors.secondary,
    borderRadius: 3,
  },
  hintContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.lg,
  },
  hintText: {
    fontSize: Theme.fontSize.xxl,
    color: Theme.colors.textMuted,
    letterSpacing: 3,
  },
  hintCurrent: {
    fontSize: Theme.fontSize.huge,
    color: Theme.colors.secondary,
    fontWeight: Theme.fontWeight.bold,
    marginLeft: 8,
  },
  // Number pad
  numPad: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  numPadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  numPadButton: {
    width: 80,
    height: 60,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadow.sm,
  },
  numPadEmpty: {
    width: 80,
    height: 60,
  },
  numPadText: {
    fontSize: Theme.fontSize.xxl,
    color: Theme.colors.text,
    fontWeight: Theme.fontWeight.semibold,
  },
});
