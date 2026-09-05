import React, { useEffect, useRef } from 'react';
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
} from 'react-native';
import { LayoutGrid, Zap, Globe, History, Search } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 40) / 3;

interface DapsHomeProps {
  onSelectShortcut: (url: string) => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  bookmarks: { title: string; url: string }[];
  onRemoveBookmark: (url: string) => void;
  isPrivate: boolean;
}

export const DapsHome = ({
  onSelectShortcut,
  onOpenHistory,
  onOpenSettings,
  bookmarks,
  onRemoveBookmark,
  isPrivate,
}: DapsHomeProps) => {
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Subtle pulse for the shield/glow
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

    // Floating particles animation
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

  const handleLongPress = (item: { title: string; url: string }) => {
    Alert.alert('Remove Bookmark', `Delete "${item.title}" from your library?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onRemoveBookmark(item.url) },
    ]);
  };

  const theme = {
    bg: isPrivate ? '#000000' : '#FFFFFF',
    text: isPrivate ? '#FFFFFF' : '#000000',
    card: isPrivate ? '#1A1A1A' : '#F5F5F7',
    border: isPrivate ? '#333333' : '#EEEEEE',
    subtext: isPrivate ? '#888888' : '#777777',
    iconBg: isPrivate ? '#222222' : '#F9F9F9',
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
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

      {/* Non-clickable Animated Hero Card */}
      <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {/* Floating background ambient dots */}
        <Animated.View
          style={[
            styles.ambientDot,
            styles.dotOne,
            {
              backgroundColor: isPrivate ? '#333333' : '#E0E0E5',
              transform: [{ translateY: floatAnim1 }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.ambientDot,
            styles.dotTwo,
            {
              backgroundColor: isPrivate ? '#2A2A2A' : '#E8E8EE',
              transform: [{ translateY: floatAnim2 }],
            },
          ]}
        />

        <View style={styles.heroInfo}>
          <View style={[styles.badge, { backgroundColor: isPrivate ? '#333333' : '#000000' }]}>
            <Zap size={10} color="#FFFFFF" fill="#FFFFFF" />
            <Text style={styles.badgeText}>{isPrivate ? 'PRIVATE ENGINE ACTIVE' : 'SHIELD ENGINE ACTIVE'}</Text>
          </View>
          <Text style={[styles.heroTitle, { color: theme.text }]}>Daps Engine</Text>
          <Text style={[styles.heroDesc, { color: theme.subtext }]}>
            Ad blocking and private network protection running in real-time.
          </Text>
        </View>

        {/* Pulse radar graphic */}
        <View style={styles.radarContainer}>
          <Animated.View
            style={[
              styles.pulseRing,
              {
                borderColor: isPrivate ? '#444444' : '#DDDDDD',
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          <View style={[styles.centerOrb, { backgroundColor: isPrivate ? '#FFFFFF' : '#000000' }]}>
            <View style={[styles.innerCore, { backgroundColor: isPrivate ? '#000000' : '#FFFFFF' }]} />
          </View>
        </View>
      </View>

      <View style={styles.utilityGrid}>
        <TouchableOpacity style={styles.utilItem} onPress={() => onSelectShortcut('https://www.wikipedia.org')}>
          <View style={[styles.utilIcon, { backgroundColor: theme.card }]}>
            <Globe size={20} color={theme.text} />
          </View>
          <Text style={[styles.utilLabel, { color: theme.text }]}>Explore</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.utilItem} onPress={onOpenHistory}>
          <View style={[styles.utilIcon, { backgroundColor: theme.card }]}>
            <History size={20} color={theme.text} />
          </View>
          <Text style={[styles.utilLabel, { color: theme.text }]}>Recent</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.utilItem} onPress={() => onSelectShortcut('https://www.youtube.com')}>
          <View style={[styles.utilIcon, { backgroundColor: isPrivate ? '#333333' : '#000000' }]}>
            <Search size={20} color="#FFFFFF" />
          </View>
          <Text style={[styles.utilLabel, { color: theme.text }]}>Entertainment</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Bookmarks</Text>
      <View style={styles.bookmarkGrid}>
        {bookmarks.length === 0 ? (
          <View style={[styles.emptyBookmarks, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={styles.emptyText}>Your saved sites will appear here.</Text>
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
              <View style={[styles.faviconCircle, { backgroundColor: theme.iconBg, borderColor: theme.border }]}>
                <Text style={[styles.faviconLetter, { color: theme.text }]}>
                  {bookmark.title.charAt(0).toUpperCase()}
                </Text>
              </View>
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
    marginTop: 30,
    marginBottom: 25,
  },
  dateText: { fontSize: 11, color: '#AAAAAA', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  greeting: { fontSize: 28, fontWeight: '900', marginTop: 2, letterSpacing: -0.5 },
  menuBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  heroCard: {
    borderRadius: 24,
    padding: 24,
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
    marginBottom: 10,
    alignSelf: 'flex-start',
    gap: 4,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  heroTitle: { fontSize: 22, fontWeight: '800' },
  heroDesc: { fontSize: 13, marginTop: 4, lineHeight: 18 },
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
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  utilityGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
  utilItem: { alignItems: 'center', width: '30%' },
  utilIcon: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  utilLabel: { fontSize: 13, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginTop: 40, marginBottom: 15 },
  bookmarkGrid: { flexDirection: 'row', flexWrap: 'wrap', marginLeft: -5, marginRight: -5 },
  bookmarkTile: { width: ITEM_WIDTH, padding: 10, alignItems: 'center', marginBottom: 10 },
  faviconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
  },
  faviconLetter: { fontWeight: '800', fontSize: 20 },
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