import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import {
  ArrowDownToLine,
  X,
  Video,
  Music,
  FileText,
  Package,
  Download,
  Check,
  Film,
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export interface SniffedMediaItem {
  url: string;
  title: string;
  type: 'video' | 'audio' | 'document' | 'archive' | 'other';
  extension: string;
  sizeFormatted?: string;
}

interface SnifferModalProps {
  visible: boolean;
  onClose: () => void;
  mediaItems: SniffedMediaItem[];
  onDownload: (url: string, filename?: string) => void;
  isDarkMode?: boolean;
}

export const SnifferModal: React.FC<SnifferModalProps> = ({
  visible,
  onClose,
  mediaItems,
  onDownload,
  isDarkMode = false,
}) => {
  const [downloadedUrls, setDownloadedUrls] = React.useState<Record<string, boolean>>({});

  const handleDownloadItem = (item: SniffedMediaItem) => {
    setDownloadedUrls(prev => ({ ...prev, [item.url]: true }));
    const cleanFilename = item.title.includes('.')
      ? item.title
      : `${item.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.${item.extension}`;
    onDownload(item.url, cleanFilename);
  };

  const handleDownloadAll = () => {
    mediaItems.forEach(item => {
      handleDownloadItem(item);
    });
  };

  const getMediaIcon = (type: string, ext: string) => {
    const iconColor = isDarkMode ? '#FFFFFF' : '#000000';
    if (type === 'video') return <Video size={20} color={iconColor} />;
    if (type === 'audio') return <Music size={20} color={iconColor} />;
    if (type === 'document') return <FileText size={20} color={iconColor} />;
    if (type === 'archive') return <Package size={20} color={iconColor} />;
    return <Download size={20} color={iconColor} />;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.sheetContainer,
            { backgroundColor: isDarkMode ? '#141414' : '#FFFFFF', borderColor: isDarkMode ? '#2C2C2E' : '#E5E5EA' },
          ]}
        >
          {/* Top Drag Pill */}
          <View style={styles.dragPillWrapper}>
            <View style={[styles.dragPill, { backgroundColor: isDarkMode ? '#3A3A3C' : '#D1D1D6' }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconBadge, { backgroundColor: isDarkMode ? '#222224' : '#F2F2F7' }]}>
                <ArrowDownToLine size={20} color={isDarkMode ? '#FFFFFF' : '#000000'} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                  Media Sniffer
                </Text>
                <Text style={[styles.headerSub, { color: isDarkMode ? '#8E8E93' : '#6C6C70' }]}>
                  {mediaItems.length === 1
                    ? '1 downloadable file detected'
                    : `${mediaItems.length} downloadable files detected`}
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              {mediaItems.length > 1 && (
                <TouchableOpacity
                  style={[styles.downloadAllBtn, { backgroundColor: isDarkMode ? '#FFFFFF' : '#000000' }]}
                  onPress={handleDownloadAll}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.downloadAllBtnText, { color: isDarkMode ? '#000000' : '#FFFFFF' }]}>
                    Download All
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: isDarkMode ? '#2C2C2E' : '#E5E5EA' }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color={isDarkMode ? '#FFFFFF' : '#000000'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content List */}
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {mediaItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconBadge, { backgroundColor: isDarkMode ? '#222224' : '#F2F2F7' }]}>
                  <Film size={32} color={isDarkMode ? '#8E8E93' : '#6C6C70'} />
                </View>
                <Text style={[styles.emptyTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                  No Media Detected Yet
                </Text>
                <Text style={[styles.emptySub, { color: isDarkMode ? '#8E8E93' : '#6C6C70' }]}>
                  Play a video or navigate to a page with downloadable files to automatically detect media.
                </Text>
              </View>
            ) : (
              mediaItems.map((item, index) => {
                const isDownloaded = !!downloadedUrls[item.url];
                return (
                  <View
                    key={`${item.url}_${index}`}
                    style={[
                      styles.mediaCard,
                      {
                        backgroundColor: isDarkMode ? '#1C1C1E' : '#F9F9FB',
                        borderColor: isDarkMode ? '#2C2C2E' : '#E5E5EA',
                      },
                    ]}
                  >
                    <View style={[styles.mediaTypeIcon, { backgroundColor: isDarkMode ? '#2A2A2C' : '#EBEBF0' }]}>
                      {getMediaIcon(item.type, item.extension)}
                    </View>

                    <View style={styles.mediaDetails}>
                      <Text
                        style={[styles.mediaTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <View style={styles.mediaMetaRow}>
                        <View style={[styles.extBadge, { backgroundColor: isDarkMode ? '#3A3A3C' : '#E5E5EA' }]}>
                          <Text style={[styles.extBadgeText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                            {item.extension.toUpperCase()}
                          </Text>
                        </View>
                        <Text
                          style={[styles.mediaSource, { color: isDarkMode ? '#8E8E93' : '#6C6C70' }]}
                          numberOfLines={1}
                        >
                          {item.url.replace(/^https?:\/\//, '').split('/')[0]}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.downloadBtn,
                        isDownloaded
                          ? { backgroundColor: isDarkMode ? '#2C2C2E' : '#E5E5EA' }
                          : { backgroundColor: isDarkMode ? '#FFFFFF' : '#000000' },
                      ]}
                      onPress={() => handleDownloadItem(item)}
                      activeOpacity={0.8}
                    >
                      {isDownloaded ? (
                        <>
                          <Check size={14} color={isDarkMode ? '#FFFFFF' : '#000000'} style={{ marginRight: 4 }} />
                          <Text style={[styles.downloadBtnText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                            Queued
                          </Text>
                        </>
                      ) : (
                        <>
                          <Download size={14} color={isDarkMode ? '#000000' : '#FFFFFF'} style={{ marginRight: 4 }} />
                          <Text style={[styles.downloadBtnText, { color: isDarkMode ? '#000000' : '#FFFFFF' }]}>
                            Download
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    maxHeight: height * 0.75,
    minHeight: 280,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  dragPillWrapper: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragPill: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  downloadAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  downloadAllBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listScroll: {
    flexGrow: 0,
  },
  listContent: {
    paddingVertical: 8,
    gap: 10,
  },
  mediaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  mediaTypeIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mediaDetails: {
    flex: 1,
    marginRight: 10,
  },
  mediaTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  mediaMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  extBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  extBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  mediaSource: {
    fontSize: 11,
    flex: 1,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
  },
  downloadBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
