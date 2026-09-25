import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  Code,
  File,
  Share2,
  Trash2,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react-native';
import {
  DownloadItem,
  DownloadCategory,
  openOrShareFile,
  deleteDownloadedFile,
  clearAllDownloadedFiles,
} from '../utils/downloadManager';

interface DownloadsViewProps {
  visible: boolean;
  onClose: () => void;
  downloads: DownloadItem[];
  onDownloadsChange: (downloads: DownloadItem[]) => void;
  isPrivate?: boolean;
  isDarkMode?: boolean;
}

export const DownloadsView = ({
  visible,
  onClose,
  downloads,
  onDownloadsChange,
  isPrivate = false,
  isDarkMode = false,
}: DownloadsViewProps) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DownloadCategory>('all');
  const [isSearchActive, setIsSearchActive] = useState(false);

  const dark = isDarkMode || isPrivate;
  const theme = {
    bg: dark ? '#000000' : '#FFFFFF',
    headerBg: dark ? '#121212' : '#FFFFFF',
    text: dark ? '#FFFFFF' : '#000000',
    subtext: dark ? '#8E8E93' : '#6C6C70',
    card: dark ? '#1C1C1E' : '#F6F6F8',
    cardBorder: dark ? '#2C2C2E' : '#E5E5EA',
    chipActiveBg: dark ? '#FFFFFF' : '#000000',
    chipActiveText: dark ? '#000000' : '#FFFFFF',
    chipInactiveBg: dark ? '#1C1C1E' : '#F2F2F7',
    chipInactiveText: dark ? '#8E8E93' : '#6C6C70',
    inputBg: dark ? '#1C1C1E' : '#F2F2F7',
    progressFill: dark ? '#FFFFFF' : '#000000',
    danger: '#FF3B30',
  };

  const getFileIcon = (fileType: DownloadItem['fileType']) => {
    switch (fileType) {
      case 'document':
        return <FileText size={22} color={theme.text} />;
      case 'image':
        return <ImageIcon size={22} color={theme.text} />;
      case 'video':
        return <Video size={22} color={theme.text} />;
      case 'audio':
        return <Music size={22} color={theme.text} />;
      case 'archive':
        return <Archive size={22} color={theme.text} />;
      case 'code':
        return <Code size={22} color={theme.text} />;
      default:
        return <File size={22} color={theme.text} />;
    }
  };

  const handleDelete = (item: DownloadItem) => {
    Alert.alert('Delete file', `Delete "${item.filename}" from your downloads?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = await deleteDownloadedFile(item.id);
          onDownloadsChange(updated);
        },
      },
    ]);
  };

  const handleClearAll = () => {
    if (downloads.length === 0) return;
    Alert.alert(
      'Clear Downloads',
      'Remove all downloaded files from your device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearAllDownloadedFiles();
            onDownloadsChange([]);
          },
        },
      ]
    );
  };

  const categories: { label: string; value: DownloadCategory }[] = [
    { label: 'All', value: 'all' },
    { label: 'Documents', value: 'documents' },
    { label: 'Images', value: 'images' },
    { label: 'Media', value: 'media' },
    { label: 'Archives', value: 'archives' },
  ];

  const filteredDownloads = downloads.filter(item => {
    const matchesQuery = item.filename.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesQuery) return false;

    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'documents') return item.fileType === 'document';
    if (selectedCategory === 'images') return item.fileType === 'image';
    if (selectedCategory === 'media') return item.fileType === 'video' || item.fileType === 'audio';
    if (selectedCategory === 'archives') return item.fileType === 'archive';
    return true;
  });

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
        {/* App Bar */}
        <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
          {isSearchActive ? (
            <View style={styles.searchBarContainer}>
              <TouchableOpacity onPress={() => setIsSearchActive(false)} style={styles.headerBtn}>
                <ArrowLeft size={22} color={theme.text} />
              </TouchableOpacity>
              <TextInput
                style={[styles.searchInput, { backgroundColor: theme.inputBg, color: theme.text }]}
                placeholder="Search downloads"
                placeholderTextColor={theme.subtext}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                  <X size={18} color={theme.subtext} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              <View style={styles.headerLeft}>
                <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                  <ArrowLeft size={22} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Downloads</Text>
              </View>

              <View style={styles.headerRight}>
                <TouchableOpacity onPress={() => setIsSearchActive(true)} style={styles.headerBtn}>
                  <Search size={20} color={theme.text} />
                </TouchableOpacity>
                {downloads.length > 0 && (
                  <TouchableOpacity onPress={handleClearAll} style={styles.headerBtn}>
                    <Trash2 size={20} color={theme.danger} />
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>

        {/* Category Pills */}
        <View style={styles.categoriesWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContent}>
            {categories.map(cat => {
              const active = selectedCategory === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: active ? theme.chipActiveBg : theme.chipInactiveBg,
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat.value)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: active ? theme.chipActiveText : theme.chipInactiveText },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Downloads List */}
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredDownloads.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconBg, { backgroundColor: theme.card }]}>
                <DownloadCloud size={44} color={theme.subtext} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No downloads</Text>
              <Text style={[styles.emptySubtitle, { color: theme.subtext }]}>
                Files you download will appear here.
              </Text>
            </View>
          ) : (
            filteredDownloads.map(item => (
              <View
                key={item.id}
                style={[
                  styles.card,
                  { backgroundColor: theme.card, borderColor: theme.cardBorder },
                ]}
              >
                <TouchableOpacity
                  style={styles.cardMain}
                  onPress={() => openOrShareFile(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.fileIconWrapper}>{getFileIcon(item.fileType)}</View>

                  <View style={styles.fileInfo}>
                    <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>
                      {item.filename}
                    </Text>

                    <View style={styles.fileMetaRow}>
                      <Text style={[styles.fileMeta, { color: theme.subtext }]}>
                        {item.formattedSize || 'Unknown size'} • {item.date} {item.time}
                      </Text>
                      {item.status === 'completed' && (
                        <CheckCircle2 size={13} color={theme.text} style={{ marginLeft: 6 }} />
                      )}
                      {item.status === 'failed' && (
                        <AlertCircle size={13} color={theme.danger} style={{ marginLeft: 6 }} />
                      )}
                    </View>

                    {item.status === 'downloading' && (
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBarTrack}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                width: `${Math.round(item.progress * 100)}%`,
                                backgroundColor: theme.progressFill,
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.progressPercent, { color: theme.subtext }]}>
                          {Math.round(item.progress * 100)}%
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => openOrShareFile(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Share2 size={18} color={theme.subtext} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDelete(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={18} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    padding: 6,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  clearSearchBtn: {
    padding: 6,
  },
  categoriesWrapper: {
    paddingVertical: 10,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(150, 150, 150, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  fileInfo: {
    flex: 1,
    marginRight: 8,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  fileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileMeta: {
    fontSize: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  progressBarTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyIconBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
