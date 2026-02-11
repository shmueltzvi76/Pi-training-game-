import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Theme } from '@constants/theme';
import { PI_DIGITS, getDigitRange } from '@constants/piDigits';
import StorageManager from '@storage/StorageManager';

type ChallengeState = 'setup' | 'playing' | 'finished';

// Thinking time options: 0 = infinity, otherwise seconds
const THINKING_TIMES = [0, 60, 30, 20, 15, 10, 5, 3, 2, 1];

// Step multiplier presets
const STEP_PRESETS = [1, 10, 25, 100, 500, 1000];

export const ChallengeScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const [state, setState] = useState<ChallengeState>('setup');
  const [startDigit, setStartDigit] = useState(1);
  const [challengeLength, setChallengeLength] = useState(300);
  const [thinkingTimeIndex, setThinkingTimeIndex] = useState(0); // index into THINKING_TIMES
  const [currentPos, setCurrentPos] = useState(0);
  const [lives, setLives] = useState(3);
  const [correctCount, setCorrectCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const [timerInterval, setTimerInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [thinkingTimer, setThinkingTimer] = useState(0);
  const [thinkingInterval, setThinkingInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Bookmarks
  const [savedStartDigit, setSavedStartDigit] = useState<number | null>(null);
  const [savedChallengeLength, setSavedChallengeLength] = useState<number | null>(null);

  // Step multipliers
  const [startDigitStepIndex, setStartDigitStepIndex] = useState(0);
  const [challengeLengthStepIndex, setChallengeLengthStepIndex] = useState(0);

  // Leaderboard
  const [leaderName, setLeaderName] = useState('---');
  const [leaderScore, setLeaderScore] = useState(0);

  // Best time
  const [bestTime, setBestTime] = useState<number | null>(null);

  // Numpad & history
  const [numpadReversed, setNumpadReversed] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [typedHistory, setTypedHistory] = useState<string[]>([]);
  const historyScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadBookmarks();
    loadLeaderboard();
    loadNumpadSetting();
    return () => {
      if (timerInterval) clearInterval(timerInterval);
      if (thinkingInterval) clearInterval(thinkingInterval);
    };
  }, [timerInterval, thinkingInterval]);

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
      if (settings?.challengeStartDigitBookmark) {
        setSavedStartDigit(settings.challengeStartDigitBookmark);
      }
      if (settings?.challengeLengthBookmark) {
        setSavedChallengeLength(settings.challengeLengthBookmark);
      }
    } catch (e) {
      // ignore
    }
  };

  const loadLeaderboard = async () => {
    try {
      const data = await StorageManager.getAllUserData();
      const sessions = data.sessions || [];
      let best = 0;
      let fastestTime: number | null = null;
      sessions.forEach((s: any) => {
        if (s.mode === 'challenge' && s.completed) {
          if (s.stats?.correctCount > best) {
            best = s.stats.correctCount;
          }
          if (s.stats?.timeElapsed != null) {
            if (fastestTime === null || s.stats.timeElapsed < fastestTime) {
              fastestTime = s.stats.timeElapsed;
            }
          }
        }
      });
      if (best > 0) {
        setLeaderName('You');
        setLeaderScore(best);
      }
      setBestTime(fastestTime);
    } catch (e) {
      // ignore
    }
  };

  const saveBookmark = async (type: 'start' | 'length') => {
    try {
      if (type === 'start') {
        setSavedStartDigit(startDigit);
        await StorageManager.updateSettings({ challengeStartDigitBookmark: startDigit });
      } else {
        setSavedChallengeLength(challengeLength);
        await StorageManager.updateSettings({ challengeLengthBookmark: challengeLength });
      }
    } catch (e) {
      // ignore
    }
  };

  const loadBookmark = (type: 'start' | 'length') => {
    if (type === 'start' && savedStartDigit !== null) {
      setStartDigit(savedStartDigit);
    } else if (type === 'length' && savedChallengeLength !== null) {
      setChallengeLength(savedChallengeLength);
    }
  };

  const getThinkingTime = () => THINKING_TIMES[thinkingTimeIndex];
  const getThinkingTimeDisplay = () => {
    const t = getThinkingTime();
    return t === 0 ? '\u221E' : `${t}s`;
  };

  const getStartDigitStep = () => STEP_PRESETS[startDigitStepIndex];
  const getChallengeLengthStep = () => STEP_PRESETS[challengeLengthStepIndex];

  const cycleStartDigitStep = () => {
    setStartDigitStepIndex(prev => (prev + 1) % STEP_PRESETS.length);
  };

  const cycleChallengeLengthStep = () => {
    setChallengeLengthStepIndex(prev => (prev + 1) % STEP_PRESETS.length);
  };

  const adjustStartDigit = (direction: 1 | -1) => {
    const step = getStartDigitStep();
    setStartDigit(prev => Math.max(1, Math.min(PI_DIGITS.length, prev + direction * step)));
  };

  const adjustChallengeLength = (direction: 1 | -1) => {
    const step = getChallengeLengthStep();
    setChallengeLength(prev => Math.max(1, Math.min(PI_DIGITS.length, prev + direction * step)));
  };

  const adjustThinkingTime = (direction: 'up' | 'down') => {
    setThinkingTimeIndex(prev => {
      if (direction === 'down') return Math.min(prev + 1, THINKING_TIMES.length - 1);
      return Math.max(prev - 1, 0);
    });
  };

  const startChallenge = () => {
    const actualStart = startDigit - 1; // convert to 0-based index
    const available = PI_DIGITS.length - actualStart;
    if (available <= 0) {
      Alert.alert('Error', 'Start position is beyond available digits');
      return;
    }
    if (challengeLength > available) {
      Alert.alert('Error', `Only ${available} digits available from position ${startDigit}. Reduce challenge length.`);
      return;
    }
    setState('playing');
    setCurrentPos(actualStart);
    setLives(3);
    setCorrectCount(0);
    setTimer(0);
    setTypedHistory([]);
    setShowHistory(false);

    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    setTimerInterval(interval);

    // Start thinking timer if not infinite
    const thinkTime = getThinkingTime();
    if (thinkTime > 0) {
      setThinkingTimer(thinkTime);
      const tInterval = setInterval(() => {
        setThinkingTimer(t => {
          if (t <= 1) {
            // Time's up - lose a life
            setLives(l => {
              const newLives = l - 1;
              if (newLives <= 0) {
                // Use functional update to get current correctCount
                setCorrectCount(currentCorrect => {
                  endChallenge(false, currentCorrect, 0);
                  return currentCorrect;
                });
              }
              return Math.max(0, newLives);
            });
            return thinkTime; // reset timer
          }
          return t - 1;
        });
      }, 1000);
      setThinkingInterval(tInterval);
    }
  };

  const endChallenge = (completed: boolean, finalCorrect?: number, finalLives?: number) => {
    if (timerInterval) clearInterval(timerInterval);
    if (thinkingInterval) clearInterval(thinkingInterval);
    setTimerInterval(null);
    setThinkingInterval(null);
    setState('finished');

    const savedCorrect = finalCorrect ?? correctCount;
    const savedLives = finalLives ?? lives;

    StorageManager.addSession({
      id: Date.now().toString(),
      mode: 'challenge',
      settings: { startDigit: startDigit - 1, challengeLength, thinkingTime: getThinkingTime() },
      stats: {
        currentPosition: currentPos,
        correctCount: savedCorrect,
        incorrectCount: 3 - savedLives,
        lives: savedLives,
        timeElapsed: timer,
        bestTime: null,
      },
      date: new Date().toISOString(),
      completed,
    });
  };

  const handleDigitPress = (digit: string) => {
    if (state !== 'playing') return;
    if (currentPos >= PI_DIGITS.length) return;

    const expected = PI_DIGITS[currentPos];
    if (digit === expected) {
      const newCorrect = correctCount + 1;
      setCorrectCount(newCorrect);
      setTypedHistory(prev => [...prev, digit]);
      const nextPos = currentPos + 1;
      setCurrentPos(nextPos);

      // Reset thinking timer
      const thinkTime = getThinkingTime();
      if (thinkTime > 0) {
        setThinkingTimer(thinkTime);
      }

      if (newCorrect >= challengeLength) {
        endChallenge(true, newCorrect, lives);
      }
    } else {
      const newLives = lives - 1;
      setLives(Math.max(0, newLives));
      if (newLives <= 0) {
        endChallenge(false, correctCount, 0);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Setup screen - matching screenshot design
  if (state === 'setup') {
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
          <Text style={styles.setupTitle}>Challenge Mode</Text>

          {/* Start at Digit */}
          <Text style={styles.settingLabel}>Start at Digit {startDigit}</Text>
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => loadBookmark('start')}
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

          {/* Challenge Length */}
          <Text style={styles.settingLabel}>Challenge Length {challengeLength}</Text>
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => loadBookmark('length')}
              onLongPress={() => saveBookmark('length')}
            >
              <Text style={styles.controlBtnText}>{'\u2691'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtn} onPress={() => adjustChallengeLength(1)}>
              <Text style={styles.controlBtnText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtn} onPress={() => adjustChallengeLength(-1)}>
              <Text style={styles.controlBtnText}>{'\u2212'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.multiplierBtn} onPress={cycleChallengeLengthStep}>
              <Text style={styles.multiplierBtnText}>x{getChallengeLengthStep()}</Text>
            </TouchableOpacity>
          </View>

          {/* Thinking Time */}
          <Text style={styles.settingLabel}>Thinking Time {getThinkingTimeDisplay()}</Text>
          <View style={styles.controlRow}>
            <TouchableOpacity style={styles.controlBtn} onPress={() => adjustThinkingTime('up')}>
              <Text style={styles.controlBtnText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtn} onPress={() => adjustThinkingTime('down')}>
              <Text style={styles.controlBtnText}>{'\u2212'}</Text>
            </TouchableOpacity>
          </View>

          {/* Start button */}
          <TouchableOpacity style={styles.actionBtn} onPress={startChallenge}>
            <Text style={styles.actionBtnText}>Start</Text>
          </TouchableOpacity>

          {/* Leaderboard */}
          <View style={styles.leaderSection}>
            <Text style={styles.leaderText}>
              Leader : {leaderName}
            </Text>
            <Text style={styles.leaderText}>
              {leaderScore > 0 ? `${leaderScore} Digits` : 'No records yet'}
            </Text>
          </View>

          {/* World Challenge button */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Alert.alert('World Challenge', 'Coming soon!')}
          >
            <Text style={styles.actionBtnText}>World Challenge</Text>
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

  // Finished screen
  if (state === 'finished') {
    const completed = correctCount >= challengeLength;
    return (
      <View style={styles.container}>
        <View style={styles.finishedContainer}>
          <Text style={styles.finishedTitle}>
            {completed ? 'Challenge Complete!' : 'Challenge Over'}
          </Text>
          <Text style={styles.finishedStat}>Correct: {correctCount}/{challengeLength}</Text>
          <Text style={styles.finishedStat}>Time: {formatTime(timer)}</Text>
          <Text style={styles.finishedStat}>Lives: {lives}/3</Text>

          <TouchableOpacity style={styles.actionBtn} onPress={() => setState('setup')}>
            <Text style={styles.actionBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation?.navigate('Home')}
          >
            <Text style={styles.actionBtnText}>Return</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Playing screen
  const actualStart = startDigit - 1;
  const progress = challengeLength > 0 ? ((currentPos - actualStart) / challengeLength) * 100 : 0;
  const thinkTime = getThinkingTime();
  const bestTimeStr = bestTime !== null ? formatTime(bestTime) : null;

  const numpadRows = numpadReversed
    ? [[1, 2, 3], [4, 5, 6], [7, 8, 9], [null, 0, null]]
    : [[7, 8, 9], [4, 5, 6], [1, 2, 3], [null, 0, null]];

  // History panel
  const renderChallengeHistory = () => {
    if (!showHistory || typedHistory.length === 0) return null;
    const historyStr = typedHistory.join('');
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.playHeader}>
        <View>
          <Text style={styles.playHeaderInfo}>
            Start at {startDigit} digit, memorize {challengeLength} digits
          </Text>
          {bestTimeStr && (
            <Text style={styles.playBestTime}>Best {bestTimeStr}</Text>
          )}
        </View>
        <View style={styles.playHeaderRight}>
          <Text style={styles.playTimer}>{formatTime(timer)}</Text>
          <TouchableOpacity onPress={() => endChallenge(false)}>
            <Text style={styles.closeBtn}>{'\u2715'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Status: lives, count, scroll icon */}
      <View style={styles.playStatus}>
        <Text style={styles.playLives}>
          {Array(lives).fill('\u2764\uFE0F').join('')}
          {Array(3 - lives).fill('\uD83D\uDDA4').join('')}
        </Text>
        {thinkTime > 0 && (
          <Text style={[styles.playTimerSmall, thinkingTimer <= 3 && { color: '#EF4444' }]}>
            {thinkingTimer}s
          </Text>
        )}
        <View style={styles.countRow}>
          <Text style={styles.countText}>Count {correctCount}</Text>
          <TouchableOpacity onPress={() => setShowHistory(prev => !prev)}>
            <Text style={[styles.scrollIcon, showHistory && { color: '#14B8A6' }]}>{'\u21C5'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderChallengeHistory()}

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

      {/* Digit indicator */}
      <Text style={styles.digitIndicator}>Digit {currentPos - actualStart + 1}</Text>

      {/* Number pad */}
      <View style={styles.numPad}>
        {numpadRows.map((row, ri) => (
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
    backgroundColor: '#000000',
  },
  // Setup screen
  setupScroll: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 40,
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
    marginBottom: 20,
  },
  controlBtn: {
    width: 50,
    height: 50,
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
  leaderSection: {
    alignItems: 'center',
    marginVertical: 8,
  },
  leaderText: {
    fontSize: 14,
    color: '#999999',
    fontFamily: 'monospace',
  },
  // Finished
  finishedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  finishedTitle: {
    fontSize: 28,
    color: '#CCCCCC',
    fontWeight: '400',
    marginBottom: 24,
    fontFamily: 'monospace',
  },
  finishedStat: {
    fontSize: 18,
    color: '#999999',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  // Playing
  playHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  playHeaderInfo: {
    color: '#999999',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  playBestTime: {
    color: '#999999',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  playHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeBtn: {
    color: '#CCCCCC',
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  playStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  playTimer: {
    fontSize: 16,
    color: '#CCCCCC',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  playTimerSmall: {
    fontSize: 14,
    color: '#CCCCCC',
    fontFamily: 'monospace',
  },
  playLives: {
    fontSize: 18,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countText: {
    color: '#999999',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  scrollIcon: {
    color: '#999999',
    fontSize: 22,
    fontWeight: '700',
  },
  digitIndicator: {
    color: '#CCCCCC',
    fontSize: 18,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 8,
  },
  // History
  historyPanel: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#333333',
    marginHorizontal: 16,
    marginBottom: 8,
    maxHeight: 100,
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
  // Progress
  progressBar: {
    height: 6,
    backgroundColor: '#333333',
    marginHorizontal: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#EC4899',
  },
  hintContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#111111',
    padding: 20,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  hintText: {
    fontSize: 24,
    color: '#666666',
    letterSpacing: 3,
    fontFamily: 'monospace',
  },
  hintCurrent: {
    fontSize: 40,
    color: '#EC4899',
    fontWeight: '700',
    marginLeft: 8,
  },
  // Number pad
  numPad: {
    flex: 1,
    justifyContent: 'center',
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
  numPadText: {
    fontSize: 24,
    color: '#CCCCCC',
    fontWeight: '500',
    fontFamily: 'monospace',
  },
});
