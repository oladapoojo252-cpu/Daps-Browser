import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  StatusBar,
  Modal,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  BackHandler,
  useColorScheme,
  Animated,
  Easing,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { BrowserView } from './components/BrowserView';
import { AddressBar } from './components/AddressBar';
import { BottomDock } from './components/BottomDock';
import { DapsHome } from './components/DapsHome';
import { HistoryView } from './components/HistoryView';
import { SettingsView, BrowserSettings, SEARCH_ENGINES } from './components/SettingsView';
import { DownloadsView } from './components/DownloadsView';
import { ShieldsModal } from './components/ShieldsModal';
import {
  DownloadItem,
  getSavedDownloads,
  addDownloadListener,
  openOrShareFile,
} from './utils/downloadManager';
import { adblockManager } from './utils/adblockEngine';
import { DapsShieldMode } from './utils/dapsShield';
import {
  X,
  Plus,
  ArrowDown,
  CheckCircle,
  AlertCircle,
  Globe,
  Lock,
  Compass,
  Layers,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 38) / 2;
const CARD_CONTENT_WIDTH = CARD_WIDTH - 20;
const VIEWPORT_WIDTH = 360;
const VIEWPORT_HEIGHT = 320;
const SCALE_RATIO = CARD_CONTENT_WIDTH / VIEWPORT_WIDTH;
const TRANSLATE_X = -(VIEWPORT_WIDTH * (1 - SCALE_RATIO)) / 2;
const TRANSLATE_Y = -(VIEWPORT_HEIGHT * (1 - SCALE_RATIO)) / 2;

interface Tab {
  id: string;
  url: string;
  title: string;
}

const STORAGE_KEYS = {
  HISTORY: '@daps_history',
  BOOKMARKS: '@daps_bookmarks',
  DOWNLOADS: '@daps_downloads',
  SETTINGS: '@daps_settings',
  SHIELD_STATS: '@daps_shield_stats',
};

const DEFAULT_SETTINGS: BrowserSettings = {
  searchEngine: 'google',
  themeMode: 'black',
  isDesktop: false,
  isAdBlockActive: true,
  shieldsMode: 'standard',
  httpsOnly: false,
  doNotTrack: true,
  safeBrowsing: true,
  autoSaveDownloads: true,
};

function MainBrowserApp() {
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();

  const [tabs, setTabs] = useState<Tab[]>([{ id: '1', url: 'home', title: 'Home' }]);
  const [activeTabId, setActiveTabId] = useState('1');
  const [isTabSwitcherVisible, setIsTabSwitcherVisible] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<BrowserSettings>(DEFAULT_SETTINGS);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

  // Downloads State
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [isDownloadsVisible, setIsDownloadsVisible] = useState(false);
  const [activeDownload, setActiveDownload] = useState<DownloadItem | null>(null);

  // Daps Shield State
  const [pageBlockedCount, setPageBlockedCount] = useState(0);
  const [totalBlockedCount, setTotalBlockedCount] = useState(0);
  const [isShieldsModalVisible, setIsShieldsModalVisible] = useState(false);

  // Web Navigation State
  const [progress, setProgress] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [navState, setNavState] = useState({ canGoBack: false, canGoForward: false });
  const [history, setHistory] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);

  // Tab Transition Animation & Toast
  const tabFadeAnim = useRef(new Animated.Value(1)).current;
  const [tabToast, setTabToast] = useState<{ title: string; tabId: string } | null>(null);
  const toastAnim = useRef(new Animated.Value(120)).current;

  // Auto-hiding Bottom Dock Animation (Brave / Chrome style scroll-away)
  const dockTranslateAnim = useRef(new Animated.Value(0)).current;
  const isDockHidden = useRef(false);

  const handleScrollDirection = (direction: 'up' | 'down') => {
    if (currentTab.url === 'home') return;
    if (direction === 'down' && !isDockHidden.current) {
      isDockHidden.current = true;
      Animated.timing(dockTranslateAnim, {
        toValue: 120,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else if (direction === 'up' && isDockHidden.current) {
      isDockHidden.current = false;
      Animated.timing(dockTranslateAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }
  };

  const showDock = () => {
    if (isDockHidden.current) {
      isDockHidden.current = false;
      Animated.timing(dockTranslateAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }
  };

  const browserRef = useRef<any>(null);
  const currentTab = tabs.find(t => t.id === activeTabId) || tabs[0] || { id: '1', url: 'home', title: 'Home' };

  // Calculate Dark Mode according to user's Theme setting
  const isDark =
    isPrivate ||
    settings.themeMode === 'black' ||
    (settings.themeMode === 'system' && systemColorScheme === 'dark');

  // Load persisted state
  useEffect(() => {
    const loadState = async () => {
      try {
        const [
          savedHistory,
          savedBookmarks,
          savedDownloads,
          savedSettings,
          savedShieldStats,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.HISTORY),
          AsyncStorage.getItem(STORAGE_KEYS.BOOKMARKS),
          getSavedDownloads(),
          AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
          AsyncStorage.getItem(STORAGE_KEYS.SHIELD_STATS),
        ]);

        if (savedHistory) setHistory(JSON.parse(savedHistory));
        if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));
        if (savedDownloads && Array.isArray(savedDownloads)) setDownloads(savedDownloads);
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setSettings(prev => ({ ...prev, ...parsed }));
          if (typeof parsed.isAdBlockActive === 'boolean') {
            if (parsed.isAdBlockActive) adblockManager.enableShields();
            else adblockManager.disableShields();
          }
        }
        if (savedShieldStats) {
          const parsed = JSON.parse(savedShieldStats);
          if (typeof parsed.totalBlockedCount === 'number') {
            setTotalBlockedCount(parsed.totalBlockedCount);
          }
        }
      } catch (e) {
        console.error('Error loading initial data', e);
      }
    };
    loadState();
  }, []);

  // Listen for download updates
  useEffect(() => {
    const unsubscribe = addDownloadListener(item => {
      if (item.status === 'downloading') {
        setActiveDownload(item);
      } else if (item.status === 'completed' || item.status === 'failed') {
        setActiveDownload(item);
        getSavedDownloads().then(setDownloads);
        setTimeout(() => {
          setActiveDownload(prev => (prev?.id === item.id ? null : prev));
        }, 4000);
      }
    });
    return unsubscribe;
  }, []);

  // Persist Bookmarks
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks)).catch(() => {});
  }, [bookmarks]);

  // Persist History
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history)).catch(() => {});
  }, [history]);

  // Persist Settings
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings)).catch(() => {});
  }, [settings]);

  // Persist Shield Stats
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.SHIELD_STATS, JSON.stringify({ totalBlockedCount })).catch(() => {});
  }, [totalBlockedCount]);

  // Android Hardware Back Handler
  useEffect(() => {
    const onBackPress = () => {
      if (isShieldsModalVisible) {
        setIsShieldsModalVisible(false);
        return true;
      }
      if (isDownloadsVisible) {
        setIsDownloadsVisible(false);
        return true;
      }
      if (isTabSwitcherVisible) {
        setIsTabSwitcherVisible(false);
        return true;
      }
      if (isSettingsVisible) {
        setIsSettingsVisible(false);
        return true;
      }
      if (isHistoryVisible) {
        setIsHistoryVisible(false);
        return true;
      }
      if (currentTab.url !== 'home' && navState.canGoBack) {
        browserRef.current?.goBack();
        return true;
      }
      if (currentTab.url !== 'home') {
        handleHome();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [
    navState.canGoBack,
    currentTab.url,
    isTabSwitcherVisible,
    isSettingsVisible,
    isHistoryVisible,
    isDownloadsVisible,
    isShieldsModalVisible,
  ]);

  const handleSearch = (val: string) => {
    const trimmed = val.trim();
    showDock();
    if (trimmed.toLowerCase() === 'home' || trimmed === '') {
      handleHome();
      return;
    }

    let targetUrl: string;
    if (trimmed.includes('.') && !trimmed.includes(' ')) {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        targetUrl = trimmed;
      } else {
        targetUrl = settings.httpsOnly ? `https://${trimmed}` : `https://${trimmed}`;
      }
    } else {
      const engine = SEARCH_ENGINES.find(e => e.id === settings.searchEngine) || SEARCH_ENGINES[0];
      targetUrl = `${engine.searchUrl}${encodeURIComponent(trimmed)}`;
    }

    setPageBlockedCount(0);
    setIsLoading(true);
    setProgress(0.1);
    setTabs(prev => prev.map(t => (t.id === activeTabId ? { ...t, url: targetUrl, title: targetUrl } : t)));
  };

  const handleNavChange = (nav: any) => {
    setNavState({ canGoBack: nav.canGoBack, canGoForward: nav.canGoForward });
    setIsLoading(Boolean(nav.loading));
    if (!nav.loading) {
      showDock();
    }

    if (nav.url && nav.url !== 'about:blank' && nav.url !== 'home') {
      setTabs(prev =>
        prev.map(t => (t.id === activeTabId ? { ...t, url: nav.url, title: nav.title || nav.url } : t))
      );
      if (!isPrivate && !nav.loading) {
        setHistory(prev => {
          if (prev.length > 0 && prev[0].url === nav.url) return prev;
          return [
            {
              title: nav.title || nav.url.split('/')[2] || nav.url,
              url: nav.url,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
            ...prev,
          ].slice(0, 100);
        });
      }
    }
  };

  const showTabToast = (title: string, tabId: string) => {
    setTabToast({ title, tabId });
    toastAnim.setValue(120);
    Animated.spring(toastAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 75,
      friction: 10,
    }).start();

    setTimeout(() => {
      dismissTabToast();
    }, 6000);
  };

  const dismissTabToast = () => {
    Animated.timing(toastAnim, {
      toValue: 120,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setTabToast(null));
  };

  const handleSelectTab = (tabId: string) => {
    showDock();
    if (tabId === activeTabId) {
      setIsTabSwitcherVisible(false);
      return;
    }
    tabFadeAnim.setValue(0.2);
    setActiveTabId(tabId);
    setIsTabSwitcherVisible(false);
    Animated.timing(tabFadeAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const handleHome = () => {
    showDock();
    tabFadeAnim.setValue(0.3);
    setProgress(1);
    setIsLoading(false);
    setPageBlockedCount(0);
    setNavState({ canGoBack: false, canGoForward: false });
    setTabs(prev => prev.map(t => (t.id === activeTabId ? { ...t, url: 'home', title: 'Home' } : t)));
    Animated.timing(tabFadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleCreateNewTab = () => {
    const newId = Date.now().toString();
    const newTab: Tab = { id: newId, url: 'home', title: 'Home' };
    setTabs(prev => [...prev, newTab]);
    handleSelectTab(newId);
    setPageBlockedCount(0);
    setIsLoading(false);
  };

  const handleOpenNewTab = (newUrl: string) => {
    if (!newUrl || newUrl === 'about:blank') return;
    const newId = Date.now().toString();
    let displayDomain = 'New Tab';
    try {
      displayDomain = new URL(newUrl).hostname.replace(/^www\./, '');
    } catch {}
    const newTab: Tab = { id: newId, url: newUrl, title: displayDomain };
    setTabs(prev => [...prev, newTab]);
    showTabToast(displayDomain, newId);
  };

  const handleCloseTab = (tabId: string) => {
    if (tabs.length === 1) {
      setTabs([{ id: '1', url: 'home', title: 'Home' }]);
      setActiveTabId('1');
      setPageBlockedCount(0);
      setIsLoading(false);
      return;
    }
    const filtered = tabs.filter(t => t.id !== tabId);
    setTabs(filtered);
    if (activeTabId === tabId) {
      setActiveTabId(filtered[filtered.length - 1].id);
    }
  };

  const handleDeleteHistoryItem = (indexToDelete: number) => {
    setHistory(prev => prev.filter((_, idx) => idx !== indexToDelete));
  };

  const handleShieldBlocked = useCallback((_url: string, _filter: string) => {
    setPageBlockedCount(prev => prev + 1);
    setTotalBlockedCount(prev => prev + 1);
  }, []);

  const handleClearBrowsingData = async (options: {
    history: boolean;
    downloads: boolean;
    cookies: boolean;
  }) => {
    const keysToRemove: string[] = [];
    if (options.history) {
      keysToRemove.push(STORAGE_KEYS.HISTORY);
      setHistory([]);
    }
    if (options.downloads) {
      keysToRemove.push(STORAGE_KEYS.DOWNLOADS);
      setDownloads([]);
    }
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
    }
  };

  const theme = {
    bg: isDark ? '#000000' : '#FFFFFF',
    progressTrack: isDark ? '#1A1A1A' : '#F0F0F2',
    progressBar: isDark ? '#FFFFFF' : '#000000',
    card: isDark ? '#161616' : '#FFFFFF',
    cardBorder: isDark ? '#262626' : '#E5E5EA',
    text: isDark ? '#FFFFFF' : '#000000',
    subtext: isDark ? '#8E8E93' : '#6C6C70',
  };

  const dockBottomMargin = Math.max(insets.bottom, 10) + 8;

  return (
    <View style={[styles.mainWrapper, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.bg}
        translucent={true}
      />

      {/* Top Safe Area */}
      <View style={{ height: insets.top, backgroundColor: theme.bg }} />

      <View style={styles.layoutContainer}>
        {/* Address Bar with active "X" when loading -> Reload when complete */}
        <AddressBar
          url={currentTab.url === 'home' ? '' : currentTab.url}
          onSearch={handleSearch}
          isPrivate={isPrivate}
          isDarkMode={isDark}
          pageBlockedCount={pageBlockedCount}
          shieldsActive={settings.isAdBlockActive}
          isLoading={isLoading}
          onStopLoading={() => {
            browserRef.current?.stopLoading();
            setIsLoading(false);
          }}
          onOpenShields={() => setIsShieldsModalVisible(true)}
          onToggleBookmark={() => {
            const exists = bookmarks.find(b => b.url === currentTab.url);
            if (exists) {
              setBookmarks(prev => prev.filter(b => b.url !== currentTab.url));
            } else {
              setBookmarks(prev => [
                { title: currentTab.title || currentTab.url.split('/')[2] || 'Site', url: currentTab.url },
                ...prev,
              ]);
            }
          }}
          isBookmarked={bookmarks.some(b => b.url === currentTab.url)}
          onReload={() => {
            setIsLoading(true);
            browserRef.current?.reload();
          }}
        />

        {/* Loading Progress Bar */}
        {currentTab.url !== 'home' && progress < 1 && (
          <View style={[styles.progressTrack, { backgroundColor: theme.progressTrack }]}>
            <View
              style={[
                styles.progressBar,
                { width: `${progress * 100}%`, backgroundColor: theme.progressBar },
              ]}
            />
          </View>
        )}

        {/* Active Download Toast */}
        {activeDownload && (
          <TouchableOpacity
            style={styles.downloadToast}
            activeOpacity={0.9}
            onPress={() => {
              if (activeDownload.status === 'completed') {
                openOrShareFile(activeDownload);
              } else {
                setIsDownloadsVisible(true);
              }
            }}
          >
            <View style={styles.downloadToastIcon}>
              {activeDownload.status === 'downloading' && (
                <ArrowDown size={18} color="#FFFFFF" />
              )}
              {activeDownload.status === 'completed' && (
                <CheckCircle size={18} color="#FFFFFF" />
              )}
              {activeDownload.status === 'failed' && (
                <AlertCircle size={18} color="#FF3B30" />
              )}
            </View>
            <View style={styles.downloadToastText}>
              <Text style={styles.downloadToastTitle} numberOfLines={1}>
                {activeDownload.status === 'downloading'
                  ? `Downloading: ${activeDownload.filename}`
                  : activeDownload.status === 'completed'
                  ? `Downloaded: ${activeDownload.filename}`
                  : `Failed: ${activeDownload.filename}`}
              </Text>
              <Text style={styles.downloadToastSub}>
                {activeDownload.status === 'downloading'
                  ? `${Math.round(activeDownload.progress * 100)}% • ${activeDownload.formattedSize}`
                  : 'Tap to view or share'}
              </Text>
            </View>
            {activeDownload.status === 'completed' && (
              <Text style={styles.toastActionBtn}>OPEN</Text>
            )}
          </TouchableOpacity>
        )}

        {/* New Tab Notification Banner - Highly Visible & Professional UX */}
        {tabToast && (
          <Animated.View
            style={[
              styles.newTabToast,
              {
                bottom: dockBottomMargin + 72,
                transform: [{ translateY: toastAnim }],
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                borderColor: isDark ? '#3A3A3C' : '#E5E5EA',
              },
            ]}
          >
            <View style={[styles.newTabToastIcon, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
              <Layers size={18} color={isDark ? '#FFFFFF' : '#000000'} />
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.newTabToastTitle, { color: isDark ? '#FFFFFF' : '#000000' }]} numberOfLines={1}>
                {tabToast.title}
              </Text>
              <Text style={[styles.newTabToastSub, { color: isDark ? '#98989D' : '#6E6E73' }]}>
                Opened in background tab
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.newTabToastAction, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]}
              onPress={() => {
                handleSelectTab(tabToast.tabId);
                dismissTabToast();
              }}
            >
              <Text style={[styles.newTabToastActionText, { color: isDark ? '#000000' : '#FFFFFF' }]}>
                Switch Tab
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={dismissTabToast}
              style={styles.newTabToastClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={isDark ? '#8E8E93' : '#6C6C70'} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Main Content Area - Full Bleed: Web content scrolls under floating dock */}
        <Animated.View style={[styles.content, { opacity: tabFadeAnim }]}>
          {currentTab.url === 'home' ? (
            <DapsHome
              onSelectShortcut={url => handleSearch(url)}
              onOpenHistory={() => setIsHistoryVisible(true)}
              onOpenSettings={() => setIsSettingsVisible(true)}
              onOpenDownloads={() => setIsDownloadsVisible(true)}
              onOpenShields={() => setIsShieldsModalVisible(true)}
              totalBlockedCount={totalBlockedCount}
              bookmarks={bookmarks}
              isPrivate={isPrivate}
              isDarkMode={isDark}
              onRemoveBookmark={u => setBookmarks(prev => prev.filter(b => b.url !== u))}
            />
          ) : (
            <BrowserView
              ref={browserRef}
              url={currentTab.url}
              onProgress={p => {
                setProgress(p);
                if (p >= 1) setIsLoading(false);
              }}
              onNavigationStateChange={handleNavChange}
              adBlockEnabled={settings.isAdBlockActive}
              isDarkMode={isDark}
              isPrivate={isPrivate}
              userAgent={
                settings.isDesktop
                  ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                  : undefined
              }
              onShieldBlocked={handleShieldBlocked}
              onOpenNewTab={handleOpenNewTab}
              onScrollDirection={handleScrollDirection}
              onDownloadComplete={file => {
                setDownloads(prev => [file, ...prev]);
              }}
            />
          )}
        </Animated.View>

        {/* Truly Floating Bottom Dock with Scroll Auto-Hide */}
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.dockWrapper,
            {
              bottom: dockBottomMargin,
              transform: [{ translateY: dockTranslateAnim }],
            },
          ]}
        >
          <BottomDock
            canGoBack={navState.canGoBack}
            canGoForward={navState.canGoForward}
            onBack={() => browserRef.current?.goBack()}
            onForward={() => browserRef.current?.goForward()}
            onHome={handleHome}
            onTabs={() => {
              showDock();
              setIsTabSwitcherVisible(true);
            }}
            isPrivate={isPrivate}
            isDarkMode={isDark}
            tabCount={tabs.length}
            onTogglePrivate={() => setIsPrivate(!isPrivate)}
          />
        </Animated.View>
      </View>

      {/* Settings Modal (with Black & White theme selector) */}
      <SettingsView
        visible={isSettingsVisible}
        onClose={() => setIsSettingsVisible(false)}
        settings={settings}
        onUpdateSettings={newSets => {
          setSettings(prev => ({ ...prev, ...newSets }));
          if (typeof newSets.isAdBlockActive === 'boolean') {
            if (newSets.isAdBlockActive) adblockManager.enableShields();
            else adblockManager.disableShields();
          }
        }}
        downloads={downloads}
        onOpenDownloads={() => setIsDownloadsVisible(true)}
        onClearBrowsingData={handleClearBrowsingData}
        onOpenShields={() => {
          setIsSettingsVisible(false);
          setTimeout(() => setIsShieldsModalVisible(true), 200);
        }}
        isPrivate={isPrivate}
        isDarkMode={isDark}
      />

      {/* Downloads Manager */}
      <DownloadsView
        visible={isDownloadsVisible}
        onClose={() => setIsDownloadsVisible(false)}
        downloads={downloads}
        onDownloadsChange={setDownloads}
        isPrivate={isPrivate}
        isDarkMode={isDark}
      />

      {/* Daps Shield Modal */}
      <ShieldsModal
        visible={isShieldsModalVisible}
        onClose={() => setIsShieldsModalVisible(false)}
        shieldsEnabled={settings.isAdBlockActive}
        onToggleShields={() => {
          const nextState = !settings.isAdBlockActive;
          setSettings(prev => ({ ...prev, isAdBlockActive: nextState }));
          if (nextState) adblockManager.enableShields();
          else adblockManager.disableShields();
        }}
        shieldsMode={settings.shieldsMode}
        onSetShieldsMode={m => setSettings(prev => ({ ...prev, shieldsMode: m }))}
        pageBlockedCount={pageBlockedCount}
        totalBlockedCount={totalBlockedCount}
        isPrivate={isPrivate}
        isDarkMode={isDark}
      />

      {/* Tab Switcher with Real Website Live View Preview Cards */}
      <Modal visible={isTabSwitcherVisible} animationType="slide">
        <SafeAreaView
          style={[
            styles.modalContainer,
            {
              backgroundColor: isDark ? '#000000' : '#F2F2F7',
              paddingTop: insets.top,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Tabs ({tabs.length})
            </Text>
            <View style={styles.tabActions}>
              <TouchableOpacity
                style={[styles.newTabBtn, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]}
                onPress={handleCreateNewTab}
              >
                <Plus size={18} color={isDark ? '#000000' : '#FFFFFF'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsTabSwitcherVisible(false)}>
                <Text style={[styles.doneBtn, { color: theme.text }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.tabGrid} showsVerticalScrollIndicator={false}>
            {tabs.map(tab => {
              const isTabActive = activeTabId === tab.id;
              const isHomeTab = tab.url === 'home';
              let displayDomain = 'Home';
              try {
                if (!isHomeTab) displayDomain = new URL(tab.url).hostname.replace(/^www\./, '');
              } catch {}

              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tabCard,
                    {
                      backgroundColor: theme.card,
                      borderColor: isTabActive ? (isDark ? '#FFFFFF' : '#000000') : theme.cardBorder,
                      borderWidth: isTabActive ? 2 : 1,
                    },
                  ]}
                  onPress={() => handleSelectTab(tab.id)}
                >
                  {/* Tab Card Header */}
                  <View style={styles.tabCardHeader}>
                    <Text numberOfLines={1} style={[styles.tabCardTitle, { color: theme.text }]}>
                      {tab.title || displayDomain}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleCloseTab(tab.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={styles.closeTabBtn}
                    >
                      <X size={14} color={theme.subtext} />
                    </TouchableOpacity>
                  </View>

                  {/* Rich Scaled Pro Website Snapshot */}
                  <View style={[styles.tabWebsiteView, { backgroundColor: isDark ? '#0D0D0D' : '#F6F6F9' }]}>
                    {isHomeTab ? (
                      <View style={styles.homeTabPreview}>
                        <Compass size={24} color={theme.text} />
                        <Text style={[styles.homeTabTitle, { color: theme.text }]}>Daps Home</Text>
                        <Text style={[styles.homeTabSub, { color: theme.subtext }]}>Start page</Text>
                      </View>
                    ) : (
                      <View style={styles.webpagePreview}>
                        {/* Mini Address Bar Preview */}
                        <View style={[styles.miniAddressPill, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                          <Lock size={10} color={theme.subtext} style={{ marginRight: 4 }} />
                          <Text numberOfLines={1} style={[styles.miniAddressText, { color: theme.text }]}>
                            {displayDomain}
                          </Text>
                        </View>

                        {/* Real Live Scaled Website View */}
                        <View style={styles.realWebsiteWrapper} pointerEvents="none">
                          <View
                            style={{
                              width: VIEWPORT_WIDTH,
                              height: VIEWPORT_HEIGHT,
                              transform: [
                                { translateX: TRANSLATE_X },
                                { translateY: TRANSLATE_Y },
                                { scale: SCALE_RATIO },
                              ],
                            }}
                          >
                            <WebView
                              source={{ uri: tab.url }}
                              style={{
                                width: VIEWPORT_WIDTH,
                                height: VIEWPORT_HEIGHT,
                                backgroundColor: isDark ? '#000000' : '#FFFFFF',
                              }}
                              scrollEnabled={false}
                              javaScriptEnabled={true}
                              domStorageEnabled={true}
                              cacheEnabled={true}
                              forceDarkOn={isDark}
                              allowsInlineMediaPlayback={false}
                              mediaPlaybackRequiresUserAction={true}
                              setSupportMultipleWindows={false}
                            />
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* History View */}
      <HistoryView
        visible={isHistoryVisible}
        onClose={() => setIsHistoryVisible(false)}
        history={history}
        onSelect={(u: string) => {
          handleSearch(u);
          setIsHistoryVisible(false);
        }}
        onClear={() => setHistory([])}
        onDeleteItem={handleDeleteHistoryItem}
        isPrivate={isPrivate}
        isDarkMode={isDark}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainBrowserApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1 },
  layoutContainer: { flex: 1 },
  content: { flex: 1 },
  dockWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  progressTrack: { height: 2, width: '100%' },
  progressBar: { height: 2 },
  downloadToast: {
    position: 'absolute',
    top: 55,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2000,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  downloadToastIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  downloadToastText: {
    flex: 1,
  },
  downloadToastTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  downloadToastSub: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 2,
  },
  toastActionBtn: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    paddingHorizontal: 8,
  },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 24, fontWeight: '800' },
  tabActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  newTabBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtn: { fontSize: 17, fontWeight: '700' },
  tabGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    justifyContent: 'space-between',
  },
  tabCard: {
    width: (width - 38) / 2,
    height: 220,
    borderRadius: 18,
    marginBottom: 14,
    padding: 10,
    overflow: 'hidden',
  },
  tabCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tabCardTitle: { flex: 1, fontSize: 12, fontWeight: '700', marginRight: 6 },
  closeTabBtn: {
    padding: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
  },
  tabWebsiteView: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    padding: 8,
  },
  homeTabPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  homeTabTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  homeTabSub: {
    fontSize: 11,
  },
  webpagePreview: {
    flex: 1,
  },
  miniAddressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  miniAddressText: {
    fontSize: 10,
    fontWeight: '600',
  },
  realWebsiteWrapper: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  realWebsitePreview: {
    flex: 1,
  },
  newTabToast: {
    position: 'absolute',
    left: 14,
    right: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 9999,
  },
  newTabToastIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  newTabToastTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  newTabToastSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  newTabToastAction: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  newTabToastActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  newTabToastClose: {
    padding: 6,
  },
});