import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, X, Trash2, ExternalLink, Search } from 'lucide-react-native';

interface HistoryProps {
  visible: boolean;
  onClose: () => void;
  history: { title: string; url: string; time: string }[];
  onSelect: (url: string) => void;
  onClear: () => void;
  onDeleteItem: (index: number) => void;
  isPrivate?: boolean;
  isDarkMode?: boolean;
}

export const HistoryView = ({
  visible,
  onClose,
  history,
  onSelect,
  onClear,
  onDeleteItem,
  isPrivate = false,
  isDarkMode = false,
}: HistoryProps) => {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const dark = isDarkMode || isPrivate;
  const theme = {
    bg: dark ? '#1A1A1A' : '#FFFFFF',
    text: dark ? '#FFFFFF' : '#000000',
    item: dark ? '#222222' : '#F5F5F7',
    subtext: dark ? '#888888' : '#999999',
    border: dark ? '#333333' : '#F0F0F0',
    inputBg: dark ? '#262626' : '#F0F0F2',
  };

  const filteredHistory = history.filter(item => {
    if (!query) return true;
    const lower = query.toLowerCase();
    return (
      (item.title && item.title.toLowerCase().includes(lower)) ||
      (item.url && item.url.toLowerCase().includes(lower))
    );
  });

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.bg,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>History</Text>
            <View style={styles.headerActions}>
              {history.length > 0 && (
                <TouchableOpacity onPress={onClear} style={styles.clearBtn}>
                  <Text style={styles.clearText}>Clear All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          {history.length > 0 && (
            <View style={[styles.searchBox, { backgroundColor: theme.inputBg }]}>
              <Search size={16} color={theme.subtext} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search history"
                placeholderTextColor={theme.subtext}
                value={query}
                onChangeText={setQuery}
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <X size={16} color={theme.subtext} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* List */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {filteredHistory.length === 0 ? (
              <View style={styles.emptyState}>
                <Clock size={48} color={theme.subtext} />
                <Text style={[styles.emptyText, { color: theme.subtext }]}>
                  {query ? 'No matching pages found' : 'No history yet'}
                </Text>
              </View>
            ) : (
              filteredHistory.map((item, index) => (
                <View key={index} style={[styles.historyItem, { borderBottomColor: theme.border }]}>
                  <TouchableOpacity
                    style={styles.itemContent}
                    onPress={() => {
                      onSelect(item.url);
                      onClose();
                    }}
                  >
                    <View style={[styles.iconContainer, { backgroundColor: theme.item }]}>
                      <ExternalLink size={16} color={theme.text} />
                    </View>
                    <View style={styles.itemText}>
                      <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.itemUrl, { color: theme.subtext }]} numberOfLines={1}>
                        {item.url}
                      </Text>
                    </View>
                    <Text style={[styles.itemTime, { color: theme.subtext }]}>{item.time}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => onDeleteItem(index)}
                    style={styles.deleteSingleBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={16} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '80%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearBtn: {
    padding: 5,
  },
  clearText: {
    color: '#FF3B30',
    fontWeight: '700',
    fontSize: 14,
  },
  closeBtn: {
    padding: 5,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  list: {
    paddingBottom: 40,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    justifyContent: 'space-between',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemUrl: {
    fontSize: 12,
    marginTop: 2,
  },
  itemTime: {
    fontSize: 11,
    marginLeft: 10,
  },
  deleteSingleBtn: {
    padding: 6,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 80,
    gap: 10,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
  },
});