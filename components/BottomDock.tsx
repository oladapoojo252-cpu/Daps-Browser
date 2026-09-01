import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight, Home, Layers, Shield } from 'lucide-react-native';

export const BottomDock = ({
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onHome,
  onTabs,
  isPrivate,
  onTogglePrivate,
}: any) => {
  return (
    <View style={styles.container}>
      <View style={[styles.dock, isPrivate && styles.dockPrivate]}>
        <TouchableOpacity onPress={onBack} disabled={!canGoBack} style={styles.iconButton}>
          <ChevronLeft
            color={isPrivate ? (canGoBack ? '#FFFFFF' : '#444444') : canGoBack ? '#000000' : '#CCCCCC'}
            size={26}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={onForward} disabled={!canGoForward} style={styles.iconButton}>
          <ChevronRight
            color={isPrivate ? (canGoForward ? '#FFFFFF' : '#444444') : canGoForward ? '#000000' : '#CCCCCC'}
            size={26}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={onHome} style={[styles.mainBtn, isPrivate && styles.mainBtnPrivate]}>
          <Home color={isPrivate ? '#000000' : '#FFFFFF'} size={20} fill={isPrivate ? '#000000' : '#FFFFFF'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onTabs} style={styles.iconButton}>
          <Layers color={isPrivate ? '#FFFFFF' : '#000000'} size={22} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onTogglePrivate} style={styles.iconButton}>
          <Shield
            size={22}
            color={isPrivate ? '#FFFFFF' : '#000000'}
            fill={isPrivate ? '#FFFFFF' : 'none'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  dock: {
    flexDirection: 'row',
    width: '85%',
    height: 64,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  dockPrivate: {
    backgroundColor: '#1A1A1A',
    borderColor: '#333333',
  },
  iconButton: { padding: 10 },
  mainBtn: {
    backgroundColor: '#000000',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainBtnPrivate: {
    backgroundColor: '#FFFFFF',
  },
});