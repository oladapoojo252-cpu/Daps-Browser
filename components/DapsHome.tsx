import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { LayoutGrid, Zap, Globe, History, Download, ShieldCheck } from 'lucide-react-native';
import { calculateShieldSavings } from '../utils/dapsShield';

import {
  extractDomain,
  getSynchronousCachedFavicon,
  cacheFavicon,
  subscribeFavicon,
  prefetchBookmarkFavicons,
} from '../utils/faviconCache';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 40) / 3;

interface DapsHomeProps {
  onSelectShortcut: (url: string) => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onOpenDownloads?: () => void;
  onOpenShields?: () => void;
  totalBlockedCount?: number;
  bookmarks: { title: string; url: string }[];
  onRemoveBookmark: (url: string) => void;
  isPrivate: boolean;
  isDarkMode?: boolean;
}

const BookmarkFavicon = ({
  url,
  title,
  theme,
}: {
  url: string;
  title: string;
  theme: any;
}) => {
  const [hasError, setHasError] = useState(false);
  const domain = extractDomain(url);
  const [faviconUri, setFaviconUri] = useState<string | null>(() => getSynchronousCachedFavicon(url));

  useEffect(() => {
    let isMounted = true;
    if (!domain) return;

    // Check synchronous cache first
    const syncCached = getSynchronousCachedFavicon(url);
    if (syncCached) {
      setFaviconUri(syncCached);
      return;
    }

    // Subscribe to background download ready event
    const unsubscribe = subscribeFavicon(domain, (localUri) => {
      if (isMounted) {
        setFaviconUri(localUri);
        setHasError(false);
      }
    });

    // Request on-device caching in background
    cacheFavicon(url).then(cached => {
      if (isMounted && cached) {
        setFaviconUri(cached);
        setHasError(false);
      }
    }).catch(() => {});

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [url, domain]);

  return (
    <View
      style={[
        styles.faviconCircle,
        { backgroundColor: theme.iconBg, borderColor: theme.border },
      ]}
    >
      {faviconUri && !hasError ? (
        <Image
          source={{ uri: faviconUri }}
          style={styles.faviconImage}
          onError={() => setHasError(true)}
          resizeMode="contain"
        />
      ) : (
        <Text style={[styles.faviconLetter, { color: theme.text }]}>
          {title ? title.charAt(0).toUpperCase() : 'W'}
        </Text>
      )}
    </View>
  );
};

export const DapsHome = ({
  onSelectShortcut,
  onOpenHistory,
  onOpenSettings,
  onOpenDownloads,
  onOpenShields,
  totalBlockedCount = 0,
  bookmarks,
  onRemoveBookmark,
  isPrivate,
  isDarkMode = false,
}: DapsHomeProps) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;

  const savings = calculateShieldSavings(totalBlockedCount);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim1, {
          toValue: -8,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim1, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim2, {
          toValue: 7,
          duration: 3100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim2, {
          toValue: 0,
          duration: 3100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim, floatAnim1, floatAnim2]);

  useEffect(() => {
    if (bookmarks && bookmarks.length > 0) {
      prefetchBookmarkFavicons(bookmarks);
    }
  }, [bookmarks]);

  const handleLongPress = (item: { title: string; url: string }) => {
    Alert.alert('Remove Bookmark', `Delete "${item.title}" from your library?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onRemoveBookmark(item.url) },
    ]);
  };

  const dark = isDarkMode || isPrivate;
  const theme = {
    bg: dark ? '#000000' : '#FFFFFF',
    text: dark ? '#FFFFFF' : '#000000',
    card: dark ? '#1A1A1A' : '#F5F5F7',
    border: dark ? '#333333' : '#EEEEEE',
    subtext: dark ? '#8E8E93' : '#777777',
    iconBg: dark ? '#222222' : '#F9F9F9',
    badgeBg: dark ? '#333333' : '#000000',
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 110 }}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
          <Text style={[styles.greeting, { color: theme.text }]}>Daps Browser</Text>
        </View>
        <TouchableOpacity style={[styles.menuBtn, { backgroundColor: theme.card }]} onPress={onOpenSettings}>
          <LayoutGrid size={22} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Interactive Daps Shield Hero Card */}
      <TouchableOpacity
        style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={onOpenShields}
        activeOpacity={0.85}
      >
        <Animated.View
          style={[
            styles.ambientDot,
            styles.dotOne,
            {
              backgroundColor: dark ? '#2C2C2E' : '#E0E0E5',
              transform: [{ translateY: floatAnim1 }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.ambientDot,
            styles.dotTwo,
            {
              backgroundColor: dark ? '#242426' : '#E8E8EE',
              transform: [{ translateY: floatAnim2 }],
            },
          ]}
        />

        <View style={styles.heroInfo}>
          <View style={[styles.badge, { backgroundColor: theme.badgeBg }]}>
            <Zap size={10} color="#FFFFFF" fill="#FFFFFF" />
            <Text style={styles.badgeText}>
              {isPrivate ? 'PRIVATE ENGINE ACTIVE' : 'DAPS SHIELD ACTIVE'}
            </Text>
          </View>
          <Text style={[styles.heroTitle, { color: theme.text }]}>Daps Engine</Text>
          <Text style={[styles.heroDesc, { color: theme.subtext }]}>
            {totalBlockedCount > 0
              ? `${totalBlockedCount} ads & trackers blocked • ${savings.formattedData} data saved`
              : 'Real-time tracker & ad protection running seamlessly.'}
          </Text>
        </View>

        {/* Pulse radar graphic */}
        <View style={styles.radarContainer}>
          <Animated.View
            style={[
              styles.pulseRing,
              {
                borderColor: dark ? '#444444' : '#DDDDDD',
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          <View style={[styles.centerOrb, { backgroundColor: dark ? '#FFFFFF' : '#000000' }]}>
            <ShieldCheck size={14} color={dark ? '#000000' : '#FFFFFF'} />
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.utilityGrid}>
        <TouchableOpacity style={styles.utilItem} onPress={() => onSelectShortcut('https://www.google.com')}>
          <View style={[styles.utilIcon, { backgroundColor: theme.card }]}>
            <Globe size={20} color={theme.text} />
          </View>
          <Text style={[styles.utilLabel, { color: theme.text }]}>Search</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.utilItem} onPress={onOpenHistory}>
          <View style={[styles.utilIcon, { backgroundColor: theme.card }]}>
            <History size={20} color={theme.text} />
          </View>
          <Text style={[styles.utilLabel, { color: theme.text }]}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.utilItem} onPress={onOpenDownloads}>
          <View style={[styles.utilIcon, { backgroundColor: theme.card }]}>
            <Download size={20} color={theme.text} />
          </View>
          <Text style={[styles.utilLabel, { color: theme.text }]}>Downloads</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Bookmarks</Text>
      <View style={styles.bookmarkGrid}>
        {bookmarks.length === 0 ? (
          <View style={[styles.emptyBookmarks, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.emptyText, { color: theme.subtext }]}>Your saved sites will appear here.</Text>
          </View>
        ) : (
          bookmarks.map((bookmark, index) => (
            <TouchableOpacity
              key={index}
              style={styles.bookmarkTile}
              onPress={() => onSelectShortcut(bookmark.url)}
              onLongPress={() => handleLongPress(bookmark)}
              delayLongPress={500}
            >
              <BookmarkFavicon url={bookmark.url} title={bookmark.title} theme={theme} />
              <Text style={[styles.bookmarkName, { color: theme.text }]} numberOfLines={1}>
                {bookmark.title}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  dateText: { fontSize: 11, color: '#AAAAAA', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  greeting: { fontSize: 26, fontWeight: '900', marginTop: 2, letterSpacing: -0.5 },
  menuBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  heroCard: {
    borderRadius: 24,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  ambientDot: { position: 'absolute', borderRadius: 50 },
  dotOne: { width: 70, height: 70, right: 30, top: -20, opacity: 0.4 },
  dotTwo: { width: 45, height: 45, right: 100, bottom: -10, opacity: 0.3 },
  heroInfo: { flex: 1, paddingRight: 10 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  heroTitle: { fontSize: 20, fontWeight: '800' },
  heroDesc: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  radarContainer: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  centerOrb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  utilityGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25 },
  utilItem: { alignItems: 'center', width: '30%' },
  utilIcon: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  utilLabel: { fontSize: 13, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginTop: 32, marginBottom: 15 },
  bookmarkGrid: { flexDirection: 'row', flexWrap: 'wrap', marginLeft: -5, marginRight: -5 },
  bookmarkTile: { width: ITEM_WIDTH, padding: 10, alignItems: 'center', marginBottom: 10 },
  faviconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
  },
  faviconLetter: { fontWeight: '800', fontSize: 20 },
  faviconImage: { width: 30, height: 30, borderRadius: 6 },
  bookmarkName: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  emptyBookmarks: {
    width: '100%',
    padding: 30,
    borderRadius: 20,
    borderStyle: 'dashed',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { color: '#AAAAAA', textAlign: 'center', fontSize: 13 },
});