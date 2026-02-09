import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Theme } from '@constants/theme';
import { PI_DIGITS, TOTAL_DIGITS, searchInPi } from '@constants/piDigits';

const DIGITS_PER_PAGE = 100;

export const PiViewScreen: React.FC<{ navigation?: any }> = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const [groupSize, setGroupSize] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<1 | 2 | 3>(1);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);

  const totalPages = Math.ceil(TOTAL_DIGITS / DIGITS_PER_PAGE);
  const startDigit = currentPage * DIGITS_PER_PAGE;
  const endDigit = Math.min(startDigit + DIGITS_PER_PAGE, TOTAL_DIGITS);

  // Get digits for current page
  const pageDigits = useMemo(() => {
    return PI_DIGITS.slice(startDigit, endDigit);
  }, [startDigit, endDigit]);

  // Search execution
  const executeSearch = useCallback((query: string) => {
    if (!query || query.length === 0) {
      setSearchResults([]);
      setSearchActive(false);
      return;
    }
    // Only search for digits
    const cleanQuery = query.replace(/[^0-9]/g, '');
    if (!cleanQuery) {
      setSearchResults([]);
      setSearchActive(false);
      return;
    }
    setSearchQuery(cleanQuery);
    const results = searchInPi(cleanQuery);
    setSearchResults(results);
    setSearchActive(true);
    setCurrentResultIndex(0);

    // Jump to first result
    if (results.length > 0) {
      const page = Math.floor(results[0] / DIGITS_PER_PAGE);
      setCurrentPage(page);
    }
  }, []);

  // Navigate between search results
  const goToResult = useCallback((index: number) => {
    if (index < 0 || index >= searchResults.length) return;
    setCurrentResultIndex(index);
    const page = Math.floor(searchResults[index] / DIGITS_PER_PAGE);
    setCurrentPage(page);
  }, [searchResults]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchActive(false);
    setCurrentResultIndex(0);
  }, []);

  // Check if a digit position falls within any search result on current page
  const getHighlightInfo = useCallback((globalIndex: number): 'none' | 'highlight' => {
    if (!searchActive || searchResults.length === 0 || !searchQuery) return 'none';
    for (const resultPos of searchResults) {
      if (globalIndex >= resultPos && globalIndex < resultPos + searchQuery.length) {
        return 'highlight';
      }
    }
    return 'none';
  }, [searchActive, searchResults, searchQuery]);

  // Results on current page
  const resultsOnCurrentPage = useMemo(() => {
    if (!searchActive) return 0;
    return searchResults.filter(r => r >= startDigit && r < endDigit).length;
  }, [searchActive, searchResults, startDigit, endDigit]);

  const fontSizes: Record<number, number> = {
    1: zoomLevel === 1 ? 18 : zoomLevel === 2 ? 24 : 32,
    2: zoomLevel === 1 ? 16 : zoomLevel === 2 ? 22 : 28,
    4: zoomLevel === 1 ? 14 : zoomLevel === 2 ? 20 : 26,
    8: zoomLevel === 1 ? 13 : zoomLevel === 2 ? 18 : 24,
    10: zoomLevel === 1 ? 12 : zoomLevel === 2 ? 16 : 22,
  };

  // Render individual digits (for highlighting support)
  const renderDigits = () => {
    const elements: React.ReactNode[] = [];
    const fontSize = fontSizes[groupSize] || 18;

    for (let i = 0; i < pageDigits.length; i++) {
      const globalIdx = startDigit + i;
      const isHighlighted = getHighlightInfo(globalIdx) === 'highlight';
      const isGroupEnd = groupSize > 1 && (i + 1) % groupSize === 0;

      elements.push(
        <Text
          key={globalIdx}
          style={[
            styles.singleDigit,
            { fontSize },
            isHighlighted && styles.highlightedDigit,
          ]}
        >
          {pageDigits[i]}
        </Text>
      );

      // Add space between groups
      if (isGroupEnd && i < pageDigits.length - 1) {
        elements.push(
          <Text key={`sep-${globalIdx}`} style={[styles.separator, { fontSize }]}>
            {' '}
          </Text>
        );
      }

      // Add line break every 10 groups for readability
      if (groupSize > 0 && (i + 1) % (groupSize * 10) === 0 && i < pageDigits.length - 1) {
        elements.push(
          <View key={`br-${globalIdx}`} style={styles.lineBreak} />
        );
        // Line number
        elements.push(
          <Text key={`ln-${globalIdx}`} style={styles.lineNumber}>
            {globalIdx + 2}
          </Text>
        );
      }
    }

    return elements;
  };

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text.replace(/[^0-9]/g, ''));
          }}
          onSubmitEditing={() => executeSearch(searchQuery)}
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
          onPress={() => executeSearch(searchQuery)}
        >
          <Text style={styles.searchBtnText}>חפש</Text>
        </TouchableOpacity>
      </View>

      {/* Search results info */}
      {searchActive && (
        <View style={styles.searchInfo}>
          <Text style={styles.searchInfoText}>
            {searchResults.length > 0
              ? `נמצאו ${searchResults.length} תוצאות | בעמוד הזה: ${resultsOnCurrentPage}`
              : 'לא נמצאו תוצאות'}
          </Text>
          {searchResults.length > 1 && (
            <View style={styles.searchNav}>
              <TouchableOpacity
                onPress={() => goToResult(currentResultIndex - 1)}
                disabled={currentResultIndex === 0}
                style={[styles.searchNavBtn, currentResultIndex === 0 && styles.searchNavBtnDisabled]}
              >
                <Text style={styles.searchNavText}>{'<'} הקודם</Text>
              </TouchableOpacity>
              <Text style={styles.searchNavCount}>
                {currentResultIndex + 1}/{searchResults.length}
              </Text>
              <TouchableOpacity
                onPress={() => goToResult(currentResultIndex + 1)}
                disabled={currentResultIndex >= searchResults.length - 1}
                style={[styles.searchNavBtn, currentResultIndex >= searchResults.length - 1 && styles.searchNavBtnDisabled]}
              >
                <Text style={styles.searchNavText}>הבא {'>'}</Text>
              </TouchableOpacity>
            </View>
          )}
          {searchResults.length > 0 && (
            <Text style={styles.searchPosition}>
              מיקום נוכחי: ספרה {searchResults[currentResultIndex] + 1}
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
        {[1, 2, 4, 8, 10].map(size => (
          <TouchableOpacity
            key={size}
            style={[styles.groupBtn, groupSize === size && styles.groupBtnActive]}
            onPress={() => setGroupSize(size)}
          >
            <Text style={[styles.groupBtnText, groupSize === size && styles.groupBtnTextActive]}>
              {size}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Digits display */}
      <ScrollView
        style={styles.digitsScroll}
        contentContainerStyle={styles.digitsContainer}
      >
        {/* Pi prefix on first page */}
        {currentPage === 0 && (
          <Text style={[styles.piPrefix, { fontSize: fontSizes[groupSize] || 18 }]}>
            3.
          </Text>
        )}
        {/* Line number for start */}
        <Text style={styles.lineNumber}>{startDigit + 1}</Text>
        <View style={styles.digitsGrid}>
          {renderDigits()}
        </View>
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
          <Text style={styles.pageText}>
            {currentPage + 1} / {totalPages}
          </Text>
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

      {/* Quick jump */}
      <View style={styles.quickJump}>
        {[0, 10, 25, 50, 75, 99].map(page => (
          <TouchableOpacity
            key={page}
            style={[styles.jumpBtn, currentPage === page && styles.jumpBtnActive]}
            onPress={() => setCurrentPage(Math.min(page, totalPages - 1))}
          >
            <Text style={[styles.jumpBtnText, currentPage === page && styles.jumpBtnTextActive]}>
              {page * DIGITS_PER_PAGE + 1}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
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
  // Search info
  searchInfo: {
    backgroundColor: Theme.colors.backgroundCard,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
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
  searchNavBtnDisabled: {
    opacity: 0.3,
  },
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
  groupBtnActive: {
    backgroundColor: Theme.colors.primary,
  },
  groupBtnText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.fontSize.sm,
  },
  groupBtnTextActive: {
    color: Theme.colors.white,
    fontWeight: Theme.fontWeight.bold,
  },
  // Digits
  digitsScroll: {
    flex: 1,
  },
  digitsContainer: {
    padding: Theme.spacing.md,
  },
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
  separator: {
    color: 'transparent',
  },
  lineBreak: {
    width: '100%',
    height: 8,
  },
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
  navBtnDisabled: {
    opacity: 0.3,
  },
  navBtnText: {
    color: Theme.colors.text,
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.bold,
  },
  pageIndicator: {
    paddingHorizontal: 16,
  },
  pageText: {
    color: Theme.colors.primary,
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.semibold,
  },
  // Quick jump
  quickJump: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    paddingBottom: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.sm,
  },
  jumpBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.surface,
  },
  jumpBtnActive: {
    backgroundColor: Theme.colors.primary,
  },
  jumpBtnText: {
    color: Theme.colors.textMuted,
    fontSize: Theme.fontSize.xs,
  },
  jumpBtnTextActive: {
    color: Theme.colors.white,
    fontWeight: Theme.fontWeight.bold,
  },
});
