import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shield, ShieldCheck, X, Zap, Clock, Database } from 'lucide-react-native';
import { DapsShieldMode, calculateShieldSavings } from '../utils/dapsShield';

interface ShieldsModalProps {
  visible: boolean;
  onClose: () => void;
  shieldsEnabled: boolean;
  onToggleShields: () => void;
  shieldsMode: DapsShieldMode;
  onSetShieldsMode: (mode: DapsShieldMode) => void;
  pageBlockedCount: number;
  totalBlockedCount: number;
  isPrivate?: boolean;
  isDarkMode?: boolean;
}

export const ShieldsModal = ({
  visible,
  onClose,
  shieldsEnabled,
  onToggleShields,
  shieldsMode,
  onSetShieldsMode,
  pageBlockedCount,
  totalBlockedCount,
  isPrivate = false,
  isDarkMode = false,
}: ShieldsModalProps) => {
  const insets = useSafeAreaInsets();
  const savings = calculateShieldSavings(totalBlockedCount);

  const dark = isDarkMode || isPrivate;
  const theme = {
    bg: dark ? '#141414' : '#FFFFFF',
    card: dark ? '#1F1F1F' : '#F6F6F8',
    text: dark ? '#FFFFFF' : '#000000',
    subtext: dark ? '#8E8E93' : '#6C6C70',
    border: dark ? '#2C2C2E' : '#E5E5EA',
    accent: dark ? '#FFFFFF' : '#000000',
    switchThumb: dark ? '#000000' : '#FFFFFF',
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.bg,
              paddingBottom: Math.max(insets.bottom, 24),
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.shieldIconWrap, { backgroundColor: theme.card }]}>
                <Shield size={22} color={theme.text} />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.text }]}>Daps Shield</Text>
                <Text style={[styles.subtitle, { color: theme.subtext }]}>
                  Ad & Tracker Protection
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.subtext} />
            </TouchableOpacity>
          </View>

          {/* Master Switch */}
          <View style={[styles.mainSwitchCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.mainSwitchText}>
              <Text style={[styles.switchTitle, { color: theme.text }]}>
                {shieldsEnabled ? 'Shield is Active' : 'Shield is Paused'}
              </Text>
              <Text style={[styles.switchDesc, { color: theme.subtext }]}>
                {shieldsEnabled
                  ? 'Blocking invasive ads and background network trackers'
                  : 'Protection paused for this session'}
              </Text>
            </View>
            <Switch
              value={shieldsEnabled}
              onValueChange={onToggleShields}
              trackColor={{ false: '#767577', true: theme.accent }}
              thumbColor={theme.switchThumb}
            />
          </View>

          {/* Stats Bar */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: theme.card }]}>
              <ShieldCheck size={18} color={theme.text} />
              <Text style={[styles.statValue, { color: theme.text }]}>
                {pageBlockedCount}
              </Text>
              <Text style={[styles.statLabel, { color: theme.subtext }]}>This page</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: theme.card }]}>
              <Database size={18} color={theme.text} />
              <Text style={[styles.statValue, { color: theme.text }]}>
                {savings.formattedData}
              </Text>
              <Text style={[styles.statLabel, { color: theme.subtext }]}>Data saved</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: theme.card }]}>
              <Clock size={18} color={theme.text} />
              <Text style={[styles.statValue, { color: theme.text }]}>
                {savings.formattedTime}
              </Text>
              <Text style={[styles.statLabel, { color: theme.subtext }]}>Time saved</Text>
            </View>
          </View>

          {/* Mode Selector */}
          <Text style={[styles.sectionHeading, { color: theme.subtext }]}>Protection Level</Text>
          <View style={[styles.optionsGroup, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={[
                styles.optionRow,
                shieldsMode === 'standard' && {
                  backgroundColor: isPrivate ? '#2C2C2E' : '#EAEAEF',
                },
                { borderBottomColor: theme.border },
              ]}
              onPress={() => onSetShieldsMode('standard')}
            >
              <View style={styles.optionLeft}>
                <Text style={[styles.optionTitle, { color: theme.text }]}>Standard (Recommended)</Text>
                <Text style={[styles.optionDesc, { color: theme.subtext }]}>
                  Blocks ads, trackers, and cryptominers while keeping all page features intact.
                </Text>
              </View>
              {shieldsMode === 'standard' && <Zap size={16} color={theme.text} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionRow,
                shieldsMode === 'aggressive' && {
                  backgroundColor: isPrivate ? '#2C2C2E' : '#EAEAEF',
                },
              ]}
              onPress={() => onSetShieldsMode('aggressive')}
            >
              <View style={styles.optionLeft}>
                <Text style={[styles.optionTitle, { color: theme.text }]}>Aggressive</Text>
                <Text style={[styles.optionDesc, { color: theme.subtext }]}>
                  Maximum privacy: strips all 3rd party telemetry and tracking scripts.
                </Text>
              </View>
              {shieldsMode === 'aggressive' && <Zap size={16} color={theme.text} />}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shieldIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
  },
  mainSwitchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  mainSwitchText: {
    flex: 1,
    marginRight: 12,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  switchDesc: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsGroup: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionLeft: {
    flex: 1,
    marginRight: 10,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
});
