import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Switch, ScrollView, Platform } from 'react-native';
import { Monitor, Shield, Trash2, X, ChevronRight, FileText } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';

export const SettingsView = ({
  visible,
  onClose,
  isDesktop,
  onToggleDesktop,
  onClearData,
  isPrivate,
  isAdBlockActive,
  onToggleAdBlock,
  downloads,
}: any) => {
  const theme = {
    bg: isPrivate ? '#1A1A1A' : '#FFFFFF',
    text: isPrivate ? '#FFFFFF' : '#000000',
    item: isPrivate ? '#222222' : '#F9F9F9',
    border: isPrivate ? '#333333' : '#EEEEEE',
    subtext: isPrivate ? '#888888' : '#777777',
  };

  const handleShare = async (url: string) => {
    if (!url) return;
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(url);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: theme.bg }]} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Control Center</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <View style={[styles.row, { backgroundColor: theme.item }]}>
                <View style={styles.rowLeft}>
                  <Monitor size={20} color={theme.text} />
                  <Text style={[styles.rowText, { color: theme.text }]}>Desktop Mode</Text>
                </View>
                <Switch
                  value={isDesktop}
                  onValueChange={onToggleDesktop}
                  trackColor={{ false: '#767577', true: '#000000' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.row, { backgroundColor: theme.item }]}>
                <View style={styles.rowLeft}>
                  <Shield size={20} color={theme.text} />
                  <Text style={[styles.rowText, { color: theme.text }]}>Shields & Ad-Blocker</Text>
                </View>
                <Switch
                  value={isAdBlockActive}
                  onValueChange={onToggleAdBlock}
                  trackColor={{ false: '#767577', true: '#000000' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <TouchableOpacity style={[styles.row, { backgroundColor: theme.item }]} onPress={onClearData}>
                <View style={styles.rowLeft}>
                  <Trash2 size={20} color="#FF3B30" />
                  <Text style={[styles.rowText, { color: '#FF3B30' }]}>Clear Browser Data</Text>
                </View>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionLabel, { color: theme.text }]}>Recent Downloads</Text>
            <View style={styles.downloadSection}>
              {downloads.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.subtext }]}>No downloads yet</Text>
              ) : (
                downloads.map((item: any, index: number) => (
                  <TouchableOpacity
                    key={item.id || index}
                    style={[styles.downloadRow, { backgroundColor: theme.item }]}
                    onPress={() => handleShare(item.url)}
                  >
                    <FileText size={20} color={theme.text} style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.fileTime, { color: theme.subtext }]}>{item.date || item.time}</Text>
                    </View>
                    <ChevronRight size={16} color="#999999" />
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Relocated Footer Branding */}
            <View style={styles.footer}>
              <Text style={[styles.versionText, { color: theme.text }]}>DAPS BROWSER v1.0.0</Text>
              <Text style={[styles.versionText, { color: theme.subtext, marginTop: 4 }]}>
                A PRODUCT OF DAPS TECHNOLOGIES
              </Text>
            </View>
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'android' ? 40 : 24,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  section: { gap: 10 },
  sectionLabel: { fontSize: 16, fontWeight: '800', marginTop: 30, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: 20 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { fontSize: 15, fontWeight: '700' },
  downloadSection: { gap: 8 },
  downloadRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16 },
  fileName: { fontSize: 14, fontWeight: '600' },
  fileTime: { fontSize: 11, marginTop: 2 },
  emptyText: { textAlign: 'center', marginTop: 10, fontSize: 13, fontStyle: 'italic' },
  footer: { marginTop: 40, paddingBottom: 30, alignItems: 'center', opacity: 0.6 },
  versionText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
});