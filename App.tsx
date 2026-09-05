import React, { useState, useRef, useEffect } from 'react';
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
  Platform,
  BackHandler,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BrowserView } from './components/BrowserView';
import { AddressBar } from './components/AddressBar';
import { BottomDock } from './components/BottomDock';
import { DapsHome } from './components/DapsHome';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { X, Plus } from 'lucide-react-native';

const { width } = Dimensions.get('window');

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
};

function MainBrowserApp() {
  const insets = useSafeAreaInsets();
  const [tabs, setTabs] = useState<Tab[]>([{ id: '1', url: 'home', title: 'Home' }]);
  const [activeTabId, setActiveTabId] = useState('1');
  const [isTabSwitcherVisible, setIsTabSwitcherVisible] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isDesktopMode, setIsDesktopMode] = useState(false);
  const [isAdBlockActive, setIsAdBlockActive] = useState(true);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [downloads, setDownloads] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);
  const [navState, setNavState] = useState({ canGoBack: false, canGoForward: false });
  const [history, setHistory] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);

  const browserRef = useRef<any>(null);
  const currentTab = tabs.find(t => t.id === activeTabId) || tabs[0] || { id: '1', url: 'home', title: 'Home' };

  useEffect(() => {
    const loadState = async () => {
      try {
        const [savedHistory, savedBookmarks, savedDownloads, savedSettings] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.HISTORY),
          AsyncStorage.getItem(STORAGE_KEYS.BOOKMARKS),
          AsyncStorage.getItem(STORAGE_KEYS.DOWNLOADS),
          AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
        ]);

        if (savedHistory) setHistory(JSON.parse(savedHistory));
        if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));
        if (savedDownloads) setDownloads(JSON.parse(savedDownloads));
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          if (typeof parsed.isAdBlockActive === 'boolean') setIsAdBlockActive(parsed.isAdBlockActive);
          if (typeof parsed.isDesktopMode === 'boolean') setIsDesktopMode(parsed.isDesktopMode);
        }
      } catch (e) {
        console.error('Error loading data', e);
      }
    };
    loadState();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks)).catch(() => {});
  }, [bookmarks]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history)).catch(() => {});
  }, [history]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADS, JSON.stringify(downloads)).catch(() => {});
  }, [downloads]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ isAdBlockActive, isDesktopMode })).catch(() => {});
  }, [isAdBlockActive, isDesktopMode]);

  useEffect(() => {
    const onBackPress = () => {
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
  }, [navState.canGoBack, currentTab.url, isTabSwitcherVisible, isSettingsVisible, isHistoryVisible]);

  const handleSearch = (val: string) => {
    let newUrl =
      val.toLowerCase() === 'home' || val.trim() === ''
        ? 'home'
        : val.includes('.') && !val.includes(' ')
        ? val.startsWith('http://') || val.startsWith('https://')
          ? val
          : `https://${val}`
        : `https://www.google.com/search?q=${encodeURIComponent(val)}`;

    setTabs(prev => prev.map(t => (t.id === activeTabId ? { ...t, url: newUrl, title: newUrl } : t)));
    setProgress(0);
  };

  const handleNavChange = (nav: any) => {
    setNavState({ canGoBack: nav.canGoBack, canGoForward: nav.canGoForward });
    if (nav.url && nav.url !== 'about:blank' && nav.url !== 'home') {
      setTabs(prev => prev.map(t => (t.id === activeTabId ? { ...t, url: nav.url, title: nav.title || nav.url } : t)));
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
          ].slice(0, 50);
        });
      }
    }
  };

  const handleHome = () => {
    setProgress(0);
    setNavState({ canGoBack: false, canGoForward: false });
    setTabs(prev => prev.map(t => (t.id === activeTabId ? { ...t, url: 'home', title: 'Home' } : t)));
  };

  const handleCreateNewTab = () => {
    const newId = Date.now().toString();
    const newTab: Tab = { id: newId, url: 'home', title: 'Home' };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
    setIsTabSwitcherVisible(false);
  };

  const handleCloseTab = (tabId: string) => {
    if (tabs.length === 1) {
      setTabs([{ id: '1', url: 'home', title: 'Home' }]);
      setActiveTabId('1');
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

  const theme = {
    bg: isPrivate ? '#000000' : '#FFFFFF',
    progressTrack: isPrivate ? '#1A1A1A' : '#F0F0F2',
    progressBar: isPrivate ? '#FFFFFF' : '#000000',
  };

  return (
    <View style={[styles.mainWrapper, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={isPrivate ? 'light-content' : 'dark-content'}
        backgroundColor={theme.bg}
        translucent={true}
      />

      <View style={{ height: insets.top, backgroundColor: theme.bg }} />

      <View style={styles.layoutContainer}>
        <AddressBar
          url={currentTab.url === 'home' ? '' : currentTab.url}
          onSearch={handleSearch}
          isPrivate={isPrivate}
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
          } }
          isBookmarked={bookmarks.some(b => b.url === currentTab.url)} onReload={function (): void {
            throw new Error('Function not implemented.');
          } }        />

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

        <View style={styles.content}>
          {currentTab.url === 'home' ? (
            <DapsHome
              onSelectShortcut={url => handleSearch(url)}
              onOpenHistory={() => setIsHistoryVisible(true)}
              onOpenSettings={() => setIsSettingsVisible(true)}
              bookmarks={bookmarks}
              isPrivate={isPrivate}
              onRemoveBookmark={u => setBookmarks(prev => prev.filter(b => b.url !== u))}
            />
          ) : (
            <BrowserView
              ref={browserRef}
              url={currentTab.url}
              onProgress={setProgress}
              onNavigationStateChange={handleNavChange}
              adBlockEnabled={isAdBlockActive}
              isPrivate={isPrivate}
              userAgent={
                isDesktopMode
                  ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                  : undefined
              }
              onDownloadComplete={(file: any) => setDownloads(prev => [file, ...prev])}
            />
          )}
        </View>

        <View
          pointerEvents="box-none"
          style={[
            styles.dockWrapper,
            { bottom: Math.max(insets.bottom, 14) + 8 },
          ]}
        >
          <BottomDock
            canGoBack={navState.canGoBack}
            canGoForward={navState.canGoForward}
            onBack={() => browserRef.current?.goBack()}
            onForward={() => browserRef.current?.goForward()}
            onReload={() => browserRef.current?.reload()}
            onHome={handleHome}
            onTabs={() => setIsTabSwitcherVisible(true)}
            isPrivate={isPrivate}
            onTogglePrivate={() => setIsPrivate(!isPrivate)}
          />
        </View>
      </View>

      <SettingsView
        visible={isSettingsVisible}
        onClose={() => setIsSettingsVisible(false)}
        isDesktop={isDesktopMode}
        onToggleDesktop={() => setIsDesktopMode(!isDesktopMode)}
        isAdBlockActive={isAdBlockActive}
        onToggleAdBlock={() => setIsAdBlockActive(!isAdBlockActive)}
        isPrivate={isPrivate}
        downloads={downloads}
        onClearData={async () => {
          await AsyncStorage.multiRemove([STORAGE_KEYS.HISTORY, STORAGE_KEYS.DOWNLOADS]);
          setHistory([]);
          setDownloads([]);
          Alert.alert('Daps Technologies', 'Data cleared.');
        }}
      />

      <Modal visible={isTabSwitcherVisible} animationType="slide">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: isPrivate ? '#000000' : '#F2F2F7' }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: isPrivate ? '#FFFFFF' : '#000000' }]}>Tabs</Text>
            <View style={styles.tabActions}>
              <TouchableOpacity style={styles.newTabBtn} onPress={handleCreateNewTab}>
                <Plus size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsTabSwitcherVisible(false)}>
                <Text style={styles.doneBtn}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.tabGrid} showsVerticalScrollIndicator={false}>
            {tabs.map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabCard,
                  { backgroundColor: isPrivate ? '#1A1A1A' : '#FFFFFF' },
                  activeTabId === tab.id && {
                    borderColor: isPrivate ? '#FFFFFF' : '#000000',
                    borderWidth: 2,
                  },
                ]}
                onPress={() => {
                  setActiveTabId(tab.id);
                  setIsTabSwitcherVisible(false);
                }}
              >
                <View style={styles.tabCardHeader}>
                  <Text
                    numberOfLines={1}
                    style={[styles.tabCardTitle, { color: isPrivate ? '#FFFFFF' : '#000000' }]}
                  >
                    {tab.title}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleCloseTab(tab.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.closeTabBtn}
                  >
                    <X size={14} color={isPrivate ? '#888888' : '#666666'} />
                  </TouchableOpacity>
                </View>
                <View style={[styles.tabPreview, { backgroundColor: isPrivate ? '#222222' : '#F9F9F9' }]}>
                  <Text
                    style={[styles.previewUrl, { color: isPrivate ? '#666666' : '#999999' }]}
                    numberOfLines={2}
                  >
                    {tab.url}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtn: { color: '#000000', fontSize: 17, fontWeight: '700' },
  tabGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    justifyContent: 'space-between',
  },
  tabCard: {
    width: (width - 40) / 2,
    height: 170,
    borderRadius: 15,
    marginBottom: 15,
    padding: 12,
  },
  tabCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tabCardTitle: { flex: 1, fontSize: 12, fontWeight: '700', marginRight: 6 },
  closeTabBtn: {
    padding: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
  },
  tabPreview: {
    flex: 1,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  previewUrl: { fontSize: 10, textAlign: 'center' },
});