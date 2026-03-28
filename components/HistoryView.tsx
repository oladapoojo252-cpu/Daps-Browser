import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Clock, X, Trash2, ExternalLink } from 'lucide-react-native';

interface HistoryProps {
  visible: boolean;
  onClose: () => void;
  history: { title: string, url: string, time: string }[];
  onSelect: (url: string) => void;
  onClear: () => void;
}

export const HistoryView = ({ visible, onClose, history, onSelect, onClear }: HistoryProps) => {
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>History</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={onClear} style={styles.clearBtn}>
                <Trash2 size={18} color="#FF3B30" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={24} color="#000" />
              </TouchableOpacity>
            </View>
          </View>

          {/* List */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {history.length === 0 ? (
              <View style={styles.emptyState}>
                <Clock size={48} color="#EEE" />
                <Text style={styles.emptyText}>No history yet</Text>
              </View>
            ) : (
              history.map((item, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.historyItem}
                  onPress={() => { onSelect(item.url); onClose(); }}
                >
                  <View style={styles.iconContainer}>
                    <ExternalLink size={16} color="#666" />
                  </View>
                  <View style={styles.itemText}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.itemUrl} numberOfLines={1}>{item.url}</Text>
                  </View>
                  <Text style={styles.itemTime}>{item.time}</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { 
    backgroundColor: '#fff', 
    height: '80%', 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30,
    padding: 20 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 20 
  },
  title: { fontSize: 24, fontWeight: '800' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  clearBtn: { marginRight: 15, padding: 5 },
  closeBtn: { padding: 5 },
  list: { paddingBottom: 40 },
  historyItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  iconContainer: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  itemText: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#000' },
  itemUrl: { fontSize: 12, color: '#999', marginTop: 2 },
  itemTime: { fontSize: 12, color: '#CCC', marginLeft: 10 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#999', marginTop: 10, fontSize: 16 }
});