import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Theme } from '@constants/theme';
import { PI_DIGITS, getDigitRange, formatDigits } from '@constants/piDigits';
import { Button } from '@components/Button';
import StorageManager from '@storage/StorageManager';

type TrainingMode = 'learn' | 'type' | 'review';

export const TrainingScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  // Current position in pi digits
  const [currentPos, setCurrentPos] = useState(0);
  const [mode, setMode] = useState<TrainingMode>('learn');
  const [groupSize, setGroupSize] = useState(1);
  const [showDigits, setShowDigits] = useState(10); // how many digits visible at once

  // Typing mode state
  const [typedDigits, setTypedDigits] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalIncorrect, setTotalIncorrect] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const mountedRef = useRef(true);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      timeoutRefs.current.forEach(t => clearTimeout(t));
    };
  }, []);

  // Load saved position
  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const data = await StorageManager.getAllUserData();
      if (data.totalDigitsMastered) {
        setCurrentPos(data.totalDigitsMastered);
      }
    } catch (e) {
      console.error('Error loading progress:', e);
    }
  };

  const saveProgress = async (pos: number) => {
    try {
      await StorageManager.updateTodayProgress({
        currentMastery: pos,
        digitsLearned: pos - currentPos > 0 ? pos - currentPos : 0,
        totalCorrect,
        totalIncorrect,
        practiceCount: 1,
      });
    } catch (e) {
      console.error('Error saving progress:', e);
    }
  };

  // Get the digits to display in learn mode
  const getVisibleDigits = () => {
    const start = Math.max(0, currentPos - 5);
    const end = Math.min(PI_DIGITS.length, currentPos + showDigits);
    return {
      before: getDigitRange(start, currentPos),
      current: getDigitRange(currentPos, Math.min(currentPos + groupSize, PI_DIGITS.length)),
      after: getDigitRange(currentPos + groupSize, end),
      startIndex: start,
    };
  };

  // Handle number pad press in typing mode
  const handleDigitPress = (digit: string) => {
    const expectedDigit = PI_DIGITS[currentPos + typedDigits.length];

    if (digit === expectedDigit) {
      const newTyped = typedDigits + digit;
      setTypedDigits(newTyped);
      setIsCorrect(true);
      setTotalCorrect(prev => prev + 1);

      // Move to next position after typing group
      if (newTyped.length >= groupSize) {
        const t1 = setTimeout(() => {
          if (!mountedRef.current) return;
          setCurrentPos(prev => prev + newTyped.length);
          setTypedDigits('');
          setIsCorrect(null);
          setStreak(prev => {
            const newStreak = prev + 1;
            setBestStreak(best => Math.max(best, newStreak));
            return newStreak;
          });
          saveProgress(currentPos + newTyped.length);
        }, 200);
        timeoutRefs.current.push(t1);
      }
    } else {
      setIsCorrect(false);
      setTotalIncorrect(prev => prev + 1);
      setStreak(0);
      setLives(prev => {
        if (prev <= 1) {
          Alert.alert('נגמרו החיים!', `הגעת לספרה ${currentPos + 1}. רוצה להתחיל מחדש?`, [
            { text: 'כן', onPress: () => resetGame() },
            { text: 'המשך מכאן', onPress: () => setLives(3) },
          ]);
          return 0;
        }
        return prev - 1;
      });
      // Flash red then clear
      const t2 = setTimeout(() => {
        if (!mountedRef.current) return;
        setTypedDigits('');
        setIsCorrect(null);
      }, 500);
      timeoutRefs.current.push(t2);
    }
  };

  const resetGame = () => {
    setCurrentPos(0);
    setTypedDigits('');
    setIsCorrect(null);
    setStreak(0);
    setLives(3);
    setTotalCorrect(0);
    setTotalIncorrect(0);
  };

  // Number pad
  const renderNumberPad = () => {
    const rows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'x'],
    ];

    return (
      <View style={styles.numPad}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.numPadRow}>
            {row.map((digit, colIndex) => {
              if (digit === '') return <View key={colIndex} style={styles.numPadEmpty} />;
              if (digit === 'x') {
                return (
                  <TouchableOpacity
                    key={colIndex}
                    style={[styles.numPadButton, styles.numPadDelete]}
                    onPress={() => setTypedDigits(prev => prev.slice(0, -1))}
                  >
                    <Text style={styles.numPadDeleteText}>{'<'}</Text>
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={colIndex}
                  style={styles.numPadButton}
                  onPress={() => handleDigitPress(digit)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.numPadText}>{digit}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  // Learn mode: show digits and allow scrolling
  const renderLearnMode = () => {
    const { before, current, after } = getVisibleDigits();
    return (
      <View style={styles.learnContainer}>
        <Text style={styles.learnLabel}>ספרה {currentPos + 1}</Text>
        <View style={styles.digitDisplay}>
          <Text style={styles.digitsBefore}>{formatDigits(before, groupSize)}</Text>
          <Text style={styles.digitsCurrent}>{formatDigits(current, groupSize)}</Text>
          <Text style={styles.digitsAfter}>{formatDigits(after, groupSize)}</Text>
        </View>
        <Text style={styles.piPrefix}>...{currentPos === 0 ? '3.' : ''}</Text>

        <View style={styles.learnControls}>
          <Button
            title="הקודם"
            onPress={() => setCurrentPos(prev => Math.max(0, prev - groupSize))}
            variant="outline"
            size="sm"
          />
          <Button
            title="הבא"
            onPress={() => setCurrentPos(prev => Math.min(PI_DIGITS.length - groupSize, prev + groupSize))}
            variant="primary"
            size="sm"
            disabled={currentPos >= PI_DIGITS.length - groupSize}
          />
        </View>

        <View style={styles.jumpControls}>
          <Button
            title="התחלה"
            onPress={() => setCurrentPos(0)}
            variant="ghost"
            size="sm"
          />
          <Button
            title="קפוץ +10"
            onPress={() => setCurrentPos(prev => Math.min(PI_DIGITS.length - 10, prev + 10))}
            variant="ghost"
            size="sm"
          />
          <Button
            title="קפוץ +50"
            onPress={() => setCurrentPos(prev => Math.min(PI_DIGITS.length - 50, prev + 50))}
            variant="ghost"
            size="sm"
          />
        </View>
      </View>
    );
  };

  // Type mode: user types the digits
  const renderTypeMode = () => {
    const expectedRange = getDigitRange(currentPos, currentPos + showDigits);
    return (
      <View style={styles.typeContainer}>
        {/* Status bar */}
        <View style={styles.statusBar}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>ספרה</Text>
            <Text style={styles.statusValue}>{currentPos + 1}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>רצף</Text>
            <Text style={[styles.statusValue, { color: Theme.colors.accent }]}>{streak}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>חיים</Text>
            <Text style={styles.statusValue}>
              {Array(lives).fill('❤️').join('')}
              {Array(3 - lives).fill('🖤').join('')}
            </Text>
          </View>
        </View>

        {/* Current digit display */}
        <View style={[
          styles.typeDisplay,
          isCorrect === true && styles.typeDisplayCorrect,
          isCorrect === false && styles.typeDisplayIncorrect,
        ]}>
          <Text style={styles.typeHint}>
            {currentPos > 0 ? '...' + getDigitRange(Math.max(0, currentPos - 3), currentPos) : '3.'}
          </Text>
          <Text style={[
            styles.typedText,
            isCorrect === true && { color: Theme.colors.correct },
            isCorrect === false && { color: Theme.colors.incorrect },
          ]}>
            {typedDigits || '_'.repeat(groupSize)}
          </Text>
          <Text style={styles.typeRemaining}>
            {'_'.repeat(Math.max(0, groupSize - typedDigits.length))}
          </Text>
        </View>

        {/* Score */}
        <View style={styles.scoreRow}>
          <Text style={styles.scoreText}>נכון: {totalCorrect}</Text>
          <Text style={styles.scoreText}>שגוי: {totalIncorrect}</Text>
          <Text style={styles.scoreText}>שיא רצף: {bestStreak}</Text>
        </View>

        {renderNumberPad()}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Mode selector */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'learn' && styles.modeTabActive]}
          onPress={() => setMode('learn')}
        >
          <Text style={[styles.modeTabText, mode === 'learn' && styles.modeTabTextActive]}>
            למידה
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'type' && styles.modeTabActive]}
          onPress={() => setMode('type')}
        >
          <Text style={[styles.modeTabText, mode === 'type' && styles.modeTabTextActive]}>
            הקלדה
          </Text>
        </TouchableOpacity>
      </View>

      {/* Group size selector */}
      <View style={styles.groupSelector}>
        <Text style={styles.groupLabel}>קבוצה:</Text>
        {[1, 2, 4, 10].map(size => (
          <TouchableOpacity
            key={size}
            style={[styles.groupButton, groupSize === size && styles.groupButtonActive]}
            onPress={() => setGroupSize(size)}
          >
            <Text style={[styles.groupButtonText, groupSize === size && styles.groupButtonTextActive]}>
              {size}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {mode === 'learn' ? renderLearnMode() : renderTypeMode()}
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
    flexGrow: 1,
    padding: Theme.spacing.md,
  },
  // Mode selector
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surface,
    margin: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    padding: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: Theme.borderRadius.md,
  },
  modeTabActive: {
    backgroundColor: Theme.colors.primary,
  },
  modeTabText: {
    fontSize: Theme.fontSize.base,
    color: Theme.colors.textSecondary,
    fontWeight: Theme.fontWeight.medium,
  },
  modeTabTextActive: {
    color: Theme.colors.white,
    fontWeight: Theme.fontWeight.bold,
  },
  // Group selector
  groupSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  groupLabel: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.fontSize.sm,
  },
  groupButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.surface,
  },
  groupButtonActive: {
    backgroundColor: Theme.colors.primary,
  },
  groupButtonText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.medium,
  },
  groupButtonTextActive: {
    color: Theme.colors.white,
    fontWeight: Theme.fontWeight.bold,
  },
  // Learn mode
  learnContainer: {
    alignItems: 'center',
    paddingTop: Theme.spacing.xl,
  },
  learnLabel: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.fontSize.base,
    marginBottom: Theme.spacing.md,
  },
  digitDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    minHeight: 100,
    width: '100%',
  },
  piPrefix: {
    color: Theme.colors.textMuted,
    fontSize: Theme.fontSize.lg,
    marginTop: Theme.spacing.sm,
  },
  digitsBefore: {
    fontSize: Theme.fontSize.xxl,
    color: Theme.colors.textMuted,
    letterSpacing: 2,
  },
  digitsCurrent: {
    fontSize: Theme.fontSize.huge,
    color: Theme.colors.primary,
    fontWeight: Theme.fontWeight.bold,
    letterSpacing: 2,
    marginHorizontal: 4,
  },
  digitsAfter: {
    fontSize: Theme.fontSize.xxl,
    color: Theme.colors.textSecondary,
    letterSpacing: 2,
  },
  learnControls: {
    flexDirection: 'row',
    gap: 16,
    marginTop: Theme.spacing.xl,
  },
  jumpControls: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Theme.spacing.md,
  },
  // Type mode
  typeContainer: {
    flex: 1,
    alignItems: 'center',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    color: Theme.colors.textMuted,
    fontSize: Theme.fontSize.xs,
  },
  statusValue: {
    color: Theme.colors.text,
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
  },
  typeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    width: '100%',
    minHeight: 80,
    borderWidth: 2,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.md,
  },
  typeDisplayCorrect: {
    borderColor: Theme.colors.correct,
  },
  typeDisplayIncorrect: {
    borderColor: Theme.colors.incorrect,
  },
  typeHint: {
    fontSize: Theme.fontSize.xl,
    color: Theme.colors.textMuted,
    letterSpacing: 2,
  },
  typedText: {
    fontSize: Theme.fontSize.xxxl,
    color: Theme.colors.primary,
    fontWeight: Theme.fontWeight.bold,
    letterSpacing: 4,
    marginHorizontal: 4,
  },
  typeRemaining: {
    fontSize: Theme.fontSize.xxxl,
    color: Theme.colors.textMuted,
    letterSpacing: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: Theme.spacing.md,
  },
  scoreText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.fontSize.sm,
  },
  // Number pad
  numPad: {
    width: '100%',
    maxWidth: 300,
    gap: 8,
  },
  numPadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  numPadButton: {
    width: 72,
    height: 56,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadow.sm,
  },
  numPadEmpty: {
    width: 72,
    height: 56,
  },
  numPadDelete: {
    backgroundColor: Theme.colors.surfaceLight,
  },
  numPadText: {
    fontSize: Theme.fontSize.xxl,
    color: Theme.colors.text,
    fontWeight: Theme.fontWeight.semibold,
  },
  numPadDeleteText: {
    fontSize: Theme.fontSize.xl,
    color: Theme.colors.textSecondary,
  },
});
