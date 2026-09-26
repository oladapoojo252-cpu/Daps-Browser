import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight, Home, ArrowDownToLine } from 'lucide-react-native';

export const BottomDock = ({
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onHome,
  onTabs,
  onLongPressTabs,
  onOpenSniffer,
  sniffedMediaCount = 0,
  isPrivate,
  isDarkMode = false,
  tabCount = 1,
}: any) => {
  const dark = isDarkMode || isPrivate;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={[styles.dock, dark && styles.dockPrivate]}>
        {/* Back */}
        <TouchableOpacity onPress={onBack} disabled={!canGoBack} style={styles.iconButton}>
          <ChevronLeft
            color={dark ? (canGoBack ? '#FFFFFF' : '#444444') : canGoBack ? '#000000' : '#CCCCCC'}
            size={24}
          />
        </TouchableOpacity>

        {/* Forward */}
        <TouchableOpacity onPress={onForward} disabled={!canGoForward} style={styles.iconButton}>
          <ChevronRight
            color={dark ? (canGoForward ? '#FFFFFF' : '#444444') : canGoForward ? '#000000' : '#CCCCCC'}
            size={24}
          />
        </TouchableOpacity>

        {/* Home */}
        <TouchableOpacity onPress={onHome} style={[styles.mainBtn, dark && styles.mainBtnPrivate]}>
          <Home color={dark ? '#000000' : '#FFFFFF'} size={18} fill={dark ? '#000000' : '#FFFFFF'} />
        </TouchableOpacity>

        {/* Tabs with Count Indicator & Long Press for Quick Incognito (Chrome / Brave style) */}
        <TouchableOpacity
          onPress={onTabs}
          onLongPress={onLongPressTabs}
          delayLongPress={280}
          activeOpacity={0.7}
          style={styles.iconButton}
        >
          <View style={[styles.tabBadge, { borderColor: dark ? '#FFFFFF' : '#000000' }]}>
            <Text style={[styles.tabBadgeText, { color: dark ? '#FFFFFF' : '#000000' }]}>
              {tabCount || 1}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Smart Download / Media Sniffer Button */}
        <TouchableOpacity
          onPress={onOpenSniffer}
          style={styles.iconButton}
          activeOpacity={0.7}
        >
          <View style={styles.snifferBtnWrapper}>
            <ArrowDownToLine
              size={21}
              color={dark ? '#FFFFFF' : '#000000'}
            />
            {sniffedMediaCount > 0 && (
              <View
                style={[
                  styles.snifferBadge,
                  {
                    backgroundColor: dark ? '#FFFFFF' : '#000000',
                    borderColor: dark ? '#1A1A1A' : '#FFFFFF',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.snifferBadgeText,
                    { color: dark ? '#000000' : '#FFFFFF' },
                  ]}
                >
                  {sniffedMediaCount > 9 ? '9+' : sniffedMediaCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  dock: {
    flexDirection: 'row',
    width: '88%',
    height: 58,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    paddingHorizontal: 12,
  },
  dockPrivate: {
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconButton: { padding: 8 },
  mainBtn: {
    backgroundColor: '#000000',
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainBtnPrivate: {
    backgroundColor: '#FFFFFF',
  },
  tabBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  snifferBtnWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  snifferBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  snifferBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
});