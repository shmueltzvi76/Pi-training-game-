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

type TrainingState = 'setup' | 'playing';
type TrainingMode = 'learn' | 'type';

// Step multiplier presets
const STEP_PRESETS = [1, 10, 25, 100, 500, 1000];

export const TrainingScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  // Setup state
  const [trainingState, setTrainingState] = useState<TrainingState>('setup');
  const [setupStartDigit, setSetupStartDigit] = useState(1);
  const [setupEndDigit, setSetupEndDigit] = useState(0); // 0 = infinity (no limit)
  const [savedStartDigit, setSavedStartDigit] = useState<number | null>(null);
  const [savedEndDigit, setSavedEndDigit] = useState<number | null>(null);
  const [startDigitStepIndex, setStartDigitStepIndex] = useState(0);
  const [endDigitStepIndex, setEndDigitStepIndex] = useState(0);

  // Playing state
  const [currentPos, setCurrentPos] = useState(0);
  const [mode, setMode] = useState<TrainingMode>('learn');
  const [groupSize, setGroupSize] = useState(1);
  const [showDigits, setShowDigits] = useState(10);

  // Typing mode state
  const [typedDigits, setTypedDigits] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalIncorrect, setTotalIncorrect] = useState(0);
  const [numpadReversed, setNumpadReversed] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [typedHistory, setTypedHistory] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);
  const mountedRef = useRef(true);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const historyScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadBookmarks();
    loadNumpadSetting();
    return () => {
      mountedRef.current = false;
      timeoutRefs.current.forEach(t => clearTimeout(t));
    };
  }, []);

  const loadNumpadSetting = async () => {
    try {
      const data = await StorageManager.getAllUserData();
      if (data.settings?.numpadReversed) {
        setNumpadReversed(true);
      }
    } catch (e) {
      // ignore
    }
  };

  const loadBookmarks = async () => {
    try {
      const data = await StorageManager.getAllUserData();
      const settings = data.settings;
      if (settings?.trainingStartDigitBookmark) {
        setSavedStartDigit(settings.trainingStartDigitBookmark);
      }
      if (settings?.trainingEndDigitBookmark !== undefined && settings?.trainingEndDigitBookmark !== null) {
        setSavedEndDigit(settings.trainingEndDigitBookmark);
      }
    } catch (e) {
      // ignore
    }
  };

  const saveBookmark = async (type: 'start' | 'end') => {
    try {
      if (type === 'start') {
        setSavedStartDigit(setupStartDigit);
        await StorageManager.updateSettings({ trainingStartDigitBookmark: setupStartDigit });
      } else {
        setSavedEndDigit(setupEndDigit);
        await StorageManager.updateSettings({ trainingEndDigitBookmark: setupEndDigit });
      }
    } catch (e) {
      // ignore
    }
  };

  const loadSavedBookmark = (type: 'start' | 'end') => {
    if (type === 'start' && savedStartDigit !== null) {
      setSetupStartDigit(savedStartDigit);
    } else if (type === 'end' && savedEndDigit !== null) {
      setSetupEndDigit(savedEndDigit);
    }
  };

  const getStartDigitStep = () => STEP_PRESETS[startDigitStepIndex];
  const getEndDigitStep = () => STEP_PRESETS[endDigitStepIndex];

  const cycleStartDigitStep = () => {
    setStartDigitStepIndex(prev => (prev + 1) % STEP_PRESETS.length);
  };

  const cycleEndDigitStep = () => {
    setEndDigitStepIndex(prev => (prev + 1) % STEP_PRESETS.length);
  };

  const adjustStartDigit = (direction: 1 | -1) => {
    const step = getStartDigitStep();
    setSetupStartDigit(prev => Math.max(1, Math.min(PI_DIGITS.length, prev + direction * step)));
  };

  const adjustEndDigit = (direction: 1 | -1) => {
    const step = getEndDigitStep();
    setSetupEndDigit(prev => {
      const next = prev + direction * step;
      if (next < 1) return 0; // go to infinity
      if (prev === 0 && direction === 1) return step; // from infinity, start at step value
      return Math.min(PI_DIGITS.length, next);
    });
  };

  // End limit: only active when endDigit > 0
  const hasEndLimit = setupEndDigit > 0;
  const endPos = setupEndDigit - 1; // 0-based end position

  const startTraining = () => {
    if (hasEndLimit && setupEndDigit <= setupStartDigit) {
      Alert.alert('Error', 'End digit must be greater than start digit');
      return;
    }
    const pos = setupStartDigit - 1; // convert to 0-based
    setCurrentPos(pos);
    setTrainingState('playing');
    setTypedDigits('');
    setIsCorrect(null);
    setStreak(0);
    setLives(3);
    setTotalCorrect(0);
    setTotalIncorrect(0);
    setTypedHistory([]);
    setShowHistory(false);
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

  const handleDigitPress = (digit: string) => {
    // Block input if reached end or beyond PI_DIGITS
    if (hasEndLimit && currentPos > endPos) return;
    if (currentPos + typedDigits.length >= PI_DIGITS.length) return;

    const expectedDigit = PI_DIGITS[currentPos + typedDigits.length];

    if (digit === expectedDigit) {
      const newTyped = typedDigits + digit;
      setTypedDigits(newTyped);
      setIsCorrect(true);
      setTotalCorrect(prev => prev + 1);
      setTypedHistory(prev => [...prev, digit]);

      if (newTyped.length >= groupSize) {
        const nextPos = currentPos + newTyped.length;
        // Don't advance past end position (if set)
        const clampedPos = hasEndLimit ? Math.min(nextPos, endPos + 1) : nextPos;
        const t1 = setTimeout(() => {
          if (!mountedRef.current) return;
          setCurrentPos(clampedPos);
          setTypedDigits('');
          setIsCorrect(null);
          setStreak(prev => {
            const newStreak = prev + 1;
            setBestStreak(best => Math.max(best, newStreak));
            return newStreak;
          });
          saveProgress(clampedPos);
        }, 200);
        timeoutRefs.current.push(t1);
      }
    } else {
      setIsCorrect(false);
      setTotalIncorrect(prev => prev + 1);
      setStreak(0);
      setLives(prev => {
        if (prev <= 1) {
          Alert.alert('Game Over!', `You reached digit ${currentPos + 1}. Want to restart?`, [
            { text: 'Yes', onPress: () => resetGame() },
            { text: 'Continue here', onPress: () => setLives(3) },
          ]);
          return 0;
        }
        return prev - 1;
      });
      const t2 = setTimeout(() => {
        if (!mountedRef.current) return;
        setTypedDigits('');
        setIsCorrect(null);
      }, 500);
      timeoutRefs.current.push(t2);
    }
  };

  const resetGame = () => {
    setCurrentPos(setupStartDigit - 1);
    setTypedDigits('');
    setIsCorrect(null);
    setStreak(0);
    setLives(3);
    setTotalCorrect(0);
    setTotalIncorrect(0);
    setTypedHistory([]);
  };

  // Setup screen - matching screenshot design
  if (trainingState === 'setup') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.setupScroll} showsVerticalScrollIndicator={false}>
          {/* Pi logo */}
          <View style={styles.logoContainer}>
            <Text style={styles.piSymbol}>{'\u03C0'}</Text>
            <View style={styles.logoTextContainer}>
              <Text style={styles.logoLabel}>Pi</Text>
              <Text style={styles.logoVersion}>3.14</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.setupTitle}>Training Mode</Text>

          {/* Start at Digit */}
          <Text style={styles.settingLabel}>Start at Digit {setupStartDigit}</Text>
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => loadSavedBookmark('start')}
              onLongPress={() => saveBookmark('start')}
            >
              <Text style={styles.controlBtnText}>{'\u2691'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtn} onPress={() => adjustStartDigit(1)}>
              <Text style={styles.controlBtnText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtn} onPress={() => adjustStartDigit(-1)}>
              <Text style={styles.controlBtnText}>{'\u2212'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.multiplierBtn} onPress={cycleStartDigitStep}>
              <Text style={styles.multiplierBtnText}>x{getStartDigitStep()}</Text>
            </TouchableOpacity>
          </View>

          {/* End at Digit */}
          <Text style={styles.settingLabel}>End at Digit {setupEndDigit === 0 ? '\u221E' : setupEndDigit}</Text>
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => loadSavedBookmark('end')}
              onLongPress={() => saveBookmark('end')}
            >
              <Text style={styles.controlBtnText}>{'\u2691'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtn} onPress={() => adjustEndDigit(1)}>
              <Text style={styles.controlBtnText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtn} onPress={() => adjustEndDigit(-1)}>
              <Text style={styles.controlBtnText}>{'\u2212'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.multiplierBtn} onPress={cycleEndDigitStep}>
              <Text style={styles.multiplierBtnText}>x{getEndDigitStep()}</Text>
            </TouchableOpacity>
          </View>

          {/* Start button */}
          <TouchableOpacity style={styles.actionBtn} onPress={startTraining}>
            <Text style={styles.actionBtnText}>Start</Text>
          </TouchableOpacity>

          {/* Return button */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation?.navigate('Home')}
          >
            <Text style={styles.actionBtnText}>Return</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Number pad
  const renderNumberPad = () => {
    const rows = numpadReversed
      ? [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', 'x']]
      : [['7', '8', '9'], ['4', '5', '6'], ['1', '2', '3'], ['', '0', 'x']];

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

  // Learn mode
  const renderLearnMode = () => {
    const { before, current, after } = getVisibleDigits();
    const maxPos = hasEndLimit ? endPos : PI_DIGITS.length - 1;
    return (
      <View style={styles.learnContainer}>
        <Text style={styles.learnLabel}>
          Digit {currentPos + 1}{hasEndLimit ? ` / ${setupEndDigit}` : ''}
        </Text>
        <View style={styles.digitDisplay}>
          <Text style={styles.digitsBefore}>{formatDigits(before, groupSize)}</Text>
          <Text style={styles.digitsCurrent}>{formatDigits(current, groupSize)}</Text>
          <Text style={styles.digitsAfter}>{formatDigits(after, groupSize)}</Text>
        </View>
        <Text style={styles.piPrefix}>...{currentPos === 0 ? '3.' : ''}</Text>

        <View style={styles.learnControls}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setCurrentPos(prev => Math.max(setupStartDigit - 1, prev - groupSize))}
          >
            <Text style={styles.navBtnText}>Previous</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setCurrentPos(prev => Math.min(maxPos, prev + groupSize))}
          >
            <Text style={styles.navBtnText}>Next</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.jumpControls}>
          <TouchableOpacity style={styles.jumpBtn} onPress={() => setCurrentPos(setupStartDigit - 1)}>
            <Text style={styles.jumpBtnText}>Start</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.jumpBtn}
            onPress={() => setCurrentPos(prev => Math.min(maxPos, prev + 10))}
          >
            <Text style={styles.jumpBtnText}>+10</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.jumpBtn}
            onPress={() => setCurrentPos(prev => Math.min(maxPos, prev + 50))}
          >
            <Text style={styles.jumpBtnText}>+50</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Type mode
  const renderTypeMode = () => {
    const startPos0 = setupStartDigit - 1;
    const typed = currentPos - startPos0;
    const total = hasEndLimit ? setupEndDigit - setupStartDigit : null;
    const remaining = total !== null ? Math.max(0, total - typed) : null;
    const reachedEnd = hasEndLimit && currentPos > endPos;

    return (
      <View style={styles.typeContainer}>
        {/* Progress counter */}
        <View style={styles.progressCounter}>
          <Text style={styles.progressCounterText}>
            {typed} typed{total !== null ? ` / ${total} total` : ''}
            {remaining !== null ? `  (${remaining} left)` : ''}
          </Text>
        </View>

        {/* Status bar */}
        <View style={styles.statusBar}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Digit</Text>
            <Text style={styles.statusValue}>{currentPos + 1}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Streak</Text>
            <Text style={[styles.statusValue, { color: '#14B8A6' }]}>{streak}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Lives</Text>
            <Text style={styles.statusValue}>
              {Array(lives).fill('\u2764\uFE0F').join('')}
              {Array(3 - lives).fill('\uD83D\uDDA4').join('')}
            </Text>
          </View>
        </View>

        {/* Reached end message */}
        {reachedEnd && (
          <View style={styles.endReachedBanner}>
            <Text style={styles.endReachedText}>
              Reached end ({setupEndDigit}). {typed} digits typed.
            </Text>
          </View>
        )}

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
            isCorrect === true && { color: '#10B981' },
            isCorrect === false && { color: '#EF4444' },
          ]}>
            {typedDigits || '_'.repeat(groupSize)}
          </Text>
          <Text style={styles.typeRemaining}>
            {'_'.repeat(Math.max(0, groupSize - typedDigits.length))}
          </Text>
        </View>

        {/* Digit indicator / Wrong Digit text */}
        <Text style={[styles.digitIndicator, isCorrect === false && styles.digitIndicatorWrong]}>
          {isCorrect === false ? 'Wrong Digit' : `Digit ${currentPos + 1}`}
        </Text>

        {/* Score */}
        <View style={styles.scoreRow}>
          <Text style={styles.scoreText}>Correct: {totalCorrect}</Text>
          <Text style={styles.scoreText}>Wrong: {totalIncorrect}</Text>
          <Text style={styles.scoreText}>Best: {bestStreak}</Text>
        </View>

        {renderNumberPad()}
      </View>
    );
  };

  // Render history panel
  const renderHistoryPanel = () => {
    if (!showHistory || typedHistory.length === 0) return null;
    const historyStr = typedHistory.join('');
    // Format in groups of 10
    const groups: string[] = [];
    for (let i = 0; i < historyStr.length; i += 10) {
      groups.push(historyStr.slice(i, i + 10));
    }
    return (
      <View style={styles.historyPanel}>
        <ScrollView
          ref={historyScrollRef}
          style={styles.historyScroll}
          onContentSizeChange={() => historyScrollRef.current?.scrollToEnd()}
        >
          <Text style={styles.historyText}>{groups.join(' ')}</Text>
        </ScrollView>
      </View>
    );
  };

  // Playing screen
  return (
    <View style={styles.container}>
      {/* Header with info */}
      <View style={styles.playingHeader}>
        <Text style={styles.playingHeaderText}>Start at {setupStartDigit} digit</Text>
        <View style={styles.playingHeaderRight}>
          <Text style={styles.playingHeaderText}>Training Mode</Text>
          <TouchableOpacity onPress={() => setTrainingState('setup')}>
            <Text style={styles.closeBtn}>{'\u2715'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Count and scroll icon */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>Count {mode === 'type' ? totalCorrect : 0}</Text>
        <TouchableOpacity onPress={() => setShowHistory(prev => !prev)}>
          <Text style={[styles.scrollIcon, showHistory && { color: '#14B8A6' }]}>{'\u21C5'}</Text>
        </TouchableOpacity>
      </View>

      {renderHistoryPanel()}

      {/* Mode selector */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'learn' && styles.modeTabActive]}
          onPress={() => setMode('learn')}
        >
          <Text style={[styles.modeTabText, mode === 'learn' && styles.modeTabTextActive]}>
            Learn
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'type' && styles.modeTabActive]}
          onPress={() => setMode('type')}
        >
          <Text style={[styles.modeTabText, mode === 'type' && styles.modeTabTextActive]}>
            Type
          </Text>
        </TouchableOpacity>
      </View>

      {/* Group size selector */}
      <View style={styles.groupSelector}>
        <Text style={styles.groupLabel}>Group:</Text>
        {[1, 2, 5, 10, 15, 20].map(size => (
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

      {/* Back to setup */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => setTrainingState('setup')}
      >
        <Text style={styles.backBtnText}>Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {mode === 'learn' ? renderLearnMode() : renderTypeMode()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 100,
  },
  // Setup screen
  setupScroll: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 60,
  },
  piSymbol: {
    fontSize: 80,
    color: '#CCCCCC',
    fontStyle: 'italic',
    fontWeight: '300',
  },
  logoTextContainer: {
    marginLeft: 4,
  },
  logoLabel: {
    fontSize: 20,
    color: '#CCCCCC',
    fontWeight: '400',
  },
  logoVersion: {
    fontSize: 20,
    color: '#CCCCCC',
    fontWeight: '400',
  },
  setupTitle: {
    fontSize: 28,
    color: '#CCCCCC',
    fontWeight: '400',
    marginBottom: 24,
    fontFamily: 'monospace',
  },
  settingLabel: {
    fontSize: 20,
    color: '#CCCCCC',
    fontWeight: '400',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 40,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderWidth: 1,
    borderColor: '#666666',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  controlBtnText: {
    fontSize: 28,
    color: '#CCCCCC',
    fontWeight: '300',
  },
  multiplierBtn: {
    paddingHorizontal: 16,
    height: 40,
    borderWidth: 1,
    borderColor: '#666666',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginLeft: 8,
  },
  multiplierBtnText: {
    fontSize: 16,
    color: '#CCCCCC',
    fontFamily: 'monospace',
  },
  actionBtn: {
    width: '65%',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#666666',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginBottom: 16,
  },
  actionBtnText: {
    fontSize: 22,
    color: '#CCCCCC',
    fontFamily: 'monospace',
    fontWeight: '400',
  },
  // Mode selector
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    margin: 16,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: '#333333',
  },
  modeTabText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  modeTabTextActive: {
    color: '#CCCCCC',
    fontWeight: '700',
  },
  // Group selector
  groupSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  groupLabel: {
    color: '#666666',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  groupButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#444444',
    backgroundColor: 'transparent',
  },
  groupButtonActive: {
    backgroundColor: '#333333',
    borderColor: '#CCCCCC',
  },
  groupButtonText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  groupButtonTextActive: {
    color: '#CCCCCC',
    fontWeight: '700',
  },
  // Back button
  backBtn: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#444444',
    marginBottom: 8,
  },
  backBtnText: {
    color: '#999999',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  // Learn mode
  learnContainer: {
    alignItems: 'center',
    paddingTop: 24,
  },
  learnLabel: {
    color: '#999999',
    fontSize: 16,
    marginBottom: 16,
    fontFamily: 'monospace',
  },
  digitDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#333333',
    minHeight: 100,
    width: '100%',
  },
  piPrefix: {
    color: '#666666',
    fontSize: 18,
    marginTop: 8,
    fontFamily: 'monospace',
  },
  digitsBefore: {
    fontSize: 24,
    color: '#666666',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  digitsCurrent: {
    fontSize: 40,
    color: '#EC4899',
    fontWeight: '700',
    letterSpacing: 2,
    marginHorizontal: 4,
    fontFamily: 'monospace',
  },
  digitsAfter: {
    fontSize: 24,
    color: '#999999',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  learnControls: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  navBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#666666',
  },
  navBtnText: {
    color: '#CCCCCC',
    fontSize: 16,
    fontFamily: 'monospace',
  },
  jumpControls: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  jumpBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#444444',
  },
  jumpBtnText: {
    color: '#999999',
    fontSize: 14,
    fontFamily: 'monospace',
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
    paddingVertical: 8,
    marginBottom: 16,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    color: '#666666',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  statusValue: {
    color: '#CCCCCC',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  typeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
    padding: 20,
    width: '100%',
    minHeight: 80,
    borderWidth: 2,
    borderColor: '#333333',
    marginBottom: 16,
  },
  typeDisplayCorrect: {
    borderColor: '#10B981',
  },
  typeDisplayIncorrect: {
    borderColor: '#EF4444',
  },
  typeHint: {
    fontSize: 20,
    color: '#666666',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  typedText: {
    fontSize: 32,
    color: '#EC4899',
    fontWeight: '700',
    letterSpacing: 4,
    marginHorizontal: 4,
    fontFamily: 'monospace',
  },
  typeRemaining: {
    fontSize: 32,
    color: '#444444',
    letterSpacing: 4,
    fontFamily: 'monospace',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
  },
  scoreText: {
    color: '#999999',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  // Number pad
  numPad: {
    width: '100%',
    gap: 8,
    paddingHorizontal: '5%',
  },
  numPadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  numPadButton: {
    width: '28%',
    aspectRatio: 1.3,
    borderWidth: 1,
    borderColor: '#444444',
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numPadEmpty: {
    width: '28%',
    aspectRatio: 1.3,
  },
  numPadDelete: {
    backgroundColor: '#1A1A1A',
  },
  numPadText: {
    fontSize: 24,
    color: '#CCCCCC',
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  numPadDeleteText: {
    fontSize: 20,
    color: '#999999',
    fontFamily: 'monospace',
  },
  // Progress counter
  progressCounter: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 4,
  },
  progressCounterText: {
    color: '#14B8A6',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  // End reached banner
  endReachedBanner: {
    backgroundColor: '#1A2A1A',
    borderWidth: 1,
    borderColor: '#10B981',
    padding: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  endReachedText: {
    color: '#10B981',
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  // Digit indicator
  digitIndicator: {
    color: '#CCCCCC',
    fontSize: 18,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 8,
  },
  digitIndicatorWrong: {
    color: '#EF4444',
    fontWeight: '700',
  },
  // Playing header
  playingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  playingHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playingHeaderText: {
    color: '#999999',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  closeBtn: {
    color: '#CCCCCC',
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  // Count and scroll
  countRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 4,
  },
  countText: {
    color: '#999999',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  scrollIcon: {
    color: '#999999',
    fontSize: 24,
    fontWeight: '700',
  },
  // History panel
  historyPanel: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#333333',
    marginHorizontal: 16,
    marginBottom: 8,
    maxHeight: 120,
    padding: 8,
  },
  historyScroll: {
    flex: 1,
  },
  historyText: {
    color: '#14B8A6',
    fontSize: 14,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
});
