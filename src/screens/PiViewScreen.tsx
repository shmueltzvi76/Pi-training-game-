import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { Theme } from '@constants/theme';
import {
  PI_DIGITS,
  TOTAL_DIGITS,
  searchInPi,
  searchReversed,
  findAscendingSequences,
  findDescendingSequences,
  findDoublePatterns,
  findDatePatterns,
  findDigitSumGroups,
  findEvenOddSequences,
  findPrimeSequences,
} from '@constants/piDigits';

// ספרות דינמיות לכל עמוד: 500 בלי חלוקה, 440 עם חלוקה
const getDigitsPerPage = (groupSize: number): number => {
  return groupSize <= 1 ? 500 : 440;
};

type SearchMode = 'normal' | 'reversed' | 'ascending' | 'descending' | 'repeating' | 'palindrome' | 'doubles' | 'dates' | 'evenOnly' | 'oddOnly' | 'primes' | 'digitSum';

interface SearchResult {
  positions: number[];
  lengths: number[]; // length of each match (for variable-length results like sequences)
  label: string;
}

// חישוב טווחי עמודים מראש - כל עמוד מתחיל מאיפה שהקודם נגמר
const getPageStart = (page: number, digitsPerPage: number): number => {
  return page * digitsPerPage;
};

const getPageForDigit = (digitIndex: number, digitsPerPage: number): number => {
  return Math.floor(digitIndex / digitsPerPage);
};

export const PiViewScreen: React.FC<{ navigation?: any }> = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const [groupSize, setGroupSize] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<1 | 2 | 3>(1);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult>({ positions: [], lengths: [], label: '' });
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [searchMode, setSearchMode] = useState<SearchMode>('normal');
  const [showAdvancedMenu, setShowAdvancedMenu] = useState(false);
  const [minSeqLength, setMinSeqLength] = useState(3);

  const digitsPerPage = getDigitsPerPage(groupSize);
  const totalPages = Math.ceil(TOTAL_DIGITS / digitsPerPage);
  const startDigit = getPageStart(currentPage, digitsPerPage);
  const endDigit = Math.min(startDigit + digitsPerPage, TOTAL_DIGITS);

  const pageDigits = useMemo(() => {
    return PI_DIGITS.slice(startDigit, endDigit);
  }, [startDigit, endDigit]);

  // Find repeating digit sequences (e.g., 111, 999, 0000)
  const findRepeatingDigits = useCallback((minLen: number): { pos: number; seq: string }[] => {
    const results: { pos: number; seq: string }[] = [];
    let i = 0;
    while (i < PI_DIGITS.length) {
      const digit = PI_DIGITS[i];
      let len = 1;
      while (i + len < PI_DIGITS.length && PI_DIGITS[i + len] === digit) {
        len++;
      }
      if (len >= minLen) {
        results.push({ pos: i, seq: PI_DIGITS.slice(i, i + len) });
      }
      i += len;
    }
    return results;
  }, []);

  // Find palindrome sequences
  const findPalindromes = useCallback((minLen: number): { pos: number; seq: string }[] => {
    const results: { pos: number; seq: string }[] = [];
    // Check windows of different sizes
    for (let len = minLen; len <= Math.min(minLen + 4, 10); len++) {
      for (let i = 0; i <= PI_DIGITS.length - len; i++) {
        const sub = PI_DIGITS.slice(i, i + len);
        const rev = sub.split('').reverse().join('');
        if (sub === rev) {
          // Avoid duplicates from overlapping
          const alreadyFound = results.some(r => i >= r.pos && i < r.pos + r.seq.length);
          if (!alreadyFound) {
            results.push({ pos: i, seq: sub });
          }
        }
      }
    }
    return results.sort((a, b) => a.pos - b.pos);
  }, []);

  // Execute search based on mode
  const executeSearch = useCallback((query: string, mode: SearchMode) => {
    let positions: number[] = [];
    let lengths: number[] = [];
    let label = '';

    const cleanQuery = query.replace(/[^0-9]/g, '');

    switch (mode) {
      case 'normal': {
        if (!cleanQuery) {
          setSearchResult({ positions: [], lengths: [], label: '' });
          setSearchActive(false);
          return;
        }
        positions = searchInPi(cleanQuery);
        lengths = positions.map(() => cleanQuery.length);
        label = `חיפוש רגיל: "${cleanQuery}"`;
        break;
      }
      case 'reversed': {
        if (!cleanQuery) {
          setSearchResult({ positions: [], lengths: [], label: '' });
          setSearchActive(false);
          return;
        }
        positions = searchReversed(cleanQuery);
        const reversedStr = cleanQuery.split('').reverse().join('');
        lengths = positions.map(() => cleanQuery.length);
        label = `חיפוש הפוך: "${cleanQuery}" -> "${reversedStr}"`;
        break;
      }
      case 'ascending': {
        const seqs = findAscendingSequences(0, TOTAL_DIGITS, minSeqLength);
        positions = seqs.map(s => s.pos);
        lengths = seqs.map(s => s.seq.length);
        label = `סדרות עולות (מינימום ${minSeqLength} ספרות)`;
        break;
      }
      case 'descending': {
        const seqs = findDescendingSequences(0, TOTAL_DIGITS, minSeqLength);
        positions = seqs.map(s => s.pos);
        lengths = seqs.map(s => s.seq.length);
        label = `סדרות יורדות (מינימום ${minSeqLength} ספרות)`;
        break;
      }
      case 'repeating': {
        const seqs = findRepeatingDigits(minSeqLength);
        positions = seqs.map(s => s.pos);
        lengths = seqs.map(s => s.seq.length);
        label = `ספרות חוזרות (מינימום ${minSeqLength} פעמים)`;
        break;
      }
      case 'palindrome': {
        const seqs = findPalindromes(minSeqLength);
        positions = seqs.map(s => s.pos);
        lengths = seqs.map(s => s.seq.length);
        label = `פלינדרומים (מינימום ${minSeqLength} ספרות)`;
        break;
      }
      case 'doubles': {
        const seqs = findDoublePatterns(minSeqLength);
        positions = seqs.map(s => s.pos);
        lengths = seqs.map(s => s.seq.length);
        label = `תבניות כפולות (מינימום ${minSeqLength} ספרות)`;
        break;
      }
      case 'dates': {
        const seqs = findDatePatterns();
        positions = seqs.map(s => s.pos);
        lengths = seqs.map(() => 4);
        label = 'תאריכים (DD/MM)';
        break;
      }
      case 'evenOnly': {
        const seqs = findEvenOddSequences('even', minSeqLength);
        positions = seqs.map(s => s.pos);
        lengths = seqs.map(s => s.seq.length);
        label = `רצפים זוגיים בלבד (מינימום ${minSeqLength})`;
        break;
      }
      case 'oddOnly': {
        const seqs = findEvenOddSequences('odd', minSeqLength);
        positions = seqs.map(s => s.pos);
        lengths = seqs.map(s => s.seq.length);
        label = `רצפים אי-זוגיים בלבד (מינימום ${minSeqLength})`;
        break;
      }
      case 'primes': {
        const seqs = findPrimeSequences(minSeqLength);
        positions = seqs.map(s => s.pos);
        lengths = seqs.map(s => s.seq.length);
        label = `מספרים ראשוניים (${minSeqLength} ספרות)`;
        break;
      }
      case 'digitSum': {
        const targetSum = parseInt(cleanQuery) || 10;
        const seqs = findDigitSumGroups(targetSum, minSeqLength);
        positions = seqs.map(s => s.pos);
        lengths = seqs.map(s => s.seq.length);
        label = `סכום ספרות = ${targetSum} (קבוצות של ${minSeqLength})`;
        break;
      }
    }

    setSearchResult({ positions, lengths, label });
    setSearchActive(true);
    setCurrentResultIndex(0);

    if (positions.length > 0) {
      setCurrentPage(getPageForDigit(positions[0], digitsPerPage));
    }
  }, [minSeqLength, findRepeatingDigits, findPalindromes]);

  const goToResult = useCallback((index: number) => {
    if (index < 0 || index >= searchResult.positions.length) return;
    setCurrentResultIndex(index);
    setCurrentPage(getPageForDigit(searchResult.positions[index], digitsPerPage));
  }, [searchResult]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResult({ positions: [], lengths: [], label: '' });
    setSearchActive(false);
    setCurrentResultIndex(0);
  }, []);

  // Check if a digit position falls within any search result
  const getHighlightInfo = useCallback((globalIndex: number): 'none' | 'highlight' | 'current' => {
    if (!searchActive || searchResult.positions.length === 0) return 'none';
    for (let i = 0; i < searchResult.positions.length; i++) {
      const pos = searchResult.positions[i];
      const len = searchResult.lengths[i] || 1;
      if (globalIndex >= pos && globalIndex < pos + len) {
        return i === currentResultIndex ? 'current' : 'highlight';
      }
    }
    return 'none';
  }, [searchActive, searchResult, currentResultIndex]);

  const resultsOnCurrentPage = useMemo(() => {
    if (!searchActive) return 0;
    return searchResult.positions.filter(r => r >= startDigit && r < endDigit).length;
  }, [searchActive, searchResult, startDigit, endDigit]);

  const fontSizes: Record<number, number> = {
    1: zoomLevel === 1 ? 18 : zoomLevel === 2 ? 24 : 32,
    2: zoomLevel === 1 ? 16 : zoomLevel === 2 ? 22 : 28,
    5: zoomLevel === 1 ? 14 : zoomLevel === 2 ? 20 : 26,
    10: zoomLevel === 1 ? 13 : zoomLevel === 2 ? 18 : 24,
    15: zoomLevel === 1 ? 12 : zoomLevel === 2 ? 16 : 22,
    20: zoomLevel === 1 ? 11 : zoomLevel === 2 ? 14 : 20,
  };

  const renderDigits = () => {
    const elements: React.ReactNode[] = [];
    const fontSize = fontSizes[groupSize] || 18;

    for (let i = 0; i < pageDigits.length; i++) {
      const globalIdx = startDigit + i;
      const highlight = getHighlightInfo(globalIdx);
      const isGroupEnd = groupSize > 1 && (i + 1) % groupSize === 0;

      elements.push(
        <Text
          key={globalIdx}
          style={[
            styles.singleDigit,
            { fontSize },
            highlight === 'highlight' && styles.highlightedDigit,
            highlight === 'current' && styles.currentHighlight,
          ]}
        >
          {pageDigits[i]}
        </Text>
      );

      if (isGroupEnd && i < pageDigits.length - 1) {
        elements.push(
          <Text key={`sep-${globalIdx}`} style={[styles.separator, { fontSize }]}>
            {' '}
          </Text>
        );
      }

      if (groupSize > 0 && (i + 1) % (groupSize * 10) === 0 && i < pageDigits.length - 1) {
        elements.push(<View key={`br-${globalIdx}`} style={styles.lineBreak} />);
        elements.push(
          <Text key={`ln-${globalIdx}`} style={styles.lineNumber}>{globalIdx + 2}:</Text>
        );
      }
    }
    return elements;
  };

  // Advanced search menu items
  const advancedOptions: { mode: SearchMode; label: string; icon: string; needsQuery: boolean; color: string }[] = [
    { mode: 'normal', label: 'חיפוש רגיל', icon: '🔍', needsQuery: true, color: Theme.colors.primary },
    { mode: 'reversed', label: 'חיפוש הפוך', icon: '🔄', needsQuery: true, color: Theme.colors.secondary },
    { mode: 'ascending', label: 'סדרות עולות', icon: '📈', needsQuery: false, color: Theme.colors.success },
    { mode: 'descending', label: 'סדרות יורדות', icon: '📉', needsQuery: false, color: Theme.colors.warning },
    { mode: 'repeating', label: 'ספרות חוזרות', icon: '🔁', needsQuery: false, color: Theme.colors.error },
    { mode: 'palindrome', label: 'פלינדרומים', icon: '🪞', needsQuery: false, color: Theme.colors.info },
    { mode: 'doubles', label: 'תבניות כפולות', icon: '👯', needsQuery: false, color: Theme.colors.accent },
    { mode: 'dates', label: 'תאריכים', icon: '📅', needsQuery: false, color: Theme.colors.primaryLight },
    { mode: 'evenOnly', label: 'רצפים זוגיים', icon: '2️⃣', needsQuery: false, color: Theme.colors.success },
    { mode: 'oddOnly', label: 'רצפים אי-זוגיים', icon: '1️⃣', needsQuery: false, color: Theme.colors.warning },
    { mode: 'primes', label: 'מספרים ראשוניים', icon: '✨', needsQuery: false, color: Theme.colors.secondary },
    { mode: 'digitSum', label: 'סכום ספרות', icon: '➕', needsQuery: true, color: Theme.colors.accent },
  ];

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <TouchableOpacity
          style={styles.advancedBtn}
          onPress={() => setShowAdvancedMenu(true)}
        >
          <Text style={styles.advancedBtnText}>+</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={(text) => setSearchQuery(text.replace(/[^0-9]/g, ''))}
          onSubmitEditing={() => executeSearch(searchQuery, searchMode)}
          placeholder="חפש רצף ספרות..."
          placeholderTextColor={Theme.colors.textMuted}
          keyboardType="numeric"
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearSearch}>
            <Text style={styles.clearBtnText}>X</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => executeSearch(searchQuery, searchMode)}
        >
          <Text style={styles.searchBtnText}>חפש</Text>
        </TouchableOpacity>
      </View>

      {/* Active search mode indicator */}
      {searchMode !== 'normal' && (
        <View style={styles.modeIndicator}>
          <Text style={styles.modeIndicatorText}>
            מצב: {advancedOptions.find(o => o.mode === searchMode)?.label}
          </Text>
          <TouchableOpacity onPress={() => { setSearchMode('normal'); clearSearch(); }}>
            <Text style={styles.modeResetText}>איפוס</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search results info */}
      {searchActive && (
        <View style={styles.searchInfo}>
          <Text style={styles.searchInfoLabel}>{searchResult.label}</Text>
          <Text style={styles.searchInfoText}>
            {searchResult.positions.length > 0
              ? `נמצאו ${searchResult.positions.length} תוצאות | בעמוד: ${resultsOnCurrentPage}`
              : 'לא נמצאו תוצאות'}
          </Text>
          {searchResult.positions.length > 1 && (
            <View style={styles.searchNav}>
              <TouchableOpacity
                onPress={() => goToResult(currentResultIndex - 1)}
                disabled={currentResultIndex === 0}
                style={[styles.searchNavBtn, currentResultIndex === 0 && styles.searchNavBtnDisabled]}
              >
                <Text style={styles.searchNavText}>{'<'} הקודם</Text>
              </TouchableOpacity>
              <Text style={styles.searchNavCount}>
                {currentResultIndex + 1}/{searchResult.positions.length}
              </Text>
              <TouchableOpacity
                onPress={() => goToResult(currentResultIndex + 1)}
                disabled={currentResultIndex >= searchResult.positions.length - 1}
                style={[styles.searchNavBtn, currentResultIndex >= searchResult.positions.length - 1 && styles.searchNavBtnDisabled]}
              >
                <Text style={styles.searchNavText}>הבא {'>'}</Text>
              </TouchableOpacity>
            </View>
          )}
          {searchResult.positions.length > 0 && (
            <Text style={styles.searchPosition}>
              ספרה {searchResult.positions[currentResultIndex] + 1}
              {' | '}
              רצף: {PI_DIGITS.slice(
                searchResult.positions[currentResultIndex],
                searchResult.positions[currentResultIndex] + (searchResult.lengths[currentResultIndex] || 1)
              )}
            </Text>
          )}
        </View>
      )}

      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.pageInfo}>
          ספרות {startDigit + 1}-{endDigit} מתוך {TOTAL_DIGITS}
        </Text>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={() => setZoomLevel(z => z === 3 ? 1 : (z + 1) as 1 | 2 | 3)}
        >
          <Text style={styles.zoomText}>x{zoomLevel}</Text>
        </TouchableOpacity>
      </View>

      {/* Group size selector */}
      <View style={styles.groupSelector}>
        {[1, 2, 5, 10, 15, 20].map(size => (
          <TouchableOpacity
            key={size}
            style={[styles.groupBtn, groupSize === size && styles.groupBtnActive]}
            onPress={() => {
              // שמור את הספרה הנוכחית ומצא את העמוד החדש
              const currentDigit = startDigit;
              setGroupSize(size);
              const newDpp = getDigitsPerPage(size);
              setCurrentPage(getPageForDigit(currentDigit, newDpp));
            }}
          >
            <Text style={[styles.groupBtnText, groupSize === size && styles.groupBtnTextActive]}>
              {size}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Digits display */}
      <ScrollView style={styles.digitsScroll} contentContainerStyle={styles.digitsContainer}>
        {currentPage === 0 && (
          <Text style={[styles.piPrefix, { fontSize: fontSizes[groupSize] || 18 }]}>3.</Text>
        )}
        <Text style={styles.lineNumber}>{startDigit + 1}</Text>
        <View style={styles.digitsGrid}>{renderDigits()}</View>
      </ScrollView>

      {/* Navigation bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navBtn, currentPage === 0 && styles.navBtnDisabled]}
          onPress={() => setCurrentPage(0)}
          disabled={currentPage === 0}
        >
          <Text style={styles.navBtnText}>{'<<'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navBtn, currentPage === 0 && styles.navBtnDisabled]}
          onPress={() => setCurrentPage(p => Math.max(0, p - 1))}
          disabled={currentPage === 0}
        >
          <Text style={styles.navBtnText}>{'<'}</Text>
        </TouchableOpacity>
        <View style={styles.pageIndicator}>
          <Text style={styles.pageText}>{currentPage + 1} / {totalPages}</Text>
        </View>
        <TouchableOpacity
          style={[styles.navBtn, currentPage >= totalPages - 1 && styles.navBtnDisabled]}
          onPress={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
          disabled={currentPage >= totalPages - 1}
        >
          <Text style={styles.navBtnText}>{'>'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navBtn, currentPage >= totalPages - 1 && styles.navBtnDisabled]}
          onPress={() => setCurrentPage(totalPages - 1)}
          disabled={currentPage >= totalPages - 1}
        >
          <Text style={styles.navBtnText}>{'>>'}</Text>
        </TouchableOpacity>
      </View>

      {/* Advanced Search Modal */}
      <Modal
        visible={showAdvancedMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAdvancedMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAdvancedMenu(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>חיפוש מתקדם</Text>
            <Text style={styles.modalSubtitle}>בחר סוג חיפוש מתוך 12 אלגוריתמים</Text>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {advancedOptions.map((option) => (
              <TouchableOpacity
                key={option.mode}
                style={[
                  styles.modalOption,
                  searchMode === option.mode && styles.modalOptionActive,
                ]}
                onPress={() => {
                  setSearchMode(option.mode);
                  if (!option.needsQuery) {
                    setShowAdvancedMenu(false);
                    executeSearch('', option.mode);
                  } else {
                    setShowAdvancedMenu(false);
                  }
                }}
              >
                <View style={[styles.modalOptionIconWrap, { backgroundColor: option.color + '22' }]}>
                  <Text style={styles.modalOptionIcon}>{option.icon}</Text>
                </View>
                <View style={styles.modalOptionTextWrapper}>
                  <Text style={[
                    styles.modalOptionText,
                    searchMode === option.mode && { color: option.color },
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={styles.modalOptionDesc}>
                    {option.mode === 'normal' && 'חפש רצף ספרות כמו שהוא'}
                    {option.mode === 'reversed' && 'חפש את הרצף בסדר הפוך (מהסוף להתחלה)'}
                    {option.mode === 'ascending' && 'מצא סדרות כמו 1234, 5678'}
                    {option.mode === 'descending' && 'מצא סדרות כמו 9876, 4321'}
                    {option.mode === 'repeating' && 'מצא ספרות שחוזרות כמו 999, 0000'}
                    {option.mode === 'palindrome' && 'מצא רצפים שניתן לקרוא משני הכיוונים'}
                    {option.mode === 'doubles' && 'תבנית שחוזרת פעמיים: 1414, 2323'}
                    {option.mode === 'dates' && 'רצפים שנראים כמו תאריכים DD/MM'}
                    {option.mode === 'evenOnly' && 'רצפים שכולם ספרות זוגיות: 2, 4, 6, 8, 0'}
                    {option.mode === 'oddOnly' && 'רצפים שכולם אי-זוגיות: 1, 3, 5, 7, 9'}
                    {option.mode === 'primes' && 'מצא מספרים ראשוניים בתוך הספרות'}
                    {option.mode === 'digitSum' && 'הכנס סכום רצוי בשורת החיפוש'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Minimum length selector */}
            </ScrollView>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>אורך מינימלי לסדרות:</Text>
              <View style={styles.modalLenRow}>
                {[2, 3, 4, 5, 6].map(len => (
                  <TouchableOpacity
                    key={len}
                    style={[styles.modalLenBtn, minSeqLength === len && styles.modalLenBtnActive]}
                    onPress={() => setMinSeqLength(len)}
                  >
                    <Text style={[
                      styles.modalLenText,
                      minSeqLength === len && styles.modalLenTextActive,
                    ]}>
                      {len}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowAdvancedMenu(false)}
            >
              <Text style={styles.modalCloseBtnText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.sm,
    backgroundColor: Theme.colors.surface,
    gap: 6,
  },
  advancedBtn: {
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advancedBtnText: {
    color: Theme.colors.white,
    fontSize: Theme.fontSize.xl,
    fontWeight: Theme.fontWeight.bold,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Theme.colors.backgroundInput,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Theme.colors.text,
    fontSize: Theme.fontSize.base,
    textAlign: 'right',
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.bold,
  },
  searchBtn: {
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBtnText: {
    color: Theme.colors.white,
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.bold,
  },
  // Mode indicator
  modeIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Theme.colors.primaryDark,
    paddingVertical: 4,
    paddingHorizontal: Theme.spacing.md,
  },
  modeIndicatorText: {
    color: Theme.colors.primaryLight,
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.medium,
  },
  modeResetText: {
    color: Theme.colors.warning,
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.bold,
  },
  // Search info
  searchInfo: {
    backgroundColor: Theme.colors.backgroundCard,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  searchInfoLabel: {
    color: Theme.colors.primaryLight,
    fontSize: Theme.fontSize.xs,
    textAlign: 'center',
    marginBottom: 2,
  },
  searchInfoText: {
    color: Theme.colors.accent,
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.medium,
    textAlign: 'center',
    marginBottom: 4,
  },
  searchNav: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  searchNavBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.surface,
  },
  searchNavBtnDisabled: { opacity: 0.3 },
  searchNavText: {
    color: Theme.colors.primary,
    fontSize: Theme.fontSize.sm,
  },
  searchNavCount: {
    color: Theme.colors.text,
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.bold,
  },
  searchPosition: {
    color: Theme.colors.textMuted,
    fontSize: Theme.fontSize.xs,
    textAlign: 'center',
    marginTop: 4,
  },
  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  pageInfo: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.fontSize.sm,
  },
  zoomButton: {
    backgroundColor: Theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.sm,
  },
  zoomText: {
    color: Theme.colors.primary,
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.bold,
  },
  // Group selector
  groupSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
  },
  groupBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.surface,
  },
  groupBtnActive: { backgroundColor: Theme.colors.primary },
  groupBtnText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.fontSize.sm,
  },
  groupBtnTextActive: {
    color: Theme.colors.white,
    fontWeight: Theme.fontWeight.bold,
  },
  // Digits
  digitsScroll: { flex: 1 },
  digitsContainer: { padding: Theme.spacing.md },
  piPrefix: {
    color: Theme.colors.accent,
    fontWeight: Theme.fontWeight.bold,
    marginBottom: 8,
    textAlign: 'center',
  },
  digitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  singleDigit: {
    color: Theme.colors.text,
    fontWeight: Theme.fontWeight.medium,
    fontFamily: 'monospace',
  },
  highlightedDigit: {
    color: Theme.colors.white,
    backgroundColor: Theme.colors.secondary,
    borderRadius: 3,
    overflow: 'hidden',
    fontWeight: Theme.fontWeight.bold,
  },
  currentHighlight: {
    color: Theme.colors.black,
    backgroundColor: Theme.colors.warning,
    borderRadius: 3,
    overflow: 'hidden',
    fontWeight: Theme.fontWeight.bold,
  },
  separator: { color: 'transparent' },
  lineBreak: { width: '100%', height: 8 },
  lineNumber: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  // Navigation
  navBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  navBtn: {
    width: 44,
    height: 36,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: {
    color: Theme.colors.text,
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.bold,
  },
  pageIndicator: { paddingHorizontal: 16 },
  pageText: {
    color: Theme.colors.primary,
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.semibold,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: Theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.lg,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.colors.surfaceLight,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: Theme.fontSize.xxl,
    color: Theme.colors.text,
    fontWeight: Theme.fontWeight.bold,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: Theme.fontSize.sm,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.md,
  },
  modalScroll: {
    maxHeight: 380,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: Theme.colors.surface,
    gap: 12,
  },
  modalOptionActive: {
    backgroundColor: Theme.colors.primaryDark,
    borderWidth: 1.5,
    borderColor: Theme.colors.primary,
  },
  modalOptionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionIcon: {
    fontSize: 20,
  },
  modalOptionTextWrapper: {
    flex: 1,
  },
  modalOptionText: {
    color: Theme.colors.text,
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.semibold,
    textAlign: 'right',
  },
  modalOptionDesc: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 2,
  },
  modalSection: {
    marginTop: Theme.spacing.md,
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.md,
  },
  modalSectionTitle: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.fontSize.sm,
    textAlign: 'right',
    marginBottom: 8,
  },
  modalLenRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  modalLenBtn: {
    width: 44,
    height: 36,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.backgroundInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLenBtnActive: {
    backgroundColor: Theme.colors.accent,
  },
  modalLenText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.medium,
  },
  modalLenTextActive: {
    color: Theme.colors.white,
    fontWeight: Theme.fontWeight.bold,
  },
  modalCloseBtn: {
    marginTop: Theme.spacing.lg,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: Theme.colors.white,
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.bold,
  },
});
