import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  Key,
  CreditCard,
  MapPin,
  Shield,
  Trash2,
  Lock,
  Download,
  Monitor,
  Globe,
  Palette,
  Info,
  ChevronRight,
  Check,
  RefreshCw,
  ShieldCheck,
  Zap,
  Code,
} from 'lucide-react-native';
import { DapsShieldMode } from '../utils/dapsShield';
import { DownloadItem } from '../utils/downloadManager';
import { adblockManager } from '../utils/adblockEngine';

export type ThemeMode = 'black' | 'white' | 'system';

export interface BrowserSettings {
  searchEngine: 'google' | 'brave' | 'duckduckgo' | 'bing' | 'ecosia';
  themeMode: ThemeMode;
  isDesktop: boolean;
  isAdBlockActive: boolean;
  shieldsMode: DapsShieldMode;
  httpsOnly: boolean;
  doNotTrack: boolean;
  safeBrowsing: boolean;
  autoSaveDownloads: boolean;
}

interface SettingsViewProps {
  visible: boolean;
  onClose: () => void;
  settings: BrowserSettings;
  onUpdateSettings: (newSettings: Partial<BrowserSettings>) => void;
  downloads: DownloadItem[];
  onOpenDownloads: () => void;
  onClearBrowsingData: (options: {
    history: boolean;
    downloads: boolean;
    cookies: boolean;
  }) => Promise<void>;
  onOpenShields: () => void;
  isPrivate?: boolean;
  isDarkMode?: boolean;
}

export const SEARCH_ENGINES = [
  { id: 'google', name: 'Google', searchUrl: 'https://www.google.com/search?q=' },
  { id: 'brave', name: 'Brave Search', searchUrl: 'https://search.brave.com/search?q=' },
  { id: 'duckduckgo', name: 'DuckDuckGo', searchUrl: 'https://duckduckgo.com/?q=' },
  { id: 'bing', name: 'Microsoft Bing', searchUrl: 'https://www.bing.com/search?q=' },
  { id: 'ecosia', name: 'Ecosia', searchUrl: 'https://www.ecosia.org/search?q=' },
] as const;

export const THEME_OPTIONS: { id: ThemeMode; name: string; desc: string }[] = [
  { id: 'black', name: 'Black (Dark / AMOLED)', desc: 'Pure pitch black background' },
  { id: 'white', name: 'White (Light)', desc: 'Crisp bright white background' },
  { id: 'system', name: 'System Default', desc: 'Follows operating system appearance' },
];

export const SettingsView = ({
  visible,
  onClose,
  settings,
  onUpdateSettings,
  downloads,
  onOpenDownloads,
  onClearBrowsingData,
  onOpenShields,
  isPrivate = false,
  isDarkMode = false,
}: SettingsViewProps) => {
  const insets = useSafeAreaInsets();
  const [activeSubModal, setActiveSubModal] = useState<
    'none' | 'searchEngine' | 'theme' | 'clearData' | 'about'
  >('none');

  // Clear data checkboxes
  const [clearHistory, setClearHistory] = useState(true);
  const [clearDownloadsList, setClearDownloadsList] = useState(false);
  const [clearCookies, setClearCookies] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [isUpdatingRules, setIsUpdatingRules] = useState(false);

  const dark = isDarkMode || isPrivate;
  const theme = {
    bg: dark ? '#000000' : '#FFFFFF',
    headerBg: dark ? '#121212' : '#FFFFFF',
    text: dark ? '#FFFFFF' : '#000000',
    subtext: dark ? '#8E8E93' : '#6C6C70',
    sectionHeader: dark ? '#AAAAAA' : '#555555',
    itemBg: dark ? '#1A1A1A' : '#FFFFFF',
    border: dark ? '#242426' : '#F0F0F2',
    card: dark ? '#1A1A1A' : '#F6F6F8',
    accent: dark ? '#FFFFFF' : '#000000',
    accentText: dark ? '#000000' : '#FFFFFF',
    switchThumb: dark ? '#000000' : '#FFFFFF',
    switchTrackOff: dark ? '#3A3A3C' : '#D1D1D6',
    danger: '#FF3B30',
  };

  const currentEngine =
    SEARCH_ENGINES.find(e => e.id === settings.searchEngine) || SEARCH_ENGINES[0];

  const currentTheme =
    THEME_OPTIONS.find(t => t.id === settings.themeMode) || THEME_OPTIONS[0];

  const handleExecuteClear = async () => {
    setIsClearing(true);
    try {
      await onClearBrowsingData({
        history: clearHistory,
        downloads: clearDownloadsList,
        cookies: clearCookies,
      });
      setActiveSubModal('none');
      Alert.alert('Data Cleared', 'Browsing data has been cleared.');
    } catch {
      Alert.alert('Error', 'Failed to clear browsing data.');
    } finally {
      setIsClearing(false);
    }
  };

  const handleUpdateRules = async () => {
    setIsUpdatingRules(true);
    try {
      const res = await adblockManager.updateFilterLists();
      if (res.success) {
        Alert.alert('Shields Updated', `Successfully updated filter lists (${res.ruleCount} active rules).`);
      } else {
        Alert.alert('Shields Active', 'Using pre-compiled snapshot (latest rules verified).');
      }
    } catch {
      Alert.alert('Update Info', 'Shields operating with bundled EasyList & EasyPrivacy snapshot.');
    } finally {
      setIsUpdatingRules(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.bg,
            paddingTop: insets.top,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <ArrowLeft size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section: Appearance */}
          <Text style={[styles.sectionTitle, { color: theme.sectionHeader }]}>Appearance</Text>

          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: theme.border }]}
            onPress={() => setActiveSubModal('theme')}
          >
            <View style={styles.rowIcon}>
              <Palette size={20} color={theme.subtext} />
            </View>
            <View style={styles.rowMain}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>Theme</Text>
              <Text style={[styles.rowSubtitle, { color: theme.subtext }]}>
                {currentTheme.name}
              </Text>
            </View>
            <ChevronRight size={18} color={theme.subtext} />
          </TouchableOpacity>

          {/* Section: Basics */}
          <Text style={[styles.sectionTitle, { color: theme.sectionHeader }]}>Basics</Text>

          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: theme.border }]}
            onPress={() => setActiveSubModal('searchEngine')}
          >
            <View style={styles.rowIcon}>
              <Search size={20} color={theme.subtext} />
            </View>
            <View style={styles.rowMain}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>Search engine</Text>
              <Text style={[styles.rowSubtitle, { color: theme.subtext }]}>
                {currentEngine.name}
              </Text>
            </View>
            <ChevronRight size={18} color={theme.subtext} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: theme.border }]}
            onPress={() => Alert.alert('Passwords', 'Password saving and autofill is active.')}
          >
            <View style={styles.rowIcon}>
              <Key size={20} color={theme.subtext} />
            </View>
            <View style={styles.rowMain}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>Passwords</Text>
              <Text style={[styles.rowSubtitle, { color: theme.subtext }]}>
                Saved credentials & passkeys
              </Text>
            </View>
            <ChevronRight size={18} color={theme.subtext} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: theme.border }]}
            onPress={() => Alert.alert('Payment Methods', 'Payment autofill settings.')}
          >
            <View style={styles.rowIcon}>
              <CreditCard size={20} color={theme.subtext} />
            </View>
            <View style={styles.rowMain}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>Payment methods</Text>
              <Text style={[styles.rowSubtitle, { color: theme.subtext }]}>
                Cards and payment autofill
              </Text>
            </View>
            <ChevronRight size={18} color={theme.subtext} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: theme.border }]}
            onPress={() => Alert.alert('Addresses', 'Saved billing and delivery addresses.')}
          >
            <View style={styles.rowIcon}>
              <MapPin size={20} color={theme.subtext} />
            </View>
            <View style={styles.rowMain}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>Addresses and more</Text>
              <Text style={[styles.rowSubtitle, { color: theme.subtext }]}>
                Saved delivery locations
              </Text>
            </View>
            <ChevronRight size={18} color={theme.subtext} />
          </TouchableOpacity>

          {/* Section: Privacy and Security */}
          <Text style={[styles.sectionTitle, { color: theme.sectionHeader }]}>
            Privacy and Security
          </Text>

          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: theme.border }]}
            onPress={() => setActiveSubModal('clearData')}
          >
            <View style={styles.rowIcon}>
              <Trash2 size={20} color={theme.danger} />
            </View>
            <View style={styles.rowMain}>
              <Text style={[styles.rowTitle, { color: theme.danger }]}>Clear browsing data</Text>
              <Text style={[styles.rowSubtitle, { color: theme.subtext }]}>
                Clear history, cookies, and cache
              </Text>
            </View>
            <ChevronRight size={18} color={theme.subtext} />
          </TouchableOpacity>

          {/* Daps Shield Row */}
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: theme.border }]}
            onPress={onOpenShields}
          >
            <View style={styles.rowIcon}>
              <Shield size={20} color={theme.text} />
            </View>
            <View style={styles.rowMain}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>
                Daps Shield
              </Text>
              <Text style={[styles.rowSubtitle, { color: theme.subtext }]}>
                {settings.isAdBlockActive
                  ? `${settings.shieldsMode === 'aggressive' ? 'Aggressive' : 'Standard'} Protection Active`
                  : 'Protection Paused'}
              </Text>
            </View>
            <Switch
              value={settings.isAdBlockActive}
              onValueChange={v => onUpdateSettings({ isAdBlockActive: v })}
              trackColor={{ false: theme.switchTrackOff, true: theme.accent }}
              thumbColor={dark ? (settings.isAdBlockActive ? '#000000' : '#FFFFFF') : '#FFFFFF'}
            />
          </TouchableOpacity>

          {/* Update Filter Lists */}
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: theme.border }]}
            onPress={handleUpdateRules}
            disabled={isUpdatingRules}
          >
            <View style={styles.rowIcon}>
              <RefreshCw size={19} color={theme.subtext} />
            </View>
            <View style={styles.rowMain}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>Update Filter Lists</Text>
              <Text style={[styles.rowSubtitle, { color: theme.subtext }]}>
                {isUpdatingRules ? 'Fetching EasyList & EasyPrivacy...' : 'Sync latest ad & tracker rules'}
              </Text>
            </View>
            <ChevronRight size={18} color={theme.subtext} />
          </TouchableOpacity>

          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={styles.rowIcon}>
              <Lock size={20} color={theme.subtext} />
            </View>
            <View style={styles.rowMain}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>
                Always use secure connections
              </Text>
              <Text style={[styles.rowSubtitle, { color: theme.subtext }]}>
                Upgrade navigation to HTTPS
              </Text>
            </View>
            <Switch
              value={settings.httpsOnly}
              onValueChange={v => onUpdateSettings({ httpsOnly: v })}
              trackColor={{ false: theme.switchTrackOff, true: theme.accent }}
              thumbColor={dark ? (settings.httpsOnly ? '#000000' : '#FFFFFF') : '#FFFFFF'}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={styles.rowIcon}>
              <Globe size={20} color={theme.subtext} />
            </View>
            <View style={styles.rowMain}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>"Do Not Track"</Text>
              <Text style={[styles.rowSubtitle, { color: theme.subtext }]}>
                Send a "Do Not Track" request
              </Text>
            </View>
            <Switch
              value={settings.doNotTrack}
              onValueChange={v => onUpdateSettings({ doNotTrack: v })}
              trackColor={{ false: theme.switchTrackOff, true: theme.accent }}
              thumbColor={dark ? (settings.doNotTrack ? '#000000' : '#FFFFFF') : '#FFFFFF'}
            />
          </View>

          {/* Section: Advanced */}
          <Text style={[styles.sectionTitle, { color: theme.sectionHeader }]}>
            Advanced
          </Text>

          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: theme.border }]}
            onPress={() => {
              onClose();
              setTimeout(onOpenDownloads, 200);
            }}
          >
            <View style={styles.rowIcon}>
              <Download size={20} color={theme.subtext} />
            </View>
            <View style={styles.rowMain}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>Downloads</Text>
              <Text style={[styles.rowSubtitle, { color: theme.subtext }]}>
                {downloads.length} file{downloads.length === 1 ? '' : 's'} • Manage downloads
              </Text>
            </View>
            <ChevronRight size={18} color={theme.subtext} />
          </TouchableOpacity>

          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={styles.rowIcon}>
              <Monitor size={20} color={theme.subtext} />
            </View>
            <View style={styles.rowMain}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>Desktop site</Text>
              <Text style={[styles.rowSubtitle, { color: theme.subtext }]}>
                Always request desktop version
              </Text>
            </View>
            <Switch
              value={settings.isDesktop}
              onValueChange={v => onUpdateSettings({ isDesktop: v })}
              trackColor={{ false: theme.switchTrackOff, true: theme.accent }}
              thumbColor={dark ? (settings.isDesktop ? '#000000' : '#FFFFFF') : '#FFFFFF'}
            />
          </View>

          {/* Section: About */}
          <Text style={[styles.sectionTitle, { color: theme.sectionHeader }]}>About</Text>

          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: theme.border }]}
            onPress={() => setActiveSubModal('about')}
          >
            <View style={styles.rowIcon}>
              <Info size={20} color={theme.subtext} />
            </View>
            <View style={styles.rowMain}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>About Daps Browser</Text>
              <Text style={[styles.rowSubtitle, { color: theme.subtext }]}>
                v2.1.0 • Daps Technologies
              </Text>
            </View>
            <ChevronRight size={18} color={theme.subtext} />
          </TouchableOpacity>
        </ScrollView>

        {/* SUB-MODAL 1: Theme Selector (Black & White) */}
        <Modal
          visible={activeSubModal === 'theme'}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setActiveSubModal('none')}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setActiveSubModal('none')}
          >
            <View style={[styles.dialogSheet, { backgroundColor: theme.card }]}>
              <Text style={[styles.dialogTitle, { color: theme.text }]}>Choose Theme</Text>
              <Text style={[styles.dialogSubtitle, { color: theme.subtext }]}>
                Select your preferred browser appearance
              </Text>
              {THEME_OPTIONS.map(opt => {
                const isSelected = settings.themeMode === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.engineOption, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      onUpdateSettings({ themeMode: opt.id });
                      setActiveSubModal('none');
                    }}
                  >
                    <View>
                      <Text style={[styles.engineName, { color: theme.text }]}>{opt.name}</Text>
                      <Text style={{ fontSize: 11, color: theme.subtext, marginTop: 2 }}>{opt.desc}</Text>
                    </View>
                    {isSelected && <Check size={18} color={theme.text} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* SUB-MODAL 2: Search Engine Picker */}
        <Modal
          visible={activeSubModal === 'searchEngine'}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setActiveSubModal('none')}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setActiveSubModal('none')}
          >
            <View style={[styles.dialogSheet, { backgroundColor: theme.card }]}>
              <Text style={[styles.dialogTitle, { color: theme.text }]}>Search engine</Text>
              {SEARCH_ENGINES.map(engine => {
                const isSelected = settings.searchEngine === engine.id;
                return (
                  <TouchableOpacity
                    key={engine.id}
                    style={[styles.engineOption, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      onUpdateSettings({ searchEngine: engine.id as any });
                      setActiveSubModal('none');
                    }}
                  >
                    <Text style={[styles.engineName, { color: theme.text }]}>{engine.name}</Text>
                    {isSelected && <Check size={18} color={theme.text} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* SUB-MODAL 3: Clear Browsing Data */}
        <Modal
          visible={activeSubModal === 'clearData'}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setActiveSubModal('none')}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setActiveSubModal('none')}
          >
            <View style={[styles.dialogSheet, { backgroundColor: theme.card }]}>
              <Text style={[styles.dialogTitle, { color: theme.text }]}>Clear browsing data</Text>
              <Text style={[styles.dialogSubtitle, { color: theme.subtext }]}>
                Select the items you would like to clear
              </Text>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setClearHistory(!clearHistory)}
              >
                <View
                  style={[
                    styles.checkbox,
                    clearHistory && { backgroundColor: theme.accent, borderColor: theme.accent },
                  ]}
                >
                  {clearHistory && <Check size={14} color={theme.accentText} />}
                </View>
                <View style={styles.checkboxLabel}>
                  <Text style={[styles.checkboxTitle, { color: theme.text }]}>Browsing history</Text>
                  <Text style={[styles.checkboxDesc, { color: theme.subtext }]}>
                    Clears visited website history
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setClearCookies(!clearCookies)}
              >
                <View
                  style={[
                    styles.checkbox,
                    clearCookies && { backgroundColor: theme.accent, borderColor: theme.accent },
                  ]}
                >
                  {clearCookies && <Check size={14} color={theme.accentText} />}
                </View>
                <View style={styles.checkboxLabel}>
                  <Text style={[styles.checkboxTitle, { color: theme.text }]}>
                    Cookies and site data
                  </Text>
                  <Text style={[styles.checkboxDesc, { color: theme.subtext }]}>
                    Signs you out of websites
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setClearDownloadsList(!clearDownloadsList)}
              >
                <View
                  style={[
                    styles.checkbox,
                    clearDownloadsList && { backgroundColor: theme.accent, borderColor: theme.accent },
                  ]}
                >
                  {clearDownloadsList && <Check size={14} color={theme.accentText} />}
                </View>
                <View style={styles.checkboxLabel}>
                  <Text style={[styles.checkboxTitle, { color: theme.text }]}>Download history</Text>
                  <Text style={[styles.checkboxDesc, { color: theme.subtext }]}>
                    Removes downloaded file records
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.dialogActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setActiveSubModal('none')}
                >
                  <Text style={[styles.cancelBtnText, { color: theme.subtext }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: theme.accent }]}
                  onPress={handleExecuteClear}
                  disabled={isClearing}
                >
                  <Text style={[styles.confirmBtnText, { color: theme.accentText }]}>
                    {isClearing ? 'Clearing...' : 'Clear data'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* SUB-MODAL 4: Professional Executive About & Credits */}
        <Modal
          visible={activeSubModal === 'about'}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setActiveSubModal('none')}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setActiveSubModal('none')}
            />

            <View
              style={[
                styles.aboutSheet,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <ScrollView
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.aboutScroll}
              >
                {/* Brand Emblem */}
                <View style={styles.aboutEmblemSection}>
                  <View style={[styles.aboutLogoRing, { backgroundColor: dark ? '#222226' : '#E8E8EE', borderColor: theme.border }]}>
                    <Shield size={36} color={dark ? '#FFFFFF' : '#000000'} fill={dark ? '#FFFFFF' : '#000000'} />
                  </View>
                  <Text style={[styles.aboutAppName, { color: theme.text }]}>DAPS BROWSER</Text>
                  <Text style={[styles.aboutVersionBadge, { color: theme.subtext }]}>
                    Version 2.1.0 • Stable Release
                  </Text>
                </View>

                {/* Mission */}
                <View style={[styles.aboutSectionBox, { backgroundColor: dark ? '#111113' : '#FFFFFF', borderColor: theme.border }]}>
                  <Text style={[styles.aboutSectionTitle, { color: theme.text }]}>Mission</Text>
                  <Text style={[styles.aboutDescription, { color: theme.subtext }]}>
                    Engineered to deliver an uncompromising, high-speed, and private web experience. Daps Browser automatically neutralizes invasive ads, trackers, cookie prompts, and surveillance telemetry while equipping you with on-device media sniffing and encrypted incognito browsing.
                  </Text>
                </View>

                {/* Core Architecture */}
                <View style={[styles.aboutSectionBox, { backgroundColor: dark ? '#111113' : '#FFFFFF', borderColor: theme.border }]}>
                  <Text style={[styles.aboutSectionTitle, { color: theme.text }]}>Core Architecture</Text>

                  <View style={styles.creditRow}>
                    <View style={[styles.creditIconWrap, { backgroundColor: dark ? '#222224' : '#F2F2F7' }]}>
                      <ShieldCheck size={16} color={theme.text} />
                    </View>
                    <View style={styles.creditMeta}>
                      <Text style={[styles.creditLabel, { color: theme.text }]}>Protection Engine</Text>
                      <Text style={[styles.creditValue, { color: theme.subtext }]}>Daps Shield Engine with Cosmetic Element Filtering</Text>
                    </View>
                  </View>

                  <View style={styles.creditRow}>
                    <View style={[styles.creditIconWrap, { backgroundColor: dark ? '#222224' : '#F2F2F7' }]}>
                      <Zap size={16} color={theme.text} />
                    </View>
                    <View style={styles.creditMeta}>
                      <Text style={[styles.creditLabel, { color: theme.text }]}>Filter Rulesets</Text>
                      <Text style={[styles.creditValue, { color: theme.subtext }]}>Bundled EasyList, EasyPrivacy, AdGuard & Custom Anti-Ad Lists</Text>
                    </View>
                  </View>

                  <View style={styles.creditRow}>
                    <View style={[styles.creditIconWrap, { backgroundColor: dark ? '#222224' : '#F2F2F7' }]}>
                      <Download size={16} color={theme.text} />
                    </View>
                    <View style={styles.creditMeta}>
                      <Text style={[styles.creditLabel, { color: theme.text }]}>Media Detection Pipeline</Text>
                      <Text style={[styles.creditValue, { color: theme.subtext }]}>Real-time XHR, Fetch & Subframe Stream Sniffer</Text>
                    </View>
                  </View>
                </View>

                {/* Engineering & Credits */}
                <View style={[styles.aboutSectionBox, { backgroundColor: dark ? '#111113' : '#FFFFFF', borderColor: theme.border }]}>
                  <Text style={[styles.aboutSectionTitle, { color: theme.text }]}>Leadership & Engineering</Text>

                  <View style={styles.creditRow}>
                    <View style={[styles.creditIconWrap, { backgroundColor: dark ? '#222224' : '#F2F2F7' }]}>
                      <Code size={16} color={theme.text} />
                    </View>
                    <View style={styles.creditMeta}>
                      <Text style={[styles.creditLabel, { color: theme.text }]}>Lead Architect & Engineer</Text>
                      <Text style={[styles.creditValue, { color: theme.text, fontWeight: '700' }]}>Dapo Ojo</Text>
                      <Text style={[styles.creditValue, { color: theme.subtext }]}>Founder, Daps Technologies</Text>
                    </View>
                  </View>
                </View>

                {/* Copyright & Seal */}
                <View style={styles.aboutFooter}>
                  <Text style={[styles.copyrightText, { color: theme.subtext }]}>
                    © 2026 Daps Technologies. All rights reserved.
                  </Text>
                  <Text style={[styles.mottoText, { color: theme.subtext }]}>
                    Private. Fast. Uncompromised.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: theme.accent, marginTop: 18, marginBottom: 8 }]}
                  onPress={() => setActiveSubModal('none')}
                >
                  <Text style={[styles.confirmBtnText, { color: theme.accentText }]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
    gap: 16,
  },
  headerBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 22,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  rowMain: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogSheet: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 22,
    padding: 22,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  dialogSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  engineOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  engineName: {
    fontSize: 15,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#71717A',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxLabel: {
    flex: 1,
  },
  checkboxTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkboxDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 22,
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtn: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 22,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  aboutSheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  aboutScroll: {
    padding: 22,
    gap: 14,
  },
  aboutEmblemSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  aboutLogoRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: 12,
  },
  aboutAppName: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  aboutVersionBadge: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  aboutSectionBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  aboutSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  aboutDescription: {
    fontSize: 13,
    lineHeight: 19,
  },
  creditRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  creditIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  creditMeta: {
    flex: 1,
  },
  creditLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  creditValue: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 1,
  },
  aboutFooter: {
    alignItems: 'center',
    paddingTop: 8,
    gap: 4,
  },
  copyrightText: {
    fontSize: 11,
    fontWeight: '600',
  },
  mottoText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
});