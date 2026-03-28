import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, View, StatusBar, SafeAreaView, Modal, Text, 
  TouchableOpacity, ScrollView, Dimensions, Alert, Platform, BackHandler 
} from 'react-native';
import { BrowserView } from './components/BrowserView';
import { AddressBar } from './components/AddressBar';
import { BottomDock } from './components/BottomDock';
import { DapsHome } from './components/DapsHome';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { X, Plus } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface Tab { id: string; url: string; title: string; }

export default function App() {
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
  const currentTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  useEffect(() => {
    const onBackPress = () => {
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
  }, [navState.canGoBack, currentTab.url]);

  const handleSearch = (val: string) => {
    let newUrl = val.toLowerCase() === 'home' || val.trim() === '' ? 'home' : 
      (val.includes('.') && !val.includes(' ') ? 
      (val.startsWith('http') ? val : `https://${val}`) : 
      `https://www.google.com/search?q=${encodeURIComponent(val)}`);
    
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: newUrl, title: newUrl } : t));
    setProgress(0);
  };

  const handleNavChange = (nav: any) => {
    setNavState({ canGoBack: nav.canGoBack, canGoForward: nav.canGoForward });
    if (nav.url && nav.url !== 'about:blank' && nav.url !== 'home') {
      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: nav.url, title: nav.title || nav.url } : t));
      if (!isPrivate && !nav.loading) {
        setHistory(prev => {
          if (prev.length > 0 && prev[0].url === nav.url) return prev;
          return [{ title: nav.title || nav.url.split('/')[2], url: nav.url, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...prev].slice(0, 50);
        });
      }
    }
  };

  const handleHome = () => {
    setProgress(0);
    setNavState({ canGoBack: false, canGoForward: false });
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: 'home', title: 'Home' } : t));
  };

  return (
    <View style={[styles.mainWrapper, { backgroundColor: isPrivate ? '#000' : '#fff' }]}>
      <StatusBar barStyle={isPrivate ? "light-content" : "dark-content"} backgroundColor={isPrivate ? "#000" : "#fff"} translucent={false} />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.layoutContainer}>
          <AddressBar 
            url={currentTab.url === 'home' ? '' : currentTab.url} 
            onSearch={handleSearch} isPrivate={isPrivate}
            onToggleBookmark={() => {
                const exists = bookmarks.find(b => b.url === currentTab.url);
                if (exists) setBookmarks(prev => prev.filter(b => b.url !== currentTab.url));
                else setBookmarks(prev => [{ title: currentTab.url.split('/')[2] || 'Site', url: currentTab.url }, ...prev]);
            }}
            isBookmarked={bookmarks.some(b => b.url === currentTab.url)}
          />

          {currentTab.url !== 'home' && progress < 1 && (
            <View style={[styles.progressTrack, { backgroundColor: isPrivate ? '#1A1A1A' : '#F0F0F2' }]}>
              <View style={[styles.progressBar, { width: `${progress * 100}%`, backgroundColor: isPrivate ? '#A855F7' : '#000' }]} />
            </View>
          )}
          
          <View style={styles.content}>
            {currentTab.url === 'home' ? (
              <DapsHome 
                onSelectShortcut={(url) => { handleSearch(url); }} 
                onOpenHistory={() => setIsHistoryVisible(true)}
                onOpenSettings={() => setIsSettingsVisible(true)}
                bookmarks={bookmarks} isPrivate={isPrivate}
                onRemoveBookmark={(u) => setBookmarks(prev => prev.filter(b => b.url !== u))}
              />
            ) : (
              <BrowserView 
                ref={browserRef} url={currentTab.url} onProgress={setProgress}
                onNavigationStateChange={handleNavChange}
                adBlockEnabled={isAdBlockActive} isPrivate={isPrivate}
                userAgent={isDesktopMode ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ..." : undefined}
                onDownloadComplete={(file: any) => setDownloads(prev => [file, ...prev])}
              />
            )}
          </View>

        
          <View style={styles.footerBranding}>
             <Text style={[styles.footerText, { color: isPrivate ? '#444' : '#999' }]}>A product of Daps Technologies</Text>
          </View>

          <View style={styles.dockWrapper}>
            <BottomDock 
              canGoBack={navState.canGoBack} canGoForward={navState.canGoForward}
              onBack={() => browserRef.current?.goBack()} onForward={() => browserRef.current?.goForward()}
              onHome={handleHome} onTabs={() => setIsTabSwitcherVisible(true)}
              isPrivate={isPrivate} onTogglePrivate={() => setIsPrivate(!isPrivate)}
            />
          </View>
        </View>
      </SafeAreaView>

      <SettingsView 
        visible={isSettingsVisible} onClose={() => setIsSettingsVisible(false)}
        isDesktop={isDesktopMode} onToggleDesktop={() => setIsDesktopMode(!isDesktopMode)}
        isAdBlockActive={isAdBlockActive} onToggleAdBlock={() => setIsAdBlockActive(!isAdBlockActive)}
        isPrivate={isPrivate} downloads={downloads}
        onClearData={() => { setHistory([]); setDownloads([]); Alert.alert("Daps Technologies", "Data cleared."); }}
      />

      <Modal visible={isTabSwitcherVisible} animationType="slide">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: isPrivate ? '#000' : '#F2F2F7' }]}>
          
            <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: isPrivate ? '#FFF' : '#000' }]}>Tabs</Text>
                <TouchableOpacity onPress={() => setIsTabSwitcherVisible(false)}><Text style={styles.doneBtn}>Done</Text></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.tabGrid}>
                {tabs.map(tab => (
                    <TouchableOpacity key={tab.id} style={[styles.tabCard, { backgroundColor: isPrivate ? '#1A1A1A' : '#FFF' }, activeTabId === tab.id && { borderColor: isPrivate ? '#A855F7' : '#000', borderWidth: 2 }]} onPress={() => { setActiveTabId(tab.id); setIsTabSwitcherVisible(false); }}>
                        <View style={styles.tabCardHeader}>
                            <Text numberOfLines={1} style={[styles.tabCardTitle, { color: isPrivate ? '#FFF' : '#000' }]}>{tab.title}</Text>
                        </View>
                        <View style={[styles.tabPreview, { backgroundColor: isPrivate ? '#222' : '#F9F9F9' }]}>
                            <Text style={[styles.previewUrl, { color: isPrivate ? '#666' : '#999' }]} numberOfLines={2}>{tab.url}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </SafeAreaView>
      </Modal>

      <HistoryView visible={isHistoryVisible} onClose={() => setIsHistoryVisible(false)} history={history} onSelect={(u: string) => { handleSearch(u); setIsHistoryVisible(false); }} onClear={() => setHistory([])} />
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  layoutContainer: { flex: 1 },
  content: { flex: 1 },
  footerBranding: { position: 'absolute', bottom: 100, width: '100%', alignItems: 'center', zIndex: -1 },
  footerText: { fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  dockWrapper: { paddingBottom: Platform.OS === 'android' ? 25 : 10 }, // Increased padding for bottom clash
  progressTrack: { height: 2, width: '100%' },
  progressBar: { height: 2 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 24, fontWeight: '800' },
  doneBtn: { color: '#007AFF', fontSize: 18, fontWeight: '600' },
  tabGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, justifyContent: 'space-between' },
  tabCard: { width: (width - 40) / 2, height: 170, borderRadius: 15, marginBottom: 15, padding: 12 },
  tabCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tabCardTitle: { flex: 1, fontSize: 12, fontWeight: '700' },
  tabPreview: { flex: 1, borderRadius: 10, justifyContent: 'center', alignItems: 'center', padding: 10 },
  previewUrl: { fontSize: 10, textAlign: 'center' }
});