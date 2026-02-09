import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Theme } from '@constants/theme';
import { PI_DIGITS, TOTAL_DIGITS, formatDigits } from '@constants/piDigits';

const DIGITS_PER_PAGE = 100;

export const PiViewScreen: React.FC<{ navigation?: any }> = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const [groupSize, setGroupSize] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<1 | 2 | 3>(1);

  const totalPages = Math.ceil(TOTAL_DIGITS / DIGITS_PER_PAGE);
  const startDigit = currentPage * DIGITS_PER_PAGE;
  const endDigit = Math.min(startDigit + DIGITS_PER_PAGE, TOTAL_DIGITS);

  // Get digits for current page
  const pageDigits = useMemo(() => {
    return PI_DIGITS.slice(startDigit, endDigit);
  }, [startDigit, endDigit]);

  // Format digits based on group size
  const formattedGroups = useMemo(() => {
    const groups: { digit: string; index: number }[] = [];
    for (let i = 0; i < pageDigits.length; i += groupSize) {
      groups.push({
        digit: pageDigits.slice(i, i + groupSize),
        index: startDigit + i,
      });
    }
    return groups;
  }, [pageDigits, groupSize, startDigit]);

  const fontSizes: Record<number, number> = {
    1: zoomLevel === 1 ? 18 : zoomLevel === 2 ? 24 : 32,
    2: zoomLevel === 1 ? 16 : zoomLevel === 2 ? 22 : 28,
    4: zoomLevel === 1 ? 14 : zoomLevel === 2 ? 20 : 26,
    8: zoomLevel === 1 ? 13 : zoomLevel === 2 ? 18 : 24,
    10: zoomLevel === 1 ? 12 : zoomLevel === 2 ? 16 : 22,
  };

  return (
    <View style={styles.container}>
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
        <View style={styles.digitsGrid}>
          {formattedGroups.map((group, idx) => (
            <View key={idx} style={styles.digitWrapper}>
              <Text
                style={[
                  styles.digitText,
                  { fontSize: fontSizes[groupSize] || 18 },
                ]}
              >
                {group.digit}
              </Text>
              {/* Show position every 10 groups */}
              {idx % 10 === 0 && (
                <Text style={styles.digitIndex}>{group.index + 1}</Text>
              )}
            </View>
          ))}
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
    justifyContent: 'center',
    gap: 6,
  },
  digitWrapper: {
    alignItems: 'center',
    position: 'relative',
  },
  digitText: {
    color: Theme.colors.text,
    fontWeight: Theme.fontWeight.medium,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  digitIndex: {
    position: 'absolute',
    top: -10,
    fontSize: 8,
    color: Theme.colors.textMuted,
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
